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

  /** Agrega `precioDesde` (precio mínimo de sus categorías de ticket) a una lista de eventos. */
  private async conPrecioDesde(eventos: { id: string }[]) {
    const preciosMin = await this.prisma.categoriaTicket.groupBy({
      by: ['eventoId'],
      _min: { precio: true },
    });
    const precioPorEvento = new Map(
      preciosMin.map((p) => [p.eventoId, p._min.precio ? Number(p._min.precio) : null]),
    );
    return eventos.map((e) => ({
      ...e,
      precioDesde: precioPorEvento.get(e.id) ?? null,
    }));
  }

  /**
   * Listado PÚBLICO (landing de inicio, selector de evento del comprador): solo
   * eventos publicados — un evento en borrador no debe aparecer acá aunque ya
   * exista en la BD (ver `publicar`/`progreso`).
   */
  async listar() {
    const eventos = await this.prisma.evento.findMany({
      where: { publicadoEn: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    return this.conPrecioDesde(eventos);
  }

  /** Listado para el panel de Admin: TODOS los eventos, publicados o no. */
  async listarTodos() {
    const eventos = await this.prisma.evento.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return this.conPrecioDesde(eventos);
  }

  /**
   * Obtiene un evento por id para la página pública. Lanza 404 tanto si no
   * existe como si todavía está en borrador — un link directo a un evento sin
   * publicar debe verse exactamente igual a un evento inexistente.
   */
  async obtenerPorId(id: string) {
    const evento = await this.prisma.evento.findUnique({ where: { id } });
    if (!evento || !evento.publicadoEn) {
      throw new NotFoundException('Evento no encontrado');
    }
    return evento;
  }

  /** Obtiene un evento por id para el panel de Admin: existe o no, sin filtrar por publicación. */
  async obtenerPorIdAdmin(id: string) {
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
        coordenadas: dto.coordenadas,
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
    const evento = await this.obtenerPorIdAdmin(id);
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
        coordenadas: dto.coordenadas,
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
    const evento = await this.obtenerPorIdAdmin(id);
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
    const evento = await this.obtenerPorIdAdmin(id);
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
    const evento = await this.obtenerPorIdAdmin(id);
    if (!evento.archivadoEn) {
      throw new ConflictException('El evento no está archivado.');
    }
    return this.prisma.evento.update({
      where: { id },
      data: { archivadoEn: null, archivadoPorId: null },
    });
  }

  /**
   * Chequeo de qué le falta a un evento en borrador para poder publicarse:
   * al menos un tipo de entrada, al menos un código QR generado, la página
   * pública configurada y al menos un puesto en el mapa (definido junto al
   * usuario). Asignar usuarios (Supervisor/Recargador/...) NO es requisito.
   */
  async progreso(id: string) {
    const evento = await this.obtenerPorIdAdmin(id);
    const [tickets, qr, landing, mapa] = await Promise.all([
      this.prisma.categoriaTicket.count({ where: { eventoId: id } }),
      this.prisma.codigoQr.count({ where: { eventoId: id } }),
      this.prisma.landingConfig.findUnique({ where: { eventoId: id } }),
      this.prisma.puesto.count({ where: { eventoId: id } }),
    ]);
    const pasos = {
      tickets: tickets > 0,
      qr: qr > 0,
      landing: !!landing,
      mapa: mapa > 0,
    };
    return {
      publicado: !!evento.publicadoEn,
      pasos,
      listoParaPublicar: Object.values(pasos).every(Boolean),
    };
  }

  /** Publica el evento: recién ahí aparece en el listado público y admite compras. */
  async publicar(id: string, adminId: number) {
    const evento = await this.obtenerPorIdAdmin(id);
    if (evento.publicadoEn) {
      throw new ConflictException('El evento ya está publicado.');
    }
    const { pasos, listoParaPublicar } = await this.progreso(id);
    if (!listoParaPublicar) {
      const faltantes = Object.entries(pasos)
        .filter(([, listo]) => !listo)
        .map(([paso]) => ETIQUETA_PASO[paso as keyof typeof pasos]);
      throw new ConflictException(`Todavía falta: ${faltantes.join(', ')}.`);
    }
    return this.prisma.evento.update({
      where: { id },
      data: { publicadoEn: new Date(), publicadoPorId: adminId },
    });
  }

  /** Vuelve el evento a borrador: deja de verse/venderse públicamente. */
  async despublicar(id: string) {
    const evento = await this.obtenerPorIdAdmin(id);
    if (!evento.publicadoEn) {
      throw new ConflictException('El evento ya está en borrador.');
    }
    return this.prisma.evento.update({
      where: { id },
      data: { publicadoEn: null, publicadoPorId: null },
    });
  }
}

const ETIQUETA_PASO: Record<'tickets' | 'qr' | 'landing' | 'mapa', string> = {
  tickets: 'crear al menos un tipo de entrada',
  qr: 'generar los códigos QR',
  landing: 'configurar la página del evento',
  mapa: 'armar el mapa (al menos un puesto)',
};
