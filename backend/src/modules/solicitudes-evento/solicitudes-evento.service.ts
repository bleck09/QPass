/* ============================================================================
 * src/modules/solicitudes-evento/solicitudes-evento.service.ts
 *
 * El Cliente propone un evento ANTES de que exista. Al aprobar, se crea el
 * Evento + LandingConfig (copiando los datos) + se asigna al Cliente como
 * organizador — todo en un solo $transaction.
 *
 * Ciclo: pendiente -> aprobado | rechazado (finales)
 *        pendiente -> cambios_solicitados (Admin pide cambios con comentario)
 *        cambios_solicitados -> pendiente (el cliente la corrige y la reenvía)
 * ========================================================================= */

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSolicitudEvento, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { aFecha, aFechaCon } from '../../common/utils/fechas.utils';
import {
  buscarChoquesDeFechas,
  verificarSinChoqueDeFechas,
} from '../../common/utils/choque-eventos.utils';
import { MailService } from '../../mail/mail.service';
import { normalizarAjusteImagen } from '../../common/utils/ajuste-imagen.utils';
import {
  ActualizarSolicitudEventoDto,
  CrearSolicitudEventoDto,
} from './dto/solicitudes-evento.dto';

@Injectable()
export class SolicitudesEventoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly mail: MailService,
  ) {}

  async listar(actor: UsuarioJwt, estado?: EstadoSolicitudEvento) {
    return this.prisma.solicitudEvento.findMany({
      where: {
        ...(actor.rol === 'Cliente' ? { clienteId: actor.id } : {}),
        estado,
      },
      include: {
        cliente: { select: { id: true, nombre: true, email: true } },
        resueltoPor: { select: { id: true, nombre: true } },
        // publicadoEn: último paso del seguimiento que ve el cliente.
        evento: { select: { id: true, nombre: true, publicadoEn: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtenerPorId(id: string, actor: UsuarioJwt) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, celular: true } },
        resueltoPor: { select: { id: true, nombre: true } },
        evento: { select: { id: true, nombre: true, publicadoEn: true } },
      },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (actor.rol === 'Cliente' && solicitud.clienteId !== actor.id) {
      throw new ForbiddenException('No autorizado');
    }
    return solicitud;
  }

  async crear(dto: CrearSolicitudEventoDto, clienteId: number) {
    return this.prisma.solicitudEvento.create({
      data: {
        clienteId,
        nombreEvento: dto.nombreEvento,
        lugar: dto.lugar,
        descripcion: dto.descripcion,
        aforoEstimado: dto.aforoEstimado ?? null,
        fecha: new Date(dto.fecha),
        fechaFin: aFechaCon(dto.fechaFin, dto.fecha),
        colorPrimario: dto.colorPrimario,
        colorBoton: dto.colorBoton,
        colorFondo: dto.colorFondo,
        colorTextoTitulo: dto.colorTextoTitulo,
        colorTextoP: dto.colorTextoP,
        imagenPortada: dto.imagenPortada,
        imagenAjuste: ajusteParaBd(dto.imagenAjuste),
        mapaLugar: dto.mapaLugar,
        actividades: dto.actividades,
        cronograma: dto.cronograma,
      },
    });
  }

  async actualizar(
    id: string,
    dto: ActualizarSolicitudEventoDto,
    actor: UsuarioJwt,
  ) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({
      where: { id },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.clienteId !== actor.id) {
      throw new ForbiddenException('No autorizado');
    }
    if (solicitud.estado !== 'pendiente' && solicitud.estado !== 'cambios_solicitados') {
      throw new ConflictException('Esta solicitud ya fue resuelta');
    }
    // Guardar una solicitud devuelta = reenviarla: vuelve a la bandeja del Admin.
    const reenvio = solicitud.estado === 'cambios_solicitados';

    const actualizada = await this.prisma.solicitudEvento.update({
      where: { id },
      data: {
        ...(reenvio ? { estado: 'pendiente' as const, reenviadaEn: new Date() } : {}),
        nombreEvento: dto.nombreEvento,
        lugar: dto.lugar,
        descripcion: dto.descripcion,
        aforoEstimado: dto.aforoEstimado,
        colorPrimario: dto.colorPrimario,
        colorBoton: dto.colorBoton,
        colorFondo: dto.colorFondo,
        colorTextoTitulo: dto.colorTextoTitulo,
        colorTextoP: dto.colorTextoP,
        imagenPortada: dto.imagenPortada,
        ...(dto.imagenAjuste !== undefined && { imagenAjuste: ajusteParaBd(dto.imagenAjuste) }),
        mapaLugar: dto.mapaLugar,
        actividades: dto.actividades,
        cronograma: dto.cronograma,
        fecha: aFecha(dto.fecha),
        fechaFin: aFecha(dto.fechaFin),
      },
    });
    await this.auditoria.registrar(null, {
      actorId: actor.id,
      entidad: 'solicitud_evento',
      entidadId: id,
      accion: reenvio ? 'reenviar' : 'actualizar',
      antes: { estado: solicitud.estado, nombreEvento: solicitud.nombreEvento, lugar: solicitud.lugar },
      despues: { estado: actualizada.estado, nombreEvento: actualizada.nombreEvento, lugar: actualizada.lugar },
    });
    return actualizada;
  }

  async aprobar(id: string, adminId: number) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({
      where: { id },
      include: { cliente: { select: { nombre: true, email: true } } },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.estado !== 'pendiente') {
      throw new ConflictException(
        solicitud.estado === 'cambios_solicitados'
          ? 'Está esperando los cambios que le pediste al cliente: se aprueba cuando la reenvíe.'
          : 'Esta solicitud ya fue resuelta',
      );
    }

    const nuevoEvento = await this.prisma.$transaction(async (tx) => {
      // "Un evento a la vez": si estas fechas ya las ocupa otro evento activo,
      // no se puede aprobar la solicitud tal cual — el admin tiene que editarla
      // primero (o rechazarla) para que no se crucen.
      await verificarSinChoqueDeFechas(tx, {
        inicio: solicitud.fecha,
        fin: solicitud.fechaFin,
      });
      const nuevoEvento = await tx.evento.create({
        data: {
          nombre: solicitud.nombreEvento,
          lugar: solicitud.lugar,
          fecha: solicitud.fecha,
          fechaFin: solicitud.fechaFin,
          imagen: solicitud.imagenPortada,
          creadoPorId: adminId,
          clienteId: solicitud.clienteId, // en sync con la Asignacion rol=Cliente de abajo
        },
      });
      // Jornada 1 (= rango completo). El aforo estimado del cliente arranca acá.
      await tx.diaEvento.create({
        data: {
          eventoId: nuevoEvento.id,
          inicio: solicitud.fecha,
          fin: solicitud.fechaFin,
          orden: 1,
          aforoMaximo: solicitud.aforoEstimado,
        },
      });
      await tx.landingConfig.create({
        data: {
          eventoId: nuevoEvento.id,
          titulo: solicitud.nombreEvento,
          informacion: solicitud.descripcion,
          imagen: solicitud.imagenPortada,
          imagenAjuste: solicitud.imagenAjuste ?? Prisma.DbNull,
          colorPrimario: solicitud.colorPrimario,
          colorBoton: solicitud.colorBoton,
          colorFondo: solicitud.colorFondo,
          colorTextoTitulo: solicitud.colorTextoTitulo,
          colorTextoP: solicitud.colorTextoP,
          actividades: (solicitud.actividades ?? []) as Prisma.InputJsonValue,
          cronograma: (solicitud.cronograma ?? []) as Prisma.InputJsonValue,
        },
      });
      await tx.asignacion.upsert({
        where: {
          eventoId_usuarioId: {
            eventoId: nuevoEvento.id,
            usuarioId: solicitud.clienteId,
          },
        },
        update: { rol: 'Cliente' },
        create: {
          eventoId: nuevoEvento.id,
          usuarioId: solicitud.clienteId,
          rol: 'Cliente',
        },
      });
      await tx.solicitudEvento.update({
        where: { id: solicitud.id },
        data: {
          estado: 'aprobado',
          eventoId: nuevoEvento.id,
          resueltoPorId: adminId,
          resueltoEn: new Date(),
        },
      });
      await this.auditoria.registrar(tx, {
        actorId: adminId,
        entidad: 'solicitud_evento',
        entidadId: solicitud.id,
        accion: 'aprobar',
        antes: { estado: solicitud.estado, nombreEvento: solicitud.nombreEvento },
        despues: { estado: 'aprobado', eventoId: nuevoEvento.id },
      });
      return nuevoEvento;
    });

    await this.avisarCliente(solicitud.cliente, `Tu evento "${solicitud.nombreEvento}" fue aprobado — QPass`,
      `¡Buenas noticias! Aprobamos tu solicitud <strong>${escapar(solicitud.nombreEvento)}</strong>. ` +
        'Ya podés entrar a QPass para configurar las entradas y la página del evento.');
    return nuevoEvento;
  }

  async rechazar(id: string, motivoRechazo: string | undefined, adminId: number) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({
      where: { id },
      include: { cliente: { select: { nombre: true, email: true } } },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    // También mientras espera cambios del cliente (ej. nunca la corrigió).
    if (solicitud.estado !== 'pendiente' && solicitud.estado !== 'cambios_solicitados') {
      throw new ConflictException('Esta solicitud ya fue resuelta');
    }

    const rechazada = await this.prisma.solicitudEvento.update({
      where: { id: solicitud.id },
      data: {
        estado: 'rechazado',
        motivoRechazo,
        resueltoPorId: adminId,
        resueltoEn: new Date(),
      },
    });
    await this.auditoria.registrar(null, {
      actorId: adminId,
      entidad: 'solicitud_evento',
      entidadId: solicitud.id,
      accion: 'rechazar',
      antes: { estado: solicitud.estado, nombreEvento: solicitud.nombreEvento },
      despues: { estado: 'rechazado', motivoRechazo: motivoRechazo ?? null },
    });
    await this.avisarCliente(solicitud.cliente, `Tu solicitud "${solicitud.nombreEvento}" fue rechazada — QPass`,
      `Revisamos tu solicitud <strong>${escapar(solicitud.nombreEvento)}</strong> y no pudimos aprobarla.` +
        (motivoRechazo ? `<br><br>Motivo: ${escapar(motivoRechazo)}` : ''));
    return rechazada;
  }

  /**
   * Admin devuelve la solicitud al cliente para que corrija algo (en vez de
   * rechazarla, que es final). El cliente la edita y al guardar vuelve a pendiente.
   */
  async pedirCambios(id: string, comentario: string, adminId: number) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({
      where: { id },
      include: { cliente: { select: { nombre: true, email: true } } },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.estado !== 'pendiente') {
      throw new ConflictException(
        solicitud.estado === 'cambios_solicitados'
          ? 'Ya se le pidieron cambios: hay que esperar a que el cliente la reenvíe.'
          : 'Esta solicitud ya fue resuelta',
      );
    }

    const devuelta = await this.prisma.solicitudEvento.update({
      where: { id },
      data: {
        estado: 'cambios_solicitados',
        comentarioCambios: comentario.trim(),
        cambiosPedidosEn: new Date(),
      },
    });
    await this.auditoria.registrar(null, {
      actorId: adminId,
      entidad: 'solicitud_evento',
      entidadId: id,
      accion: 'pedir_cambios',
      antes: { estado: solicitud.estado },
      despues: { estado: 'cambios_solicitados', comentario: devuelta.comentarioCambios },
    });
    await this.avisarCliente(solicitud.cliente, `Tu solicitud "${solicitud.nombreEvento}" necesita cambios — QPass`,
      `Revisamos tu solicitud <strong>${escapar(solicitud.nombreEvento)}</strong> y necesitamos que cambies algo antes de aprobarla:` +
        `<br><br>${escapar(devuelta.comentarioCambios ?? '')}<br><br>` +
        'Entrá a QPass, corregí la solicitud y guardala para reenviarla.');
    return devuelta;
  }

  /**
   * Lo que el Admin necesita saber ANTES de decidir, sin tener que probar a
   * aprobar: eventos que ocupan esas fechas (bloquean la aprobación), otras
   * solicitudes abiertas en las mismas fechas, e historial del cliente.
   */
  async revision(id: string) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({ where: { id } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    const rango = { inicio: solicitud.fecha, fin: solicitud.fechaFin };

    const [choques, solicitudesCruzadas, porEstado, eventosCliente] = await Promise.all([
      buscarChoquesDeFechas(this.prisma, rango),
      this.prisma.solicitudEvento.findMany({
        where: {
          id: { not: id },
          estado: { in: ['pendiente', 'cambios_solicitados'] },
          fecha: { lt: rango.fin },
          fechaFin: { gt: rango.inicio },
        },
        select: {
          id: true, nombreEvento: true, fecha: true, fechaFin: true, estado: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fecha: 'asc' },
      }),
      this.prisma.solicitudEvento.groupBy({
        by: ['estado'],
        where: { clienteId: solicitud.clienteId, id: { not: id } },
        _count: { _all: true },
      }),
      this.prisma.evento.count({ where: { clienteId: solicitud.clienteId } }),
    ]);

    const solicitudesPrevias = Object.fromEntries(
      porEstado.map((g) => [g.estado, g._count._all]),
    ) as Partial<Record<EstadoSolicitudEvento, number>>;

    return {
      choques,
      solicitudesCruzadas,
      cliente: { eventos: eventosCliente, solicitudesPrevias },
    };
  }

  // Correo al cliente: nunca tumba la operación (MailService ya atrapa errores).
  private async avisarCliente(
    cliente: { nombre: string; email: string } | null,
    asunto: string,
    cuerpoHtml: string,
  ) {
    if (!cliente?.email) return;
    await this.mail.enviar({
      para: cliente.email,
      asunto,
      cuerpo: `Hola ${escapar(cliente.nombre)},<br><br>${cuerpoHtml}`,
    });
  }
}

// JSON del ajuste de portada listo para Prisma (null -> columna en NULL).
function ajusteParaBd(ajuste: unknown) {
  return normalizarAjusteImagen(ajuste) ?? Prisma.DbNull;
}

// Texto del usuario dentro del HTML del correo.
function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
