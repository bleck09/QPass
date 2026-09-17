/* ============================================================================
 * src/modules/casos-duplicado/casos-duplicado.service.ts
 *
 * Manillas duplicadas (alguien entró con una copia del QR antes que el dueño).
 * Ver CasoDuplicado / AlertaManilla / EstadoManilla en schema.prisma.
 *
 *  - asegurarManillaUsable(): lo llaman TODOS los escaneos (buscar, ingreso,
 *    salida, recarga, venta, devolución). Si la manilla es la copia (en_alerta)
 *    deja una AlertaManilla y corta con ManillaFalsaException: el operador ve la
 *    foto del falso y no puede hacer nada con ella.
 *  - verificarDueno(): el Supervisor confirma al dueño real, la manilla vieja
 *    pasa a en_alerta y el dueño entra con una nueva (misma Entrada => mismo saldo).
 *  - recuperar(): seguridad le quitó la copia al falso; se registra la sanción.
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContextoAlertaManilla, EstadoCaso, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { ManillaFalsaException } from '../../common/excepciones/dominio.excepciones';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CodigosQrService } from '../codigos-qr/codigos-qr.service';
import { RecuperarManillaDto, VerificarDuplicadoDto } from './dto/casos-duplicado.dto';

// Si el front no dice desde qué pantalla escanea, se deduce del rol.
const CONTEXTO_POR_ROL: Record<string, ContextoAlertaManilla> = {
  Supervisor: 'control_acceso',
  Recargador: 'recarga',
  Ayudante: 'venta',
  Devolucion: 'devolucion',
};

// Sin `desde`, el primer polling trae las alertas de los últimos minutos.
const VENTANA_ALERTAS_MIN = 10;
const MAX_ALERTAS = 50;

const MOTIVO_COPIA = 'Duplicado: la copia quedó en manos de otra persona';

const INCLUDE_CASO = {
  evento: { select: { id: true, nombre: true } },
  entrada: {
    select: {
      id: true,
      nombre: true,
      numero: true,
      foto: true,
      usuario: { select: { foto: true } },
    },
  },
  codigoCopia: { select: { id: true, codigo: true, numero: true, estado: true } },
  codigoNuevo: { select: { id: true, codigo: true, numero: true } },
  registroVerificacion: { select: { foto: true, createdAt: true } },
  abiertoPor: { select: { id: true, nombre: true } },
  recuperadoPor: { select: { id: true, nombre: true } },
  alertas: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: {
      operador: { select: { nombre: true, rol: true } },
      puesto: { select: { base: { select: { nombre: true } } } },
    },
  },
  _count: { select: { alertas: true } },
} satisfies Prisma.CasoDuplicadoInclude;

const INCLUDE_ALERTA = {
  operador: { select: { nombre: true, rol: true } },
  puesto: { select: { base: { select: { nombre: true } } } },
  codigoQr: { select: { codigo: true, numero: true } },
  caso: {
    select: {
      id: true,
      fotoSospechoso: true,
      estado: true,
      evento: { select: { id: true, nombre: true } },
      entrada: { select: { nombre: true } },
    },
  },
} satisfies Prisma.AlertaManillaInclude;

type AlertaConRelaciones = Prisma.AlertaManillaGetPayload<{
  include: typeof INCLUDE_ALERTA;
}>;

@Injectable()
export class CasosDuplicadoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
    private readonly auditoria: AuditoriaService,
    private readonly codigosQr: CodigosQrService,
  ) {}

  /**
   * Punto único de control de cada escaneo. `codigo` undefined => no hace nada
   * (operaciones de front viejo que no mandan la manilla). Si el código no existe
   * tampoco: el que llama ya responde su propio 404.
   */
  async asegurarManillaUsable(
    codigo: string | undefined,
    escaneo: {
      actor: UsuarioJwt;
      contexto?: ContextoAlertaManilla;
      puestoId?: string;
    },
  ): Promise<void> {
    if (!codigo) return;
    const qr = await this.prisma.codigoQr.findUnique({
      where: { codigo },
      select: { id: true, estado: true, eventoId: true },
    });
    if (!qr) return;
    if (qr.estado === 'recuperada') {
      throw new ConflictException(
        'Esta manilla fue retirada por seguridad (era una copia): ya no es válida.',
      );
    }
    if (qr.estado !== 'en_alerta') return;

    const caso = await this.prisma.casoDuplicado.findFirst({
      where: { codigoCopiaId: qr.id },
      orderBy: { createdAt: 'desc' },
      include: {
        evento: { select: { nombre: true } },
        entrada: { select: { nombre: true } },
      },
    });
    if (!caso) {
      throw new ConflictException('Esta manilla está bloqueada por seguridad.');
    }

    // Solo se guarda el puesto si es de este evento (viene del front).
    const puesto = escaneo.puestoId
      ? await this.prisma.puesto.findFirst({
          where: { id: escaneo.puestoId, eventoId: qr.eventoId },
          select: { id: true },
        })
      : null;
    const contexto =
      escaneo.contexto ?? CONTEXTO_POR_ROL[escaneo.actor.rol] ?? 'control_acceso';

    const alerta = await this.prisma.alertaManilla.create({
      data: {
        casoId: caso.id,
        codigoQrId: qr.id,
        contexto,
        operadorId: escaneo.actor.id,
        puestoId: puesto?.id,
      },
    });
    await this.auditoria.registrar(null, {
      actorId: escaneo.actor.id,
      entidad: 'codigo_qr',
      entidadId: qr.id,
      accion: 'escaneo_en_alerta',
      despues: { casoId: caso.id, alertaId: alerta.id, contexto, puestoId: puesto?.id },
    });

    throw new ManillaFalsaException({
      casoId: caso.id,
      fotoSospechoso: caso.fotoSospechoso,
      eventoNombre: caso.evento.nombre,
      titularNombre: caso.entrada.nombre,
      estadoCaso: caso.estado,
      detectadoEn: caso.createdAt,
      codigo,
    });
  }

  /**
   * El dueño real llegó y su manilla ya figuraba adentro. Todo en una sola
   * transacción: manilla vieja -> anulada + en_alerta, manilla nueva vinculada,
   * registro de verificación (cuenta como ingreso), caso abierto y la foto del
   * dueño pasa a ser la de referencia (la anterior era la del falso).
   */
  async verificarDueno(
    entradaId: string,
    dto: VerificarDuplicadoDto,
    actorId: number,
  ) {
    await this.eventoPolicy.porEntrada(entradaId);
    const entrada = await this.prisma.entrada.findUnique({
      where: { id: entradaId },
      include: {
        compra: { select: { estado: true } },
        evento: { select: { nombre: true, estado: true, tipoManilla: true } },
        usuario: { select: { ci: true } },
        codigosQr: { where: { anulado: false }, take: 1 },
      },
    });
    if (!entrada) throw new NotFoundException('Entrada no encontrada');
    if (entrada.compra?.estado !== 'confirmado') {
      throw new ConflictException('Esta compra todavía no está aprobada');
    }
    if (dto.eventoId && dto.eventoId !== entrada.eventoId) {
      throw new ConflictException(
        `Esta entrada pertenece a "${entrada.evento.nombre}": no se puede verificar desde el control de otro evento.`,
      );
    }
    if (entrada.evento.estado === 'finalizado') {
      throw new ConflictException(`El evento "${entrada.evento.nombre}" ya finalizó.`);
    }
    if (entrada.estadoIngreso === 'pendiente') {
      throw new ConflictException(
        'Esta entrada todavía no registró ningún ingreso: no hay duplicado. Registrá el ingreso normal.',
      );
    }
    if (!dto.mostroCarnet || !dto.cuentaVerificada) {
      throw new BadRequestException(
        'Para verificar al dueño tiene que mostrar su carnet y su cuenta QPass abierta en el celular.',
      );
    }
    const ci = entrada.usuario?.ci?.replace(/\D/g, '');
    if (!ci) {
      throw new ConflictException(
        'La cuenta de esta entrada no tiene CI registrado: no se puede verificar al dueño.',
      );
    }
    if (!ci.endsWith(dto.ultimosDigitosCi)) {
      throw new BadRequestException(
        'Los dígitos del carnet no coinciden con el CI de la cuenta.',
      );
    }
    const copia = entrada.codigosQr[0];
    if (!copia) {
      throw new ConflictException('Esta entrada no tiene una manilla vinculada.');
    }

    const esFisica = entrada.evento.tipoManilla === 'fisica';
    if (esFisica) {
      if (!dto.codigoQrNuevoId) {
        throw new BadRequestException('Escaneá la manilla nueva que se le va a entregar.');
      }
      const nueva = await this.prisma.codigoQr.findUnique({
        where: { id: dto.codigoQrNuevoId },
      });
      if (!nueva || nueva.eventoId !== entrada.eventoId) {
        throw new NotFoundException('Esa manilla no es de este evento');
      }
      if (nueva.entradaId || nueva.anulado || nueva.estado !== 'activa') {
        throw new ConflictException('Esa manilla ya está usada: escaneá otra del pool.');
      }
      if (nueva.diaEventoId && nueva.diaEventoId !== entrada.diaEventoId) {
        throw new ConflictException('Esa manilla es de otra jornada del evento');
      }
    }

    const ahora = new Date();
    return this.prisma.$transaction(async (tx) => {
      // Guardado contra doble verificación simultánea.
      const { count } = await tx.codigoQr.updateMany({
        where: { id: copia.id, anulado: false },
        data: {
          anulado: true,
          estado: 'en_alerta',
          motivoAnulacion: MOTIVO_COPIA,
          anuladoPorId: actorId,
          anuladoEn: ahora,
        },
      });
      if (count === 0) {
        throw new ConflictException('Esta manilla ya fue reemplazada. Volvé a escanear.');
      }

      const nueva = esFisica
        ? await tx.codigoQr.update({
            where: { id: dto.codigoQrNuevoId },
            data: {
              entradaId,
              asignadoPorId: actorId,
              asignadoEn: ahora,
              diaEventoId: entrada.diaEventoId,
            },
          })
        : await this.codigosQr.crearYVincularAutomatico(tx, {
            eventoId: entrada.eventoId,
            entradaId,
            diaEventoId: entrada.diaEventoId,
            actorId,
          });

      const registro = await tx.registroIngreso.create({
        data: {
          entradaId,
          tipo: 'verificacion_duplicado',
          foto: dto.foto,
          registradoPorId: actorId,
          ultimosDigitosCi: dto.ultimosDigitosCi,
          mostroCarnet: dto.mostroCarnet,
          cuentaVerificada: dto.cuentaVerificada,
        },
      });

      const caso = await tx.casoDuplicado.create({
        data: {
          eventoId: entrada.eventoId,
          entradaId,
          codigoCopiaId: copia.id,
          codigoNuevoId: nueva.id,
          registroVerificacionId: registro.id,
          // La foto de referencia hasta ahora es la que se le sacó al falso en la puerta.
          fotoSospechoso: entrada.foto,
          abiertoPorId: actorId,
        },
      });

      await tx.entrada.update({
        where: { id: entradaId },
        data: { foto: dto.foto, estadoIngreso: 'ingresado' },
      });

      await this.auditoria.registrar(tx, {
        actorId,
        entidad: 'codigo_qr',
        entidadId: copia.id,
        accion: 'marcar_en_alerta',
        antes: { estado: copia.estado, anulado: false },
        despues: { estado: 'en_alerta', anulado: true, casoId: caso.id },
      });
      await this.auditoria.registrar(tx, {
        actorId,
        entidad: 'codigo_qr',
        entidadId: nueva.id,
        accion: 'vincular_por_duplicado',
        despues: { entradaId, casoId: caso.id },
      });
      await this.auditoria.registrar(tx, {
        actorId,
        entidad: 'caso_duplicado',
        entidadId: caso.id,
        accion: 'abrir',
        despues: caso,
      });

      return caso;
    });
  }

  /** Seguridad le quitó la copia al falso: se cierra el caso y se anota la sanción. */
  async recuperar(id: string, dto: RecuperarManillaDto, actor: UsuarioJwt) {
    const caso = await this.prisma.casoDuplicado.findUnique({
      where: { id },
      include: { codigoCopia: { select: { estado: true } } },
    });
    if (!caso) throw new NotFoundException('Caso no encontrado');
    await this.eventoPolicy.asegurarAcceso(actor, caso.eventoId);
    await this.eventoPolicy.porEvento(caso.eventoId);
    if (caso.estado === 'resuelto') {
      throw new ConflictException('Esta manilla ya fue marcada como recuperada.');
    }

    const ahora = new Date();
    const sancion = dto.sancion?.trim() || null;
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.casoDuplicado.update({
        where: { id },
        data: {
          estado: 'resuelto',
          recuperadoEn: ahora,
          recuperadoPorId: actor.id,
          sancion,
        },
        include: INCLUDE_CASO,
      });
      await tx.codigoQr.update({
        where: { id: caso.codigoCopiaId },
        data: { estado: 'recuperada' },
      });
      await this.auditoria.registrar(tx, {
        actorId: actor.id,
        entidad: 'codigo_qr',
        entidadId: caso.codigoCopiaId,
        accion: 'recuperar',
        antes: { estado: caso.codigoCopia.estado },
        despues: { estado: 'recuperada', casoId: id },
      });
      await this.auditoria.registrar(tx, {
        actorId: actor.id,
        entidad: 'caso_duplicado',
        entidadId: id,
        accion: 'resolver',
        antes: { estado: caso.estado },
        despues: { estado: 'resuelto', recuperadoEn: ahora, sancion },
      });
      return this.aVista(actualizado);
    });
  }

  /** "Personas por encontrar" (pendientes) + historial (resueltos). */
  async listar(actor: UsuarioJwt, filtros: { eventoId?: string; estado?: EstadoCaso }) {
    const eventoId = await this.filtroEventos(actor, filtros.eventoId);
    const casos = await this.prisma.casoDuplicado.findMany({
      where: { eventoId, estado: filtros.estado },
      include: INCLUDE_CASO,
      orderBy: { createdAt: 'desc' },
    });
    return casos.map((c) => this.aVista(c));
  }

  /**
   * Polling cada ~10 s de Supervisor/Admin/Cliente: escaneos de copias hechos
   * después de `desde`. Sin `desde`, los últimos VENTANA_ALERTAS_MIN minutos.
   */
  async alertas(actor: UsuarioJwt, filtros: { desde?: string; eventoId?: string }) {
    const eventoId = await this.filtroEventos(actor, filtros.eventoId);
    const fecha = filtros.desde ? new Date(filtros.desde) : null;
    const desde =
      fecha && !isNaN(fecha.getTime())
        ? fecha
        : new Date(Date.now() - VENTANA_ALERTAS_MIN * 60 * 1000);
    const alertas = await this.prisma.alertaManilla.findMany({
      where: { createdAt: { gt: desde }, caso: { eventoId } },
      include: INCLUDE_ALERTA,
      orderBy: { createdAt: 'desc' },
      take: MAX_ALERTAS,
    });
    return alertas.map((a) => this.alertaAVista(a));
  }

  private aVista(
    caso: Prisma.CasoDuplicadoGetPayload<{ include: typeof INCLUDE_CASO }>,
  ) {
    const { alertas, _count, ...resto } = caso;
    const ultima = alertas[0];
    return {
      ...resto,
      totalAlertas: _count.alertas,
      ultimaAlerta: ultima
        ? {
            createdAt: ultima.createdAt,
            contexto: ultima.contexto,
            operadorNombre: ultima.operador.nombre,
            operadorRol: ultima.operador.rol,
            puestoNombre: ultima.puesto?.base.nombre ?? null,
          }
        : null,
    };
  }

  private alertaAVista(a: AlertaConRelaciones) {
    return {
      id: a.id,
      createdAt: a.createdAt,
      contexto: a.contexto,
      operadorNombre: a.operador.nombre,
      operadorRol: a.operador.rol,
      puestoNombre: a.puesto?.base.nombre ?? null,
      codigo: a.codigoQr.codigo,
      numeroManilla: a.codigoQr.numero,
      casoId: a.caso.id,
      casoEstado: a.caso.estado,
      fotoSospechoso: a.caso.fotoSospechoso,
      titularNombre: a.caso.entrada.nombre,
      evento: a.caso.evento,
    };
  }

  /**
   * Eventos que ve el actor: Admin todos; Supervisor los que tiene asignados;
   * Cliente los que organiza. Devuelve el filtro Prisma para `eventoId`.
   */
  private async filtroEventos(
    actor: UsuarioJwt,
    eventoId?: string,
  ): Promise<string | Prisma.StringFilter | undefined> {
    const visibles = await this.eventoPolicy.eventosVisibles(actor);
    if (!visibles) return eventoId || undefined; // Admin: todos
    if (eventoId) {
      if (!visibles.includes(eventoId)) {
        throw new ForbiddenException('No tenés acceso a este evento');
      }
      return eventoId;
    }
    return { in: visibles };
  }

}
