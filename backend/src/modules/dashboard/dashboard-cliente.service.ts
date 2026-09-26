/* ============================================================================
 * src/modules/dashboard/dashboard-cliente.service.ts
 *
 * Agregados del tablero de evento para el Cliente organizador (spec §2).
 * SOLO agregados: sin nombres/documentos/fotos de asistentes, sin comprobantes,
 * sin rankings nominales de personal, sin transacción por transacción.
 * (Por eso el equipo va en CANTIDADES por rol y el dinero en totales / por hora.)
 * ========================================================================= */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';

// Offset fijo Bolivia (UTC-4) para agrupar por hora local.
const OFFSET_BOLIVIA_H = 4;
const horaBolivia = (d: Date) =>
  (new Date(d).getUTCHours() + 24 - OFFSET_BOLIVIA_H) % 24;
// "2026-11-01" en hora de Bolivia (para agrupar ventas por día).
const diaBolivia = (d: Date) =>
  new Date(new Date(d).getTime() - OFFSET_BOLIVIA_H * 3_600_000)
    .toISOString()
    .slice(0, 10);
// Las fiestas cruzan medianoche: las horas de madrugada (00-11) se ordenan
// como continuación de la noche anterior (mismo criterio que el panel de Admin).
const ordenNoche = (h: number) => (h < 12 ? h + 24 : h);

/** "22:30" | "9 pm" | "18h" -> 22 (hora entera 0..23) o null si no se puede. */
function horaDeTexto(txt: unknown): number | null {
  if (typeof txt !== 'string') return null;
  const m = txt.match(/(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ampm = m[3]?.toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return h >= 0 && h <= 23 ? h : null;
}

@Injectable()
export class DashboardClienteService {
  constructor(private readonly prisma: PrismaService) {}

  /** Eventos donde el actor es el cliente organizador. */
  async eventos(actor: UsuarioJwt) {
    return this.prisma.evento.findMany({
      where: { clienteId: actor.id },
      orderBy: { fecha: 'desc' },
      select: {
        id: true,
        nombre: true,
        lugar: true,
        fecha: true,
        fechaFin: true,
        estado: true,
        archivadoEn: true,
        publicadoEn: true,
        imagen: true,
      },
    });
  }

  async resumen(actor: UsuarioJwt, eventoId: string) {
    const ev = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: {
        resumen: true,
        dias: { orderBy: { orden: 'asc' } },
      },
    });
    if (!ev || ev.clienteId !== actor.id) {
      throw new ForbiddenException('Ese evento no es tuyo');
    }

    const [
      tickets,
      qr,
      landing,
      mapa,
      categorias,
      confirmadasPorCat,
      recaudado,
      reservadasPendientes,
      personasDentro,
      asistieron,
      confirmadasTotal,
      txPorTipo,
      ventasPorPuesto,
      puestos,
      movimientos,
      itemsEvento,
      consumoMovs,
      entradasUlt7,
      txRecargaConsumo,
      comprasConfirmadas,
      comprasPorEstado,
      salieron,
      asignacionesPorRol,
      ayudantes,
    ] = await Promise.all([
      this.prisma.categoriaTicket.count({ where: { eventoId } }),
      this.prisma.codigoQr.count({ where: { eventoId } }),
      this.prisma.landingConfig.findUnique({ where: { eventoId } }),
      this.prisma.puesto.count({ where: { eventoId } }),
      this.prisma.categoriaTicket.findMany({
        where: { eventoId },
        select: {
          id: true,
          nombre: true,
          cantidad: true,
          cantidadVendida: true,
          precio: true,
        },
      }),
      this.prisma.entrada.groupBy({
        by: ['categoriaTicketId'],
        where: { eventoId, compra: { estado: 'confirmado' } },
        _count: { _all: true },
      }),
      this.prisma.compra.aggregate({
        _sum: { montoTotal: true },
        where: { eventoId, estado: 'confirmado' },
      }),
      this.prisma.compra.count({ where: { eventoId, estado: 'pendiente' } }),
      this.prisma.entrada.count({
        where: { eventoId, estadoIngreso: 'ingresado' },
      }),
      this.prisma.entrada.count({
        where: { eventoId, estadoIngreso: { in: ['ingresado', 'salio'] } },
      }),
      this.prisma.entrada.count({
        where: { eventoId, compra: { estado: 'confirmado' } },
      }),
      // Totales de dinero cashless por tipo (recargas, consumos, devoluciones…).
      this.prisma.transaccion.groupBy({
        by: ['tipo'],
        _sum: { monto: true },
        where: { eventoId },
      }),
      this.prisma.venta.groupBy({
        by: ['puestoId'],
        where: { puesto: { eventoId }, anuladaEn: null },
        _sum: { montoTotal: true },
        _count: { _all: true },
      }),
      this.prisma.puesto.findMany({
        where: { eventoId },
        select: { id: true, base: { select: { nombre: true } } },
      }),
      // E1 — movimientos de puerta (para el aforo acumulado por hora).
      this.prisma.registroIngreso.findMany({
        where: { entrada: { eventoId } },
        select: { tipo: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      // E4 — ítems vendidos del evento (ventas no anuladas) para el ranking.
      this.prisma.ventaItem.findMany({
        where: { venta: { puesto: { eventoId }, anuladaEn: null } },
        select: { nombreProducto: true, cantidad: true, precioUnitario: true },
      }),
      // E4 — consumos con hora, para la hora pico de consumo.
      this.prisma.transaccion.findMany({
        where: { eventoId, tipo: 'consumo' },
        select: { createdAt: true },
      }),
      // E3 — entradas confirmadas en los últimos 7 días (ritmo de venta).
      this.prisma.entrada.count({
        where: {
          eventoId,
          compra: {
            estado: 'confirmado',
            createdAt: {
              gte: new Date(Date.now() - 7 * 86_400_000),
            },
          },
        },
      }),
      // Recargas vs. consumos por hora (montos, sin quién ni a quién).
      this.prisma.transaccion.findMany({
        where: { eventoId, tipo: { in: ['recarga', 'consumo'] } },
        select: { tipo: true, monto: true, createdAt: true },
      }),
      // Venta de entradas por día.
      this.prisma.compra.findMany({
        where: { eventoId, estado: 'confirmado' },
        select: {
          createdAt: true,
          montoTotal: true,
          _count: { select: { entradas: true } },
        },
      }),
      this.prisma.compra.groupBy({
        by: ['estado'],
        where: { eventoId },
        _count: { _all: true },
      }),
      this.prisma.entrada.count({ where: { eventoId, estadoIngreso: 'salio' } }),
      // Equipo: SOLO cantidades por rol (sin nombres, spec §2).
      this.prisma.asignacion.groupBy({
        by: ['rol'],
        where: { eventoId },
        _count: { _all: true },
      }),
      this.prisma.puestoAyudante.count({ where: { puesto: { eventoId } } }),
    ]);

    const confirmadasMap = new Map(
      confirmadasPorCat.map((c) => [c.categoriaTicketId, c._count._all]),
    );
    const porCategoria = categorias.map((c) => {
      const confirmadas = confirmadasMap.get(c.id) ?? 0;
      const precio = Number(c.precio);
      return {
        nombre: c.nombre,
        cupo: c.cantidad,
        confirmadas,
        reservadas: c.cantidadVendida,
        disponibles: Math.max(0, c.cantidad - c.cantidadVendida),
        precio,
        ingreso: confirmadas * precio,
      };
    });
    const cupoTotal = categorias.reduce((s, c) => s + c.cantidad, 0);
    const reservadasTotal = categorias.reduce(
      (s, c) => s + c.cantidadVendida,
      0,
    );

    const nombrePuesto = new Map(puestos.map((p) => [p.id, p.base.nombre]));
    const topPuestos = ventasPorPuesto
      .map((v) => ({
        nombre: nombrePuesto.get(v.puestoId) ?? 'Puesto',
        ingresos: Number(v._sum.montoTotal ?? 0),
        ventas: v._count._all,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 8);

    const diasRestantes = Math.ceil(
      (new Date(ev.fecha).getTime() - Date.now()) / 86_400_000,
    );

    // Evento archivado con foto de cierre (spec 5.7): los totales salen del
    // snapshot congelado, no de las tablas vivas. porCategoria/topPuestos se
    // dejan en vivo (no están en el snapshot; cambian poco tras archivar).
    const snap = ev.resumen;
    const confirmadas = snap ? snap.entradasVendidas : confirmadasTotal;
    const recaudadoTotal = snap
      ? Number(snap.recaudado)
      : Number(recaudado._sum.montoTotal ?? 0);
    const asistentes = snap ? snap.asistentes : asistieron;
    const dinero = (tipo: string) =>
      Number(txPorTipo.find((t) => t.tipo === tipo)?._sum.monto ?? 0);
    const consumoTotal = snap
      ? Number(snap.consumido)
      : dinero('consumo') - dinero('reverso_consumo');

    // ---- Dinero cashless (pts) — mismas cuentas que el panel de Admin POR
    // EVENTO (tabla de eventos, tablero del evento y foto de cierre) ----
    const recargado = snap ? Number(snap.recargado) : dinero('recarga');
    const devuelto = snap ? Number(snap.devuelto) : dinero('devolucion');
    const saldoCirculacion = snap
      ? Number(snap.saldoRemanente)
      : recargado - consumoTotal - devuelto;

    // ---- Recargas vs. consumos por hora del día (solo horas con movimiento) ----
    const porHoraMap = new Map<number, { hora: number; recargas: number; consumos: number }>();
    for (const t of txRecargaConsumo) {
      const h = horaBolivia(t.createdAt);
      const fila = porHoraMap.get(h) ?? { hora: h, recargas: 0, consumos: 0 };
      if (t.tipo === 'recarga') fila.recargas += Number(t.monto);
      else fila.consumos += Number(t.monto);
      porHoraMap.set(h, fila);
    }
    const actividadPorHora = [...porHoraMap.values()]
      .sort((a, b) => ordenNoche(a.hora) - ordenNoche(b.hora))
      .map((f) => ({ ...f, recargas: Math.round(f.recargas), consumos: Math.round(f.consumos) }));

    // ---- Venta de entradas por día (con los días sin venta en 0) ----
    const porDiaMap = new Map<string, { entradas: number; monto: number }>();
    for (const c of comprasConfirmadas) {
      const dia = diaBolivia(c.createdAt);
      const fila = porDiaMap.get(dia) ?? { entradas: 0, monto: 0 };
      fila.entradas += c._count.entradas;
      fila.monto += Number(c.montoTotal);
      porDiaMap.set(dia, fila);
    }
    const ventasPorDia: { dia: string; entradas: number; monto: number }[] = [];
    const diasConVenta = [...porDiaMap.keys()].sort();
    if (diasConVenta.length) {
      const desde = new Date(`${diasConVenta[0]}T00:00:00Z`).getTime();
      const hasta = new Date(`${diasConVenta[diasConVenta.length - 1]}T00:00:00Z`).getTime();
      // Tope de 120 días para no mandar una serie enorme.
      const inicio = Math.max(desde, hasta - 119 * 86_400_000);
      for (let t = inicio; t <= hasta; t += 86_400_000) {
        const dia = new Date(t).toISOString().slice(0, 10);
        ventasPorDia.push({ dia, ...(porDiaMap.get(dia) ?? { entradas: 0, monto: 0 }) });
      }
    }

    // ---- Ventas de los puestos (totales) ----
    const ventasTotales = ventasPorPuesto.reduce((s, v) => s + v._count._all, 0);
    const vendidoPuestos = ventasPorPuesto.reduce((s, v) => s + Number(v._sum.montoTotal ?? 0), 0);
    const unidadesVendidas = itemsEvento.reduce((s, it) => s + it.cantidad, 0);

    const comprasEstado = (estado: string) =>
      comprasPorEstado.find((c) => c.estado === estado)?._count._all ?? 0;
    const enRol = (rol: string) =>
      asignacionesPorRol.find((a) => a.rol === rol)?._count._all ?? 0;

    // ---- E1: aforo dentro del recinto por hora (ingresos - salidas acumulado) ----
    const netoPorHora = new Array(24).fill(0);
    for (const m of movimientos) {
      netoPorHora[horaBolivia(m.createdAt)] += m.tipo === 'salida' ? -1 : 1; // verificacion_duplicado = ingreso
    }
    let acum = 0;
    const aforoPorHora = netoPorHora.map((n, hora) => {
      acum += n;
      return { hora, dentro: Math.max(0, acum) };
    });
    const horaPicoIngreso = aforoPorHora.reduce(
      (mejor, x) => (x.dentro > mejor.dentro ? x : mejor),
      { hora: 0, dentro: 0 },
    ).hora;

    // ---- E2: cronograma de la landing, con hora entera parseada ----
    const cronogramaRaw = Array.isArray(landing?.cronograma)
      ? (landing!.cronograma as Array<Record<string, unknown>>)
      : [];
    const cronograma = cronogramaRaw
      .map((c) => ({
        hora: horaDeTexto(c.hora),
        horaTexto: typeof c.hora === 'string' ? c.hora : '',
        actividad: typeof c.actividad === 'string' ? c.actividad : '',
      }))
      .filter((c) => c.hora != null);

    // ---- E4: ranking de productos + hora pico de consumo ----
    const prodMap = new Map<
      string,
      { nombre: string; unidades: number; ingresos: number }
    >();
    for (const it of itemsEvento) {
      const p = prodMap.get(it.nombreProducto) ?? {
        nombre: it.nombreProducto,
        unidades: 0,
        ingresos: 0,
      };
      p.unidades += it.cantidad;
      p.ingresos += it.cantidad * Number(it.precioUnitario);
      prodMap.set(it.nombreProducto, p);
    }
    const topProductos = [...prodMap.values()]
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);

    const consumoPorHora = new Array(24).fill(0);
    for (const t of consumoMovs) consumoPorHora[horaBolivia(t.createdAt)] += 1;
    const horaPicoConsumo = consumoMovs.length
      ? consumoPorHora.indexOf(Math.max(...consumoPorHora))
      : null;

    // ---- E3: proyección de venta (solo si el evento no empezó) ----
    const noEmpezado = new Date(ev.fecha).getTime() > Date.now();
    const disponibles = Math.max(0, cupoTotal - confirmadas);
    const ritmoDiario = entradasUlt7 / 7;
    let proyeccion: {
      ritmoDiario: number;
      diasParaAgotar: number | null;
      agotaEn: string | null;
      seAgotaAntes: boolean;
    } | null = null;
    if (noEmpezado && cupoTotal > 0 && ritmoDiario > 0) {
      const dias = disponibles / ritmoDiario;
      const agotaEn = new Date(Date.now() + dias * 86_400_000);
      proyeccion = {
        ritmoDiario,
        diasParaAgotar: dias,
        agotaEn: agotaEn.toISOString(),
        seAgotaAntes: agotaEn.getTime() <= new Date(ev.fecha).getTime(),
      };
    }

    return {
      evento: {
        id: ev.id,
        nombre: ev.nombre,
        fecha: ev.fecha,
        fechaFin: ev.fechaFin,
        estado: ev.estado,
        archivadoEn: ev.archivadoEn,
        publicado: ev.publicadoEn != null,
        diasRestantes,
      },
      congeladoEn: snap ? snap.generadoEn : null,
      preparacion: {
        tickets: tickets > 0,
        qr: qr > 0,
        landing: !!landing,
        mapa: mapa > 0,
        listoParaPublicar: tickets > 0 && qr > 0 && !!landing && mapa > 0,
      },
      venta: {
        cupoTotal,
        confirmadasTotal: confirmadas,
        reservadasTotal,
        reservadasPendientes,
        ocupacion: cupoTotal ? confirmadas / cupoTotal : 0,
        recaudado: recaudadoTotal,
        porCategoria,
        proyeccion,
        ventasPorDia,
        compras: {
          confirmadas: comprasEstado('confirmado'),
          pendientes: comprasEstado('pendiente'),
          rechazadas: comprasEstado('rechazado'),
        },
      },
      // Dinero cashless dentro del evento (pts, no Bs).
      finanzas: {
        recargado,
        consumido: consumoTotal,
        devuelto,
        saldoCirculacion,
        actividadPorHora,
      },
      entradas: {
        emitidas: confirmadas,
        dentro: personasDentro,
        salieron,
        faltan: Math.max(0, confirmadas - asistentes),
      },
      ventasPuestos: {
        ventas: ventasTotales,
        total: vendidoPuestos,
        unidades: unidadesVendidas,
        ticketPromedio: ventasTotales ? vendidoPuestos / ventasTotales : 0,
      },
      equipo: {
        puestos: mapa,
        negocios: enRol('UsuarioNegocio'),
        ayudantes,
        recargadores: enRol('Recargador'),
        supervisores: enRol('Supervisor'),
        devoluciones: enRol('Devolucion'),
      },
      operacion: {
        personasDentro,
        asistieron: asistentes,
        tasaAsistencia: confirmadas ? asistentes / confirmadas : 0,
        consumoTotal,
        consumoPromedio: asistentes ? consumoTotal / asistentes : 0,
        topPuestos,
        topProductos,
        aforoPorHora,
        aforoMaximo: (() => {
          const ahora = Date.now();
          const enCurso = ev.dias.find(
            (d) =>
              new Date(d.inicio).getTime() <= ahora &&
              new Date(d.fin).getTime() >= ahora,
          );
          return (enCurso ?? ev.dias[0])?.aforoMaximo ?? null;
        })(),
        jornadas: ev.dias.map((d) => ({
          nombre: d.nombre,
          inicio: d.inicio,
          fin: d.fin,
          aforoMaximo: d.aforoMaximo,
        })),
        cronograma,
        horaPicoIngreso,
        horaPicoConsumo,
      },
    };
  }
}
