/* ============================================================================
 * src/modules/eventos/eventos.service.ts
 *
 * Reglas de negocio de Evento. Habla con Prisma. NO conoce HTTP, NO manda
 * correos. Espeja api/index.js -> eventos.
 * ========================================================================= */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { aFecha, aFechaCon } from '../../common/utils/fechas.utils';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { ActualizarEventoDto } from './dto/actualizar-evento.dto';

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista eventos + `precioDesde` (precio mínimo de sus categorías de ticket). */
  async listar() {
    const [eventos, preciosMin] = await Promise.all([
      this.prisma.evento.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.categoriaTicket.groupBy({
        by: ['eventoId'],
        _min: { precio: true },
      }),
    ]);
    const precioPorEvento = new Map(
      preciosMin.map((p) => [p.eventoId, p._min.precio ? Number(p._min.precio) : null]),
    );
    return eventos.map((e) => ({
      ...e,
      precioDesde: precioPorEvento.get(e.id) ?? null,
    }));
  }

  /** Obtiene un evento por id. Lanza 404 si no existe. */
  async obtenerPorId(id: string) {
    const evento = await this.prisma.evento.findUnique({ where: { id } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  /** Crea un evento directo (sin pasar por SolicitudEvento). */
  async crear(dto: CrearEventoDto, creadoPorId: number) {
    return this.prisma.evento.create({
      data: {
        nombre: dto.nombre,
        lugar: dto.lugar,
        imagen: dto.imagen,
        qrPrefijo: dto.qrPrefijo,
        fecha: new Date(dto.fecha),
        fechaFin: aFechaCon(dto.fechaFin, dto.fecha),
        qrAncho: dto.qrAncho,
        qrAlto: dto.qrAlto,
        creadoPorId,
      },
    });
  }

  /** Actualiza campos parciales de un evento existente. */
  async actualizar(id: string, dto: ActualizarEventoDto) {
    const evento = await this.obtenerPorId(id);
    if (evento.archivadoEn) {
      throw new ConflictException(
        'El evento está archivado: quedó de solo lectura. Desarchívalo para editarlo.',
      );
    }
    return this.prisma.evento.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        lugar: dto.lugar,
        imagen: dto.imagen,
        estado: dto.estado,
        qrPrefijo: dto.qrPrefijo,
        fecha: aFecha(dto.fecha),
        fechaFin: aFecha(dto.fechaFin),
        qrAncho: dto.qrAncho,
        qrAlto: dto.qrAlto,
      },
    });
  }

  /** Cierra el evento manualmente, antes de su fechaFin si hace falta (C22). */
  async cerrar(id: string) {
    const evento = await this.obtenerPorId(id);
    if (evento.archivadoEn) {
      throw new ConflictException('El evento ya está archivado.');
    }
    return this.prisma.evento.update({
      where: { id },
      data: { estado: 'finalizado' },
    });
  }

  /**
   * Archiva el evento: cierre DEFINITIVO, queda de solo lectura (ver EventoPolicy).
   * Solo se puede archivar un evento ya finalizado — si sigue activo, primero se cierra.
   */
  async archivar(id: string, adminId: number) {
    const evento = await this.obtenerPorId(id);
    if (evento.archivadoEn) {
      throw new ConflictException('El evento ya está archivado.');
    }
    if (evento.estado !== 'finalizado') {
      throw new ConflictException(
        'Solo se puede archivar un evento finalizado. Ciérralo primero.',
      );
    }
    return this.prisma.evento.update({
      where: { id },
      data: { archivadoEn: new Date(), archivadoPorId: adminId },
    });
  }

  /** Deshace el archivado (Admin): el evento vuelve a admitir cambios. */
  async desarchivar(id: string) {
    const evento = await this.obtenerPorId(id);
    if (!evento.archivadoEn) {
      throw new ConflictException('El evento no está archivado.');
    }
    return this.prisma.evento.update({
      where: { id },
      data: { archivadoEn: null, archivadoPorId: null },
    });
  }
}
