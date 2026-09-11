/* ============================================================================
 * src/modules/solicitudes-evento/solicitudes-evento.service.ts
 *
 * El Cliente propone un evento ANTES de que exista. Al aprobar, se crea el
 * Evento + LandingConfig (copiando los datos) + se asigna al Cliente como
 * organizador — todo en un solo $transaction.
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
import { verificarSinChoqueDeFechas } from '../../common/utils/choque-eventos.utils';
import {
  ActualizarSolicitudEventoDto,
  CrearSolicitudEventoDto,
} from './dto/solicitudes-evento.dto';

@Injectable()
export class SolicitudesEventoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(actor: UsuarioJwt, estado?: EstadoSolicitudEvento) {
    return this.prisma.solicitudEvento.findMany({
      where: {
        ...(actor.rol === 'Cliente' ? { clienteId: actor.id } : {}),
        estado,
      },
      include: { cliente: { select: { id: true, nombre: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtenerPorId(id: string, actor: UsuarioJwt) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({
      where: { id },
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
    if (solicitud.estado !== 'pendiente') {
      throw new ConflictException('Esta solicitud ya fue resuelta');
    }

    const actualizada = await this.prisma.solicitudEvento.update({
      where: { id },
      data: {
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
      accion: 'actualizar',
      antes: { nombreEvento: solicitud.nombreEvento, lugar: solicitud.lugar },
      despues: { nombreEvento: actualizada.nombreEvento, lugar: actualizada.lugar },
    });
    return actualizada;
  }

  async aprobar(id: string, adminId: number) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({
      where: { id },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.estado !== 'pendiente') {
      throw new ConflictException('Esta solicitud ya fue resuelta');
    }

    return this.prisma.$transaction(async (tx) => {
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
  }

  async rechazar(id: string, motivoRechazo: string | undefined, adminId: number) {
    const solicitud = await this.prisma.solicitudEvento.findUnique({
      where: { id },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.estado !== 'pendiente') {
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
    return rechazada;
  }
}
