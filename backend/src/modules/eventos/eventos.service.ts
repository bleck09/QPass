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
import { verificarSinChoqueDeFechas } from '../../common/utils/choque-eventos.utils';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { ActualizarEventoDto } from './dto/actualizar-evento.dto';
import { ResumenEventoService } from './resumen-evento.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class EventosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resumenEvento: ResumenEventoService,
    private readonly auditoria: AuditoriaService,
  ) {}

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

  /**
   * "lat, lng" (lo que produce el MapaSelector del front) -> { latitud, longitud }
   * numéricos (§5.11). Devuelve `{}` si el texto no es un par de números; así el
   * spread no pisa nada cuando `coordenadas` no cambia en un PATCH.
   */
  private coordsANumeros(coordenadas?: string | null): {
    latitud?: number;
    longitud?: number;
  } {
    if (coordenadas == null) return {};
    const m = String(coordenadas).match(
      /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
    );
    if (!m) return { latitud: undefined, longitud: undefined };
    return { latitud: Number(m[1]), longitud: Number(m[2]) };
  }

  /** Crea un evento directo (sin pasar por SolicitudEvento). */
  async crear(dto: CrearEventoDto, creadoPorId: number) {
    const fecha = new Date(dto.fecha);
    const fechaFin = aFechaCon(dto.fechaFin, dto.fecha);
    return this.prisma.$transaction(async (tx) => {
      await verificarSinChoqueDeFechas(tx, { inicio: fecha, fin: fechaFin });
      const evento = await tx.evento.create({
        data: {
          nombre: dto.nombre,
          lugar: dto.lugar,
          coordenadas: dto.coordenadas,
          ...this.coordsANumeros(dto.coordenadas),
          imagen: dto.imagen,
          tipoManilla: dto.tipoManilla ?? undefined,
          qrPrefijo: dto.qrPrefijo,
          fecha,
          fechaFin,
          qrAncho: dto.qrAncho,
          qrAlto: dto.qrAlto,
          clienteId: dto.clienteId ?? null,
          diasParaRetiro: dto.diasParaRetiro ?? undefined,
          creadoPorId,
        },
      });
      // Toda categoría / entrada / manilla cuelga de una jornada: el evento
      // nace con una (= su rango completo). Multi-día se agrega después.
      await tx.diaEvento.create({
        data: { eventoId: evento.id, inicio: fecha, fin: fechaFin, orden: 1 },
      });
      return evento;
    });
  }

  /** Actualiza campos parciales de un evento existente. */
  async actualizar(id: string, dto: ActualizarEventoDto, adminId: number) {
    const evento = await this.obtenerPorIdAdmin(id);
    if (evento.archivadoEn) {
      throw new ConflictException(
        'El evento está archivado: quedó de solo lectura. Desarchívalo para editarlo.',
      );
    }
    const nuevaFecha = aFecha(dto.fecha) ?? evento.fecha;
    const nuevaFechaFin = aFecha(dto.fechaFin) ?? evento.fechaFin;
    if (dto.fecha !== undefined || dto.fechaFin !== undefined) {
      await verificarSinChoqueDeFechas(this.prisma, {
        inicio: nuevaFecha,
        fin: nuevaFechaFin,
        excluirEventoId: id,
      });
    }
    const actualizado = await this.prisma.evento.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        lugar: dto.lugar,
        coordenadas: dto.coordenadas,
        ...this.coordsANumeros(dto.coordenadas),
        imagen: dto.imagen,
        estado: dto.estado,
        tipoManilla: dto.tipoManilla,
        qrPrefijo: dto.qrPrefijo,
        fecha: aFecha(dto.fecha),
        fechaFin: aFecha(dto.fechaFin),
        qrAncho: dto.qrAncho,
        qrAlto: dto.qrAlto,
        clienteId: dto.clienteId,
        diasParaRetiro: dto.diasParaRetiro,
      },
    });
    await this.auditoria.registrar(null, {
      actorId: adminId,
      entidad: 'evento',
      entidadId: id,
      accion: 'actualizar',
      antes: {
        nombre: evento.nombre,
        lugar: evento.lugar,
        fecha: evento.fecha,
        fechaFin: evento.fechaFin,
        estado: evento.estado,
        clienteId: evento.clienteId,
      },
      despues: {
        nombre: actualizado.nombre,
        lugar: actualizado.lugar,
        fecha: actualizado.fecha,
        fechaFin: actualizado.fechaFin,
        estado: actualizado.estado,
        clienteId: actualizado.clienteId,
      },
    });
    return actualizado;
  }

  /** Cierra el evento manualmente, antes de su fechaFin si hace falta (C22). */
  async cerrar(id: string, adminId: number) {
    const evento = await this.obtenerPorIdAdmin(id);
    if (evento.archivadoEn) {
      throw new ConflictException('El evento ya está archivado.');
    }
    const actualizado = await this.prisma.evento.update({
      where: { id },
      data: { estado: 'finalizado' },
    });
    await this.auditoria.registrar(null, {
      actorId: adminId,
      entidad: 'evento',
      entidadId: id,
      accion: 'cerrar',
      antes: { estado: evento.estado },
      despues: { estado: 'finalizado' },
    });
    return actualizado;
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
    // Archivar = solo lectura: se congela la foto de cierre (spec 5.7) en la
    // misma transacción para que quede consistente con el estado archivado.
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.evento.update({
        where: { id },
        data: { archivadoEn: new Date(), archivadoPorId: adminId },
      });
      await this.resumenEvento.generar(id, tx);
      await this.auditoria.registrar(tx, {
        actorId: adminId,
        entidad: 'evento',
        entidadId: id,
        accion: 'archivar',
        antes: { archivadoEn: null, estado: evento.estado },
        despues: { archivadoEn: actualizado.archivadoEn },
      });
      return actualizado;
    });
  }

  /** Deshace el archivado (Admin): el evento vuelve a admitir cambios. */
  async desarchivar(id: string, adminId: number) {
    const evento = await this.obtenerPorIdAdmin(id);
    if (!evento.archivadoEn) {
      throw new ConflictException('El evento no está archivado.');
    }
    // Vuelve a ser editable -> los números se recalculan en vivo; se borra la foto.
    return this.prisma.$transaction(async (tx) => {
      await this.resumenEvento.borrar(id, tx);
      const actualizado = await tx.evento.update({
        where: { id },
        data: { archivadoEn: null, archivadoPorId: null },
      });
      await this.auditoria.registrar(tx, {
        actorId: adminId,
        entidad: 'evento',
        entidadId: id,
        accion: 'desarchivar',
        antes: { archivadoEn: evento.archivadoEn },
        despues: { archivadoEn: null },
      });
      return actualizado;
    });
  }

  /**
   * Chequeo de qué le falta a un evento en borrador para poder publicarse:
   * al menos un tipo de entrada y la página pública configurada. El QR solo
   * hace falta pre-generarlo en eventos de manilla FÍSICA (el pool que
   * Supervisor entrega); en DIGITAL el código nace solo al aprobar cada
   * compra, así que exigirlo antes de publicar sería imposible de cumplir
   * (todavía no hay compras). El mapa NO es requisito: los puestos los activa
   * cada Usuario Negocio (Admin no tiene forma de crearlos), así que un
   * evento puede publicarse sin ninguno todavía — si el mapa queda sin
   * configurar, simplemente no se muestra en la página del evento. Asignar
   * usuarios (Supervisor/Recargador/...) tampoco es requisito.
   */
  async progreso(id: string) {
    const evento = await this.obtenerPorIdAdmin(id);
    const [tickets, qr, landing] = await Promise.all([
      this.prisma.categoriaTicket.count({ where: { eventoId: id } }),
      this.prisma.codigoQr.count({ where: { eventoId: id } }),
      this.prisma.landingConfig.findUnique({ where: { eventoId: id } }),
    ]);
    const pasos = {
      tickets: tickets > 0,
      qr: evento.tipoManilla === 'digital' || qr > 0,
      landing: !!landing,
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
    const actualizado = await this.prisma.evento.update({
      where: { id },
      data: { publicadoEn: new Date(), publicadoPorId: adminId },
    });
    await this.auditoria.registrar(null, {
      actorId: adminId,
      entidad: 'evento',
      entidadId: id,
      accion: 'publicar',
      antes: { publicadoEn: null },
      despues: { publicadoEn: actualizado.publicadoEn },
    });
    return actualizado;
  }

  /** Vuelve el evento a borrador: deja de verse/venderse públicamente. */
  async despublicar(id: string, adminId: number) {
    const evento = await this.obtenerPorIdAdmin(id);
    if (!evento.publicadoEn) {
      throw new ConflictException('El evento ya está en borrador.');
    }
    const actualizado = await this.prisma.evento.update({
      where: { id },
      data: { publicadoEn: null, publicadoPorId: null },
    });
    await this.auditoria.registrar(null, {
      actorId: adminId,
      entidad: 'evento',
      entidadId: id,
      accion: 'despublicar',
      antes: { publicadoEn: evento.publicadoEn },
      despues: { publicadoEn: null },
    });
    return actualizado;
  }
}

const ETIQUETA_PASO: Record<'tickets' | 'qr' | 'landing', string> = {
  tickets: 'crear al menos un tipo de entrada',
  qr: 'generar los códigos QR',
  landing: 'configurar la página del evento',
};
