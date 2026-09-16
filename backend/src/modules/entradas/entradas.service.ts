/* ============================================================================
 * src/modules/entradas/entradas.service.ts
 *
 * Cada boleto/persona dentro de una Compra + su historial de control de acceso
 * (RegistroIngreso) y la pulsera/QR físico vinculado. El saldo NO vive acá:
 * vive en BilleteraEvento (por usuarioId + eventoId). Las pantallas de escaneo
 * lo necesitan, así que se adjunta a `usuario.saldo` en un segundo paso
 * (adjuntarSaldoEvento) — Prisma no puede filtrar la billetera por el evento de
 * la entrada dentro de un include estático.
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoRegistroIngreso } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';

const CODIGO_ACTIVO = {
  codigosQr: { where: { anulado: false }, take: 1 },
} satisfies Prisma.EntradaInclude;

// El titular de la entrada. El saldo se adjunta después (adjuntarSaldoEvento),
// porque vive en BilleteraEvento keyed por (usuarioId, eventoId de la entrada).
// `ci` viaja porque Recargador, Devolución, Ayudante y Supervisor tienen que
// verificar contra el carnet antes de mover plata o entregar una manilla.
// Es EL documento de identidad del sistema: obligatorio al completar el perfil.
const CON_SALDO = {
  usuario: { select: { id: true, foto: true, ci: true, nombre: true } },
} satisfies Prisma.EntradaInclude;

// Jornada (noche) a la que pertenece la entrada. Se muestra en el control de
// acceso y en "Mis Entradas". `nombre` puede ser null -> la UI arma "Día {orden}".
const CON_JORNADA = {
  diaEvento: {
    select: { id: true, nombre: true, orden: true, inicio: true, fin: true },
  },
} satisfies Prisma.EntradaInclude;

// Una compra pendiente o rechazada no es un asistente real todavía.
const SOLO_CONFIRMADAS = {
  compra: { estado: 'confirmado' },
} satisfies Prisma.EntradaWhereInput;

// Ventana de control de acceso en puerta (ver README → "Reglas de negocio"):
// se puede registrar INGRESO desde estas horas antes de evento.fecha y hasta
// evento.fechaFin. La SALIDA no tiene ventana: siempre se puede sacar a quien
// esté adentro, incluso con el evento ya finalizado.
const MARGEN_INGRESO_ANTICIPADO_HORAS = 3;

// Fecha + hora en horario de Bolivia, para los mensajes de control de acceso
// ("cerró el 10 sept, 02:00"). El server corre en UTC, así que se fija la zona.
const fmtFechaHora = (fecha: Date): string =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);

@Injectable()
export class EntradasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  /**
   * Rellena `entrada.usuario.saldo` con el saldo de la BilleteraEvento de
   * (usuario, evento de la entrada). Muta las entradas en sitio (misma forma que
   * antes traía CON_SALDO) para no tocar el frontend de escaneo.
   */
  private async adjuntarSaldoEvento(
    entradas: Array<{
      eventoId: string;
      usuario?:
        | { id: number; saldo?: unknown; saldoBloqueado?: unknown }
        | null;
    }>,
  ): Promise<void> {
    const pares = new Map<string, { usuarioId: number; eventoId: string }>();
    for (const e of entradas) {
      if (e.usuario?.id) {
        pares.set(`${e.usuario.id}|${e.eventoId}`, {
          usuarioId: e.usuario.id,
          eventoId: e.eventoId,
        });
      }
    }
    if (pares.size === 0) return;
    const filas = await this.prisma.billeteraEvento.findMany({
      where: { OR: [...pares.values()] },
      select: {
        usuarioId: true,
        eventoId: true,
        saldo: true,
        saldoBloqueado: true,
      },
    });
    const de = new Map(
      filas.map((f) => [
        `${f.usuarioId}|${f.eventoId}`,
        { saldo: Number(f.saldo), bloqueado: Number(f.saldoBloqueado) },
      ]),
    );
    for (const e of entradas) {
      if (e.usuario?.id) {
        const v = de.get(`${e.usuario.id}|${e.eventoId}`);
        // `saldo` = disponible para gastar (lo retenido por incidencia no cuenta);
        // `saldoBloqueado` va aparte para poder mostrarlo.
        e.usuario.saldoBloqueado = v?.bloqueado ?? 0;
        e.usuario.saldo = Math.max(0, (v?.saldo ?? 0) - (v?.bloqueado ?? 0));
      }
    }
  }

  async listar(eventoId?: string, estadoIngreso?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    const entradas = await this.prisma.entrada.findMany({
      where: {
        eventoId,
        estadoIngreso: (estadoIngreso as Prisma.EnumEstadoIngresoFilter) || undefined,
        ...SOLO_CONFIRMADAS,
      },
      include: {
        categoriaTicket: true,
        ...CON_JORNADA,
        ...CODIGO_ACTIVO,
        ...CON_SALDO,
        registrosIngreso: { select: { tipo: true } },
      },
      orderBy: [{ diaEvento: { orden: 'asc' } }, { numero: 'asc' }, { nombre: 'asc' }],
    });
    await this.adjuntarSaldoEvento(entradas);
    return entradas.map(({ codigosQr, registrosIngreso, ...e }) => ({
      ...e,
      codigoQrVinculado: codigosQr[0] || null,
      vecesIngreso: registrosIngreso.filter((r) => r.tipo === 'ingreso').length,
      vecesSalida: registrosIngreso.filter((r) => r.tipo === 'salida').length,
    }));
  }

  /**
   * Entradas a nombre del usuario logueado (titular O invitado): se buscan por
   * Entrada.usuarioId, no por comprador. Esto es lo que ve un invitado al que
   * otra persona le compró la entrada — su cuenta nunca fue "comprador".
   * Solo entradas de compras ya confirmadas.
   */
  async mias(usuarioId: number) {
    const entradas = await this.prisma.entrada.findMany({
      where: { usuarioId, compra: { estado: 'confirmado' } },
      include: {
        evento: true,
        categoriaTicket: true,
        compra: { select: { id: true, compradorId: true } },
        ...CON_JORNADA,
        ...CODIGO_ACTIVO,
      },
      orderBy: { createdAt: 'desc' },
    });
    return entradas.map(({ codigosQr, ...e }) => ({
      ...e,
      codigoQrVinculado: codigosQr[0] || null,
    }));
  }

  /** Resuelve la Entrada dueña de una pulsera/QR físico escaneado. */
  async buscarPorCodigoQr(codigo: string) {
    const codigoQr = await this.prisma.codigoQr.findUnique({
      where: { codigo },
      include: {
        entrada: {
          include: {
            categoriaTicket: true,
            compra: { select: { estado: true } },
            evento: { select: { id: true, nombre: true } },
            ...CON_JORNADA,
            ...CON_SALDO,
          },
        },
      },
    });
    if (
      !codigoQr ||
      codigoQr.anulado ||
      !codigoQr.entrada ||
      codigoQr.entrada.compra?.estado !== 'confirmado'
    ) {
      throw new NotFoundException(
        'Código no vinculado a ninguna entrada activa',
      );
    }
    await this.adjuntarSaldoEvento([codigoQr.entrada]);
    const { compra, ...entrada } = codigoQr.entrada;
    return {
      ...entrada,
      codigoQrVinculado: { id: codigoQr.id, codigo: codigoQr.codigo },
    };
  }

  /**
   * Versión mínima de `buscarPorCodigoQr`, para el escáner de "Mi Perfil"
   * (cualquier usuario logueado, de cualquier evento): a diferencia del
   * escaneo de staff, acá NO se expone saldo ni ningún otro dato sensible —
   * solo el nombre de la persona, el evento y el tipo de entrada.
   */
  async buscarBasicoPorCodigoQr(codigo: string) {
    const codigoQr = await this.prisma.codigoQr.findUnique({
      where: { codigo },
      include: {
        entrada: {
          select: {
            nombre: true,
            compra: { select: { estado: true } },
            evento: { select: { nombre: true, fecha: true, lugar: true } },
            diaEvento: { select: { nombre: true, orden: true, inicio: true } },
            categoriaTicket: { select: { nombre: true } },
          },
        },
      },
    });
    if (
      !codigoQr ||
      codigoQr.anulado ||
      !codigoQr.entrada ||
      codigoQr.entrada.compra?.estado !== 'confirmado'
    ) {
      throw new NotFoundException(
        'Código no vinculado a ninguna entrada activa',
      );
    }
    const { entrada } = codigoQr;
    return {
      nombre: entrada.nombre,
      eventoNombre: entrada.evento.nombre,
      eventoFecha: entrada.evento.fecha,
      eventoLugar: entrada.evento.lugar,
      diaEvento: entrada.diaEvento,
      categoriaNombre: entrada.categoriaTicket?.nombre ?? null,
    };
  }

  async obtenerPorId(id: string) {
    const entrada = await this.prisma.entrada.findUnique({
      where: { id },
      include: { categoriaTicket: true, ...CODIGO_ACTIVO, ...CON_SALDO },
    });
    if (!entrada) throw new NotFoundException('Entrada no encontrada');
    await this.adjuntarSaldoEvento([entrada]);
    const { codigosQr, ...resto } = entrada;
    return { ...resto, codigoQrVinculado: codigosQr[0] || null };
  }

  async registros(id: string) {
    return this.prisma.registroIngreso.findMany({
      where: { entradaId: id },
      include: { registradoPor: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Vincula una pulsera/QR del pool a esta entrada. Si ya tenía otro código
   * activo, se anula primero — nunca dos códigos activos por persona (además
   * está el índice único parcial de C4).
   */
  async vincularQr(
    id: string,
    codigoQrId: string,
    actorId: number,
    motivo?: string,
  ) {
    await this.eventoPolicy.porEntrada(id);
    const entradaActual = await this.prisma.entrada.findUnique({
      where: { id },
      include: { compra: true },
    });
    if (!entradaActual) throw new NotFoundException('Entrada no encontrada');
    if (entradaActual.compra?.estado !== 'confirmado') {
      throw new ConflictException('Esta compra todavía no está aprobada');
    }

    const codigoQr = await this.prisma.codigoQr.findUnique({
      where: { id: codigoQrId },
    });
    if (!codigoQr) throw new NotFoundException('Código no encontrado');
    if (codigoQr.entradaId) {
      throw new ConflictException('Ese código ya está vinculado a otra entrada');
    }
    // La manilla y la entrada tienen que ser de la misma jornada.
    if (
      entradaActual.diaEventoId &&
      codigoQr.diaEventoId &&
      entradaActual.diaEventoId !== codigoQr.diaEventoId
    ) {
      throw new ConflictException(
        'Esa manilla es de otra jornada del evento',
      );
    }

    const anteriorActivo = await this.prisma.codigoQr.findFirst({
      where: { entradaId: id, anulado: false },
    });

    await this.prisma.$transaction([
      ...(anteriorActivo
        ? [
            this.prisma.codigoQr.update({
              where: { id: anteriorActivo.id },
              data: {
                anulado: true,
                // El motivo real lo da el Supervisor al hacer el cambio; si no
                // manda ninguno queda el generico de siempre.
                motivoAnulacion:
                  motivo?.trim() || 'Reemplazada al vincular una nueva',
                anuladoPorId: actorId,
                anuladoEn: new Date(),
              },
            }),
          ]
        : []),
      this.prisma.codigoQr.update({
        where: { id: codigoQrId },
        data: {
          entradaId: id,
          asignadoPorId: actorId,
          asignadoEn: new Date(),
          // La manilla adopta la jornada de la entrada a la que se vincula
          // (el pool se genera a nivel evento, sin jornada).
          diaEventoId: codigoQr.diaEventoId ?? entradaActual.diaEventoId,
        },
      }),
    ]);

    return this.obtenerPorId(id);
  }

  /** Manilla perdida/dañada: anula el código activo (el saldo no se mueve). */
  async anularQr(id: string, motivo: string | undefined, actorId: number) {
    await this.eventoPolicy.porEntrada(id);
    const activo = await this.prisma.codigoQr.findFirst({
      where: { entradaId: id, anulado: false },
    });
    if (!activo) {
      throw new NotFoundException('Esta entrada no tiene un código vinculado');
    }
    await this.prisma.codigoQr.update({
      where: { id: activo.id },
      data: {
        anulado: true,
        motivoAnulacion: motivo || null,
        anuladoPorId: actorId,
        anuladoEn: new Date(),
      },
    });
  }

  /**
   * Control de acceso (Supervisor). La foto es UNA sola por Entrada, en
   * Entrada.foto; obligatoria solo si esa entrada todavía no tiene una.
   */
  async registrarMovimiento(
    id: string,
    tipo: TipoRegistroIngreso,
    foto: string | undefined,
    actorId: number,
    eventoIdEsperado?: string,
  ) {
    await this.eventoPolicy.porEntrada(id);
    const entradaActual = await this.prisma.entrada.findUnique({
      where: { id },
      include: {
        evento: {
          select: {
            nombre: true,
            fecha: true,
            fechaFin: true,
            estado: true,
            _count: { select: { dias: true } },
          },
        },
        diaEvento: { select: { nombre: true, orden: true, inicio: true, fin: true } },
      },
    });
    if (!entradaActual) throw new NotFoundException('Entrada no encontrada');

    // La entrada está vinculada a un evento: no se puede registrar su ingreso/salida
    // desde el control de otro evento.
    if (eventoIdEsperado && entradaActual.eventoId !== eventoIdEsperado) {
      throw new ConflictException(
        `Esta entrada pertenece a "${entradaActual.evento.nombre}": no se puede registrar el movimiento desde el control de otro evento.`,
      );
    }

    if (tipo === 'ingreso') {
      const { evento, diaEvento } = entradaActual;
      const ahora = new Date();
      // La ventana de ingreso es la de la JORNADA de la entrada (una fiesta va
      // de 20:00 a 02:00). Si la entrada no tiene jornada (legacy), se usa el
      // rango del evento como antes.
      const desde = diaEvento?.inicio ?? evento.fecha;
      const hasta = diaEvento?.fin ?? evento.fechaFin;
      // Solo hablamos de "jornada" si el evento tiene más de una; en un evento de
      // una sola noche el mensaje es simplemente sobre el evento.
      const variasJornadas = (evento._count?.dias ?? 0) > 1;
      const jornadaNombre =
        variasJornadas && diaEvento
          ? diaEvento.nombre || `Día ${diaEvento.orden}`
          : null;
      const aperturaPuerta = new Date(
        desde.getTime() - MARGEN_INGRESO_ANTICIPADO_HORAS * 60 * 60 * 1000,
      );

      if (evento.estado === 'finalizado' || ahora > hasta) {
        if (evento.estado === 'finalizado') {
          throw new ConflictException(
            `El evento "${evento.nombre}" ya finalizó — esta entrada ya no es válida para ingresar.`,
          );
        }
        // Evento con varias noches: puede que solo esta jornada haya pasado y las
        // otras sigan activas, así que se aclara cuál.
        throw new ConflictException(
          jornadaNombre
            ? `Esta entrada ya no es válida: era para la jornada «${jornadaNombre}» de "${evento.nombre}", que cerró el ${fmtFechaHora(hasta)}.`
            : `El evento "${evento.nombre}" ya cerró (terminó el ${fmtFechaHora(hasta)}) — esta entrada ya no es válida para ingresar.`,
        );
      }
      if (ahora < aperturaPuerta) {
        const dondePara = jornadaNombre
          ? `la jornada «${jornadaNombre}» de "${evento.nombre}"`
          : `"${evento.nombre}"`;
        throw new ConflictException(
          `El ingreso para ${dondePara} todavía no está habilitado. ` +
            `Abre el ${fmtFechaHora(aperturaPuerta)} (${MARGEN_INGRESO_ANTICIPADO_HORAS} h antes del inicio).`,
        );
      }
    }

    if (tipo === 'salida' && entradaActual.estadoIngreso !== 'ingresado') {
      throw new ConflictException(
        entradaActual.estadoIngreso === 'salio'
          ? 'Esta persona ya registró su salida — no está adentro.'
          : 'Esta persona todavía no registró su ingreso — no se puede registrar una salida.',
      );
    }
    if (tipo === 'ingreso' && entradaActual.estadoIngreso === 'ingresado') {
      throw new ConflictException(
        'Esta entrada ya figura como ingresada. Si la persona salió, registrá primero su salida.',
      );
    }
    if (!entradaActual.foto && !foto) {
      throw new BadRequestException(
        'Foto de seguridad obligatoria — esta entrada todavía no tiene una foto registrada',
      );
    }

    const [, entrada] = await this.prisma.$transaction([
      this.prisma.registroIngreso.create({
        data: {
          entradaId: id,
          tipo,
          foto: foto || undefined,
          registradoPorId: actorId,
        },
      }),
      this.prisma.entrada.update({
        where: { id },
        data: {
          estadoIngreso: tipo === 'ingreso' ? 'ingresado' : 'salio',
          foto: foto || undefined,
        },
        include: { categoriaTicket: true, ...CODIGO_ACTIVO, ...CON_SALDO },
      }),
    ]);
    await this.adjuntarSaldoEvento([entrada]);
    const { codigosQr, ...resto } = entrada;
    return { ...resto, codigoQrVinculado: codigosQr[0] || null };
  }
}
