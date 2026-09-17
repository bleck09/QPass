/* ============================================================================
 * src/modules/ventas/ventas.service.ts
 *
 * Cobro de un Ayudante en su puesto contra el saldo del dueño de la Entrada.
 * Abre el $transaction, crea la Venta + items, y delega TODO el movimiento de
 * saldo a TransaccionesService.registrarVenta(tx, ...) (C7): partida doble con
 * el mismo ventaId, atómica con la creación de la Venta.
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { TransaccionesService } from '../transacciones/transacciones.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { CasosDuplicadoService } from '../casos-duplicado/casos-duplicado.service';
import { CrearVentaDto } from './dto/crear-venta.dto';

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
    private readonly transacciones: TransaccionesService,
    private readonly auditoria: AuditoriaService,
    private readonly casosDuplicado: CasosDuplicadoService,
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
        puesto: {
          select: {
            id: true,
            negocioId: true,
            base: { select: { nombre: true } },
          },
        },
        entrada: {
          select: {
            id: true, nombre: true, foto: true,
            usuario: { select: { ci: true } },
          },
        },
        ayudante: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async crear(dto: CrearVentaDto, actor: UsuarioJwt) {
    const ayudanteId = actor.id;
    await this.casosDuplicado.asegurarManillaUsable(dto.codigoQr, {
      actor,
      contexto: 'venta',
      puestoId: dto.puestoId,
    });
    await this.eventoPolicy.porEntrada(dto.entradaId);
    return this.prisma.$transaction(async (tx) => {
      const entrada = await tx.entrada.findUnique({
        where: { id: dto.entradaId },
        include: { evento: { select: { nombre: true, estado: true } } },
      });
      if (!entrada) throw new NotFoundException('Entrada no encontrada');
      if (!entrada.usuarioId) {
        throw new BadRequestException(
          'Esta entrada todavía no tiene una cuenta vinculada',
        );
      }

      const puesto = await tx.puesto.findUnique({
        where: { id: dto.puestoId },
        include: { evento: { select: { nombre: true } } },
      });
      if (!puesto) throw new NotFoundException('Puesto no encontrado');

      // El Ayudante solo cobra por los puestos donde está asignado (PuestoAyudante):
      // si no, podría acreditarle la venta a un negocio para el que no trabaja.
      const asignado = await tx.puestoAyudante.findUnique({
        where: { puestoId_ayudanteId: { puestoId: dto.puestoId, ayudanteId } },
        select: { id: true },
      });
      if (!asignado) {
        throw new ForbiddenException('No estás asignado a este puesto');
      }

      // La manilla es de UN evento: su saldo (BilleteraEvento) solo vale ahí. Sin
      // este control, una manilla de otro evento gastaba su saldo acá y la venta
      // se acreditaba al negocio en el evento equivocado.
      if (puesto.eventoId !== entrada.eventoId) {
        throw new ConflictException(
          `Esta manilla es del evento "${entrada.evento.nombre}": no se puede cobrar en un puesto de "${puesto.evento.nombre}".`,
        );
      }

      // El carrito manda ProductoBase.id; el precio/estado (activo/stock) es el
      // de ESTE puesto (ProductoEstado). Sin fila de estado => activo, sin stock.
      const ids = dto.items.map((i) => i.productoId);
      const [bases, estados] = await Promise.all([
        tx.productoBase.findMany({ where: { id: { in: ids } } }),
        tx.productoEstado.findMany({
          where: { puestoId: dto.puestoId, productoBaseId: { in: ids } },
        }),
      ]);
      const estadoDe = new Map(estados.map((e) => [e.productoBaseId, e]));
      const lineas = dto.items.map((i) => {
        const base = bases.find((p) => p.id === i.productoId);
        if (!base) {
          throw new BadRequestException(`Producto ${i.productoId} no encontrado`);
        }
        const estado = estadoDe.get(i.productoId);
        // §5.4 — no se vende un producto marcado como inactivo/agotado.
        if (estado && !estado.activo) {
          throw new ConflictException(`"${base.nombre}" no está disponible`);
        }
        return {
          productoBaseId: i.productoId,
          nombreProducto: base.nombre,
          precioUnitario: estado?.precio ?? base.precio, // override del evento
          cantidad: i.cantidad,
        };
      });

      // §5.4 — descuento de inventario (solo productos con stock controlado en
      // este puesto). Guardado: si no alcanza, count = 0 y revierte el $transaction.
      for (const l of lineas) {
        const estado = estadoDe.get(l.productoBaseId);
        if (!estado || estado.stock == null) continue;
        const bajado = await tx.productoEstado.updateMany({
          where: {
            puestoId: dto.puestoId,
            productoBaseId: l.productoBaseId,
            stock: { gte: l.cantidad },
          },
          data: { stock: { decrement: l.cantidad } },
        });
        if (bajado.count === 0) {
          throw new ConflictException(
            `Sin stock suficiente de "${l.nombreProducto}" (quedan ${estado.stock})`,
          );
        }
      }
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

  /**
   * Anula una venta (§5.3): revierte las 2 filas de saldo y marca la Venta.
   * Puede hacerlo Admin o el Usuario Negocio dueño del puesto.
   */
  async anular(id: string, motivo: string, actor: UsuarioJwt) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: { puesto: true, entrada: true, items: true },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (venta.anuladaEn) {
      throw new ConflictException('Esta venta ya está anulada');
    }
    await this.eventoPolicy.porPuesto(venta.puestoId);
    if (
      actor.rol === 'UsuarioNegocio' &&
      venta.puesto.negocioId !== actor.id
    ) {
      throw new ForbiddenException('Esa venta no es de tu negocio');
    }
    if (!venta.entrada.usuarioId) {
      throw new BadRequestException(
        'La entrada de esta venta no tiene cuenta vinculada',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.transacciones.anularVenta(tx, {
        eventoId: venta.entrada.eventoId,
        ventaId: venta.id,
        entradaId: venta.entradaId,
        duenoEntradaId: venta.entrada.usuarioId!,
        duenoNegocioId: venta.puesto.negocioId,
        monto: Number(venta.montoTotal),
        operadorId: actor.id,
      });
      const actualizada = await tx.venta.update({
        where: { id },
        data: {
          anuladaEn: new Date(),
          anuladaPorId: actor.id,
          motivoAnulacion: motivo,
        },
      });

      // §5.4 — devolver el inventario descontado al vender (solo productos que
      // hoy siguen con stock controlado en este puesto).
      for (const it of venta.items) {
        await tx.productoEstado.updateMany({
          where: {
            puestoId: venta.puestoId,
            productoBaseId: it.productoBaseId,
            stock: { not: null },
          },
          data: { stock: { increment: it.cantidad } },
        });
      }

      await this.auditoria.registrar(tx, {
        actorId: actor.id,
        entidad: 'venta',
        entidadId: id,
        accion: 'anular',
        antes: { montoTotal: venta.montoTotal, anuladaEn: venta.anuladaEn },
        despues: { anuladaEn: actualizada.anuladaEn, motivoAnulacion: motivo },
      });
      return actualizada;
    });
  }
}
