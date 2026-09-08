/* ============================================================================
 * src/modules/dashboard/dashboard-negocio.service.ts
 *
 * Agregados del tablero del Usuario Negocio (spec §3). Una sola carga base
 * (un evento, un negocio) y el resto se calcula en JS: reemplaza el fan-out
 * de N llamadas GET /ventas?puestoId= que hacía el frontend.
 * ========================================================================= */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { rangoFechas, rangoAnterior } from '../../common/utils/fechas.utils';

// Offset fijo Bolivia (UTC-4) para agrupar por hora.
const OFFSET_BOLIVIA_H = 4;

@Injectable()
export class DashboardNegocioService {
  constructor(private readonly prisma: PrismaService) {}

  async resumen(
    actor: UsuarioJwt,
    eventoId?: string,
    desde?: string,
    hasta?: string,
  ) {
    if (!eventoId) {
      throw new BadRequestException('eventoId es requerido');
    }
    const negocioId = actor.id; // rol UsuarioNegocio garantizado por @Roles
    // Sin ?desde=&hasta= => todo el evento (diasPorDefecto = null).
    const rango = rangoFechas(desde, hasta, null);
    const enRango = rango ? { createdAt: rango } : {};

    const [puestos, ventas, acreditado, billetera] = await Promise.all([
      this.prisma.puesto.findMany({
        where: { negocioId, eventoId },
        select: { id: true, nombre: true },
      }),
      this.prisma.venta.findMany({
        where: { puesto: { negocioId, eventoId }, ...enRango },
        select: {
          id: true,
          montoTotal: true,
          createdAt: true,
          puestoId: true,
          ayudanteId: true,
          anuladaEn: true,
          entrada: { select: { numero: true } },
          puesto: { select: { nombre: true } },
          ayudante: { select: { nombre: true } },
          items: {
            select: {
              nombreProducto: true,
              cantidad: true,
              precioUnitario: true,
              producto: { select: { categoria: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaccion.groupBy({
        by: ['tipo'],
        _sum: { monto: true },
        where: {
          usuarioId: negocioId,
          eventoId,
          tipo: { in: ['venta', 'reverso_venta'] },
          ...enRango,
        },
      }),
      this.prisma.billeteraEvento.findUnique({
        where: { usuarioId_eventoId: { usuarioId: negocioId, eventoId } },
        select: { saldo: true },
      }),
    ]);

    // Neto = sin las ventas anuladas (§5.3). Las anuladas se muestran igual en
    // "últimas ventas" pero no cuentan en ingresos / rankings.
    const ventasNetas = ventas.filter((v) => !v.anuladaEn);
    const ventasAnuladas = ventas.filter((v) => v.anuladaEn);

    const ingresoTotal = ventasNetas.reduce((s, v) => s + Number(v.montoTotal), 0);
    const totalVentas = ventasNetas.length;

    // Spec §3 W6 — comparación con el mismo periodo anterior. Solo con un rango
    // acotado (sin ?desde=&hasta= la ventana es "todo el evento" y no hay
    // periodo anterior con sentido).
    let comparativa: {
      ingresoTotal: { actual: number; anterior: number; variacion: number | null };
      totalVentas: { actual: number; anterior: number };
      ticketPromedio: { actual: number; anterior: number };
    } | null = null;
    if (rango) {
      const prev = rangoAnterior(rango);
      const ventasPrev = await this.prisma.venta.findMany({
        where: {
          puesto: { negocioId, eventoId },
          anuladaEn: null,
          createdAt: { gte: prev.gte, lte: prev.lte },
        },
        select: { montoTotal: true },
      });
      const ingresoPrev = ventasPrev.reduce(
        (s, v) => s + Number(v.montoTotal),
        0,
      );
      const ticketActual = totalVentas ? ingresoTotal / totalVentas : 0;
      comparativa = {
        ingresoTotal: {
          actual: ingresoTotal,
          anterior: ingresoPrev,
          variacion:
            ingresoPrev === 0 ? null : (ingresoTotal - ingresoPrev) / ingresoPrev,
        },
        totalVentas: { actual: totalVentas, anterior: ventasPrev.length },
        ticketPromedio: {
          actual: ticketActual,
          anterior: ventasPrev.length ? ingresoPrev / ventasPrev.length : 0,
        },
      };
    }

    const sumaTipo = (tipo: string) =>
      Number(acreditado.find((t) => t.tipo === tipo)?._sum.monto ?? 0);
    const acreditadoBilletera = sumaTipo('venta') - sumaTipo('reverso_venta');

    // W1 — ventas por hora (0..23), hora local Bolivia.
    const porHora = Array.from({ length: 24 }, (_, hora) => ({
      hora,
      ingresos: 0,
      ventas: 0,
    }));
    // W2 — top productos.
    const productos = new Map<
      string,
      { nombre: string; unidades: number; ingresos: number }
    >();
    // §5.11 — ventas agrupadas por categoría de producto (bebida/comida/...).
    const porCategoria = new Map<
      string,
      { categoria: string; unidades: number; ingresos: number }
    >();
    // W3 — por puesto.
    const porPuestoMap = new Map<
      string,
      { id: string; nombre: string; ingresos: number; ventas: number }
    >();
    for (const p of puestos) {
      porPuestoMap.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        ingresos: 0,
        ventas: 0,
      });
    }
    // W4 — por ayudante.
    const porAyudanteMap = new Map<
      number,
      { id: number; nombre: string; ingresos: number; ventas: number }
    >();

    for (const v of ventasNetas) {
      const monto = Number(v.montoTotal);
      const h =
        (new Date(v.createdAt).getUTCHours() + 24 - OFFSET_BOLIVIA_H) % 24;
      porHora[h].ingresos += monto;
      porHora[h].ventas += 1;

      const puestoFila =
        porPuestoMap.get(v.puestoId) ??
        porPuestoMap
          .set(v.puestoId, {
            id: v.puestoId,
            nombre: v.puesto?.nombre ?? 'Puesto',
            ingresos: 0,
            ventas: 0,
          })
          .get(v.puestoId)!;
      puestoFila.ingresos += monto;
      puestoFila.ventas += 1;

      const ayudanteFila =
        porAyudanteMap.get(v.ayudanteId) ??
        porAyudanteMap
          .set(v.ayudanteId, {
            id: v.ayudanteId,
            nombre: v.ayudante?.nombre ?? 'Ayudante',
            ingresos: 0,
            ventas: 0,
          })
          .get(v.ayudanteId)!;
      ayudanteFila.ingresos += monto;
      ayudanteFila.ventas += 1;

      for (const it of v.items) {
        const linea = it.cantidad * Number(it.precioUnitario);
        const prev = productos.get(it.nombreProducto) ?? {
          nombre: it.nombreProducto,
          unidades: 0,
          ingresos: 0,
        };
        prev.unidades += it.cantidad;
        prev.ingresos += linea;
        productos.set(it.nombreProducto, prev);

        const cat = it.producto?.categoria || 'Sin categoría';
        const pc = porCategoria.get(cat) ?? {
          categoria: cat,
          unidades: 0,
          ingresos: 0,
        };
        pc.unidades += it.cantidad;
        pc.ingresos += linea;
        porCategoria.set(cat, pc);
      }
    }

    const topProductos = [...productos.values()]
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);

    const ventasPorCategoria = [...porCategoria.values()].sort(
      (a, b) => b.ingresos - a.ingresos,
    );

    const porPuesto = [...porPuestoMap.values()].sort(
      (a, b) => b.ingresos - a.ingresos,
    );

    const porAyudante = [...porAyudanteMap.values()]
      .map((a) => ({
        ...a,
        ticketPromedio: a.ventas ? a.ingresos / a.ventas : 0,
      }))
      .sort((a, b) => b.ingresos - a.ingresos);

    const ultimasVentas = ventas.slice(0, 20).map((v) => ({
      id: v.id,
      createdAt: v.createdAt,
      puesto: v.puesto?.nombre ?? '—',
      ayudante: v.ayudante?.nombre ?? '—',
      entradaNumero: v.entrada?.numero ?? null,
      monto: Number(v.montoTotal),
      items: v.items.length,
      anulada: v.anuladaEn != null,
    }));

    return {
      resumen: {
        ingresoTotal,
        totalVentas,
        ticketPromedio: totalVentas ? ingresoTotal / totalVentas : 0,
        acreditadoBilletera,
        saldoBilletera: Number(billetera?.saldo ?? 0),
        puestos: puestos.length,
        anuladas: {
          cantidad: ventasAnuladas.length,
          monto: ventasAnuladas.reduce((s, v) => s + Number(v.montoTotal), 0),
        },
        comparativa,
      },
      ventasPorHora: porHora,
      topProductos,
      ventasPorCategoria,
      porPuesto,
      porAyudante,
      ultimasVentas,
    };
  }
}
