/* ============================================================================
 * src/modules/ventas/ventas.service.ts
 *
 * Cobro de un Ayudante en su puesto contra el saldo del dueño de la Entrada.
 * Abre el $transaction, crea la Venta + items, y delega TODO el movimiento de
 * saldo a TransaccionesService.registrarVenta(tx, ...) (C7): partida doble con
 * el mismo ventaId, atómica con la creación de la Venta.
 * ========================================================================= */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransaccionesService } from '../transacciones/transacciones.service';
import { CrearVentaDto } from './dto/crear-venta.dto';

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transacciones: TransaccionesService,
  ) {}

  async listar(filtros: { puestoId?: string; entradaId?: string; eventoId?: string }) {
    return this.prisma.venta.findMany({
      where: {
        puestoId: filtros.puestoId,
        entradaId: filtros.entradaId,
        puesto: filtros.eventoId ? { eventoId: filtros.eventoId } : undefined,
      },
      include: {
        items: true,
        puesto: { select: { id: true, nombre: true, negocioId: true } },
        entrada: { select: { id: true, nombre: true, documento: true, foto: true } },
        ayudante: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async crear(dto: CrearVentaDto, ayudanteId: number) {
    return this.prisma.$transaction(async (tx) => {
      const entrada = await tx.entrada.findUnique({
        where: { id: dto.entradaId },
      });
      if (!entrada) throw new NotFoundException('Entrada no encontrada');
      if (!entrada.usuarioId) {
        throw new BadRequestException(
          'Esta entrada todavía no tiene una cuenta vinculada',
        );
      }

      const puesto = await tx.puesto.findUnique({ where: { id: dto.puestoId } });
      if (!puesto) throw new NotFoundException('Puesto no encontrado');

      const productos = await tx.producto.findMany({
        where: { id: { in: dto.items.map((i) => i.productoId) } },
      });
      const lineas = dto.items.map((i) => {
        const producto = productos.find((p) => p.id === i.productoId);
        if (!producto) {
          throw new BadRequestException(`Producto ${i.productoId} no encontrado`);
        }
        return {
          productoId: i.productoId,
          nombreProducto: producto.nombre,
          precioUnitario: producto.precio,
          cantidad: i.cantidad,
        };
      });
      const montoTotal = lineas.reduce(
        (suma, l) => suma + Number(l.precioUnitario) * l.cantidad,
        0,
      );

      const venta = await tx.venta.create({
        data: {
          puestoId: dto.puestoId,
          entradaId: dto.entradaId,
          montoTotal,
          ayudanteId,
          items: { create: lineas },
        },
        include: { items: true },
      });

      // Movimiento de saldo: única puerta al ledger (C7). Si el consumo no
      // alcanza, esto lanza y TODO el $transaction (incluida la Venta) revierte.
      await this.transacciones.registrarVenta(tx, {
        eventoId: entrada.eventoId,
        ventaId: venta.id,
        entradaId: dto.entradaId,
        duenoEntradaId: entrada.usuarioId,
        duenoNegocioId: puesto.negocioId,
        monto: montoTotal,
        operadorId: ayudanteId,
      });

      return venta;
    });
  }
}
