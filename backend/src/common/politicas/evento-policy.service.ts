/* ============================================================================
 * src/common/politicas/evento-policy.service.ts
 *
 * Un evento ARCHIVADO (Evento.archivadoEn != null) queda de SOLO LECTURA: ninguna
 * escritura ligada a él debe pasar. Este service centraliza ese chequeo — cada
 * write service llama al método que le sirva según el id que tenga a mano
 * (eventoId directo, o vía entrada/puesto/compra/...).
 *
 * Es distinto de estado=finalizado: finalizado todavía deja hacer devoluciones,
 * resolver incidencias, corregir reportes, etc. Archivado no deja NADA.
 * ========================================================================= */

import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventoPolicy {
  constructor(private readonly prisma: PrismaService) {}

  /** Lanza 409 si el evento está archivado. `null`/`undefined` => no hace nada. */
  async porEvento(eventoId: string | null | undefined): Promise<void> {
    if (!eventoId) return;
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { archivadoEn: true, nombre: true },
    });
    if (evento?.archivadoEn) {
      throw new ConflictException(
        `El evento "${evento.nombre}" está archivado: quedó de solo lectura y no admite más cambios`,
      );
    }
  }

  async porEntrada(entradaId: string): Promise<void> {
    const entrada = await this.prisma.entrada.findUnique({
      where: { id: entradaId },
      select: { eventoId: true },
    });
    return this.porEvento(entrada?.eventoId);
  }

  async porPuesto(puestoId: string): Promise<void> {
    const puesto = await this.prisma.puesto.findUnique({
      where: { id: puestoId },
      select: { eventoId: true },
    });
    return this.porEvento(puesto?.eventoId);
  }

  async porProducto(productoId: string): Promise<void> {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
      select: { puesto: { select: { eventoId: true } } },
    });
    return this.porEvento(producto?.puesto?.eventoId);
  }

  async porCategoriaTicket(categoriaTicketId: string): Promise<void> {
    const categoria = await this.prisma.categoriaTicket.findUnique({
      where: { id: categoriaTicketId },
      select: { eventoId: true },
    });
    return this.porEvento(categoria?.eventoId);
  }

  async porCompra(compraId: string): Promise<void> {
    const compra = await this.prisma.compra.findUnique({
      where: { id: compraId },
      select: { eventoId: true },
    });
    return this.porEvento(compra?.eventoId);
  }

  async porIncidenciaRecarga(incidenciaId: string): Promise<void> {
    const incidencia = await this.prisma.incidenciaRecarga.findUnique({
      where: { id: incidenciaId },
      select: { eventoId: true },
    });
    return this.porEvento(incidencia?.eventoId);
  }

  async porReporteEntrada(reporteId: string): Promise<void> {
    const reporte = await this.prisma.reporteEntrada.findUnique({
      where: { id: reporteId },
      select: { eventoId: true },
    });
    return this.porEvento(reporte?.eventoId);
  }

  async porAsignacion(asignacionId: string): Promise<void> {
    const asignacion = await this.prisma.asignacion.findUnique({
      where: { id: asignacionId },
      select: { eventoId: true },
    });
    return this.porEvento(asignacion?.eventoId);
  }
}
