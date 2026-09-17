/* ============================================================================
 * src/modules/dashboard/dashboard.service.ts
 *
 * Agregados del tablero ADMIN GENERAL. Todo con groupBy/aggregate/count de
 * Prisma; nada de findMany + sumar en JS grandes volúmenes.
 * ========================================================================= */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  rangoFechas,
  rangoAnterior,
  diasEntreBolivia,
} from '../../common/utils/fechas.utils';

/**
 * Transaccion.monto se guarda SIEMPRE positivo; el signo lo pone el tipo
 * (ver comentario del modelo y jobs/cron/reconciliacion-saldo.cron.ts; spec §0.1).
 * El PASIVO cashless en circulación solo lo mueven estos tres tipos
 * (spec 1.2 #3: recarga - consumo - devolucion). venta/ajuste no cuentan acá.
 */
const SIGNO_CASHLESS: Record<string, number> = {
  recarga: 1,
  consumo: -1,
  devolucion: -1,
  reverso_consumo: 1, // venta anulada: el saldo del comprador vuelve a circulación
};

export interface CasoPendiente {
  total: number;
  masAntiguo: Date | null;
}

export interface Alerta {
  nivel: 'alta' | 'media';
  tipo: string;
  mensaje: string;
  eventoId?: string;
  eventoNombre?: string;
}

// Umbrales de las reglas de alerta (spec W7).
const HORAS_COMPRA_PENDIENTE = 4;
const DIAS_FINALIZADO = 7;
const DIAS_BORRADOR_ESTANCADO = 14;
const QR_ANULADOS_RATIO = 0.15; // >15% de un lote anulado = sospechoso
const QR_ANULADOS_MINIMO = 20; // ...siempre que el lote tenga al menos esto

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Spec 1.1 — fila de acción: casos sin atender + antigüedad del más viejo. */
  async pendientes() {
    const caso = async (
      contar: Promise<number>,
      primero: Promise<{ createdAt: Date } | null>,
    ): Promise<CasoPendiente> => {
      const [total, masViejo] = await Promise.all([contar, primero]);
      return { total, masAntiguo: masViejo?.createdAt ?? null };
    };

    const [comprobantes, solicitudesEvento, incidenciasRecarga, reportesDatos] =
      await Promise.all([
        caso(
          this.prisma.compra.count({ where: { estado: 'pendiente' } }),
          this.prisma.compra.findFirst({
            where: { estado: 'pendiente' },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          }),
        ),
        caso(
          this.prisma.solicitudEvento.count({ where: { estado: 'pendiente' } }),
          this.prisma.solicitudEvento.findFirst({
            where: { estado: 'pendiente' },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          }),
        ),
        caso(
          this.prisma.incidenciaRecarga.count({
            where: { estado: 'pendiente' },
          }),
          this.prisma.incidenciaRecarga.findFirst({
            where: { estado: 'pendiente' },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          }),
        ),
        caso(
          this.prisma.reporteEntrada.count({ where: { estado: 'pendiente' } }),
          this.prisma.reporteEntrada.findFirst({
            where: { estado: 'pendiente' },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          }),
        ),
      ]);

    return { comprobantes, solicitudesEvento, incidenciasRecarga, reportesDatos };
  }

  /**
   * Spec 1.2 — KPIs del sistema. `desde`/`hasta` (ISO) acotan lo que es "del
   * periodo" (recaudado, tasa de rechazo); lo acumulativo/estado-actual (saldo
   * cashless, conteo de eventos, comprobantes pendientes) siempre es global.
   */
  async kpis(desde?: string, hasta?: string) {
    const rango = rangoFechas(desde, hasta);
    const enPeriodo = rango ? { createdAt: rango } : {};
    const gte = rango?.gte ?? new Date(0);
    const lte = rango?.lte ?? new Date();

    const [
      recaudado,
      eventosPorEstado,
      borradores,
      totalEventos,
      txPorTipo,
      comprasPorEstado,
      comprasPendientes,
      tiempoAprob,
      caducado,
    ] = await Promise.all([
      this.prisma.compra.aggregate({
        _sum: { montoTotal: true },
        where: { estado: 'confirmado', ...enPeriodo },
      }),
      this.prisma.evento.groupBy({ by: ['estado'], _count: { _all: true } }),
      this.prisma.evento.count({ where: { publicadoEn: null } }),
      this.prisma.evento.count(),
      this.prisma.transaccion.groupBy({ by: ['tipo'], _sum: { monto: true } }),
      this.prisma.compra.groupBy({
        by: ['estado'],
        _count: { _all: true },
        where: enPeriodo,
      }),
      this.prisma.compra.count({ where: { estado: 'pendiente' } }),
      // Spec 1.2 #5 — tiempo de aprobación de comprobantes (resueltoEn - createdAt).
      // Primer $queryRaw del proyecto: Prisma no expone percentile_cont.
      this.prisma.$queryRaw<Array<{ p50: number | null; p90: number | null }>>(
        Prisma.sql`
          SELECT
            percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("resueltoEn" - "createdAt")))::float8 AS p50,
            percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("resueltoEn" - "createdAt")))::float8 AS p90
          FROM compras
          WHERE "resueltoEn" IS NOT NULL
            AND "createdAt" >= ${gte} AND "createdAt" <= ${lte}
        `,
      ),
      // §T&C — saldo de billeteras cuyo plazo de retiro ya venció y que nadie
      // reclamó. Global (no se acota al periodo).
      this.prisma.billeteraEvento.aggregate({
        _sum: { saldo: true },
        where: { expiraEn: { lt: new Date() }, saldo: { gt: 0 } },
      }),
    ]);

    const contarEstado = (
      filas: Array<{ estado: string; _count: { _all: number } }>,
      estado: string,
    ) => filas.find((f) => f.estado === estado)?._count._all ?? 0;

    const saldoCashlessCirculacion = txPorTipo.reduce(
      (acc, fila) =>
        acc + Number(fila._sum.monto ?? 0) * (SIGNO_CASHLESS[fila.tipo] ?? 0),
      0,
    );

    const confirmadas = contarEstado(comprasPorEstado, 'confirmado');
    const rechazadas = contarEstado(comprasPorEstado, 'rechazado');
    const resueltas = confirmadas + rechazadas;
    const tasaRechazo = resueltas === 0 ? 0 : rechazadas / resueltas;

    // Spec §1.2 #1 — comparación con el mismo periodo anterior. Solo si hay un
    // rango acotado (con "todo" no hay "periodo anterior" con sentido).
    let comparativa: {
      recaudadoEntradas: {
        actual: number;
        anterior: number;
        variacion: number | null;
      };
      tasaRechazoComprobantes: { actual: number; anterior: number };
    } | null = null;
    if (rango) {
      const prev = rangoAnterior(rango);
      const [recaudadoPrev, comprasPrev] = await Promise.all([
        this.prisma.compra.aggregate({
          _sum: { montoTotal: true },
          where: {
            estado: 'confirmado',
            createdAt: { gte: prev.gte, lte: prev.lte },
          },
        }),
        this.prisma.compra.groupBy({
          by: ['estado'],
          _count: { _all: true },
          where: { createdAt: { gte: prev.gte, lte: prev.lte } },
        }),
      ]);
      const recAnterior = Number(recaudadoPrev._sum.montoTotal ?? 0);
      const recActual = Number(recaudado._sum.montoTotal ?? 0);
      const rechPrev = contarEstado(comprasPrev, 'rechazado');
      const resueltasPrev =
        contarEstado(comprasPrev, 'confirmado') + rechPrev;
      comparativa = {
        recaudadoEntradas: {
          actual: recActual,
          anterior: recAnterior,
          variacion:
            recAnterior === 0 ? null : (recActual - recAnterior) / recAnterior,
        },
        tasaRechazoComprobantes: {
          actual: tasaRechazo,
          anterior: resueltasPrev === 0 ? 0 : rechPrev / resueltasPrev,
        },
      };
    }

    return {
      recaudadoEntradas: Number(recaudado._sum.montoTotal ?? 0),
      eventos: {
        total: totalEventos,
        activos: contarEstado(eventosPorEstado, 'activo'),
        finalizados: contarEstado(eventosPorEstado, 'finalizado'),
        publicados: totalEventos - borradores,
        borradores,
      },
      saldoCashlessCirculacion,
      saldoCaducadoNoReclamado: Number(caducado._sum.saldo ?? 0),
      tasaRechazoComprobantes: tasaRechazo,
      comprobantes: { pendientes: comprasPendientes, confirmadas, rechazadas },
      tiempoAprobacion: {
        medianaSegundos: tiempoAprob[0]?.p50 ?? null,
        p90Segundos: tiempoAprob[0]?.p90 ?? null,
      },
      comparativa,
      rango: rango ? { desde: rango.gte, hasta: rango.lte } : null,
    };
  }

  /** Spec W6 — estado de todos los eventos, una fila por evento. */
  async eventos() {
    const [eventos, txAgg, compraAgg, cupoAgg, incidenciasAgg] =
      await Promise.all([
        this.prisma.evento.findMany({
          orderBy: { fecha: 'desc' },
          select: {
            id: true,
            nombre: true,
            fecha: true,
            fechaFin: true,
            estado: true,
            publicadoEn: true,
            archivadoEn: true,
            // Foto de cierre congelada (spec 5.7): si existe, el evento está
            // archivado y sus cifras salen de acá, no de las tablas vivas.
            resumen: {
              select: {
                entradasVendidas: true,
                recaudado: true,
                recargado: true,
                consumido: true,
                devuelto: true,
                saldoRemanente: true,
              },
            },
          },
        }),
        this.prisma.transaccion.groupBy({
          by: ['eventoId', 'tipo'],
          _sum: { monto: true },
        }),
        this.prisma.compra.groupBy({
          by: ['eventoId', 'estado'],
          _sum: { montoTotal: true },
          _count: { _all: true },
        }),
        this.prisma.categoriaTicket.groupBy({
          by: ['eventoId'],
          _sum: { cantidad: true, cantidadVendida: true },
        }),
        this.prisma.incidenciaRecarga.groupBy({
          by: ['eventoId'],
          where: { estado: 'pendiente' },
          _count: { _all: true },
        }),
      ]);

    const dinero = (eventoId: string, tipo: string) =>
      Number(
        txAgg.find((t) => t.eventoId === eventoId && t.tipo === tipo)?._sum
          .monto ?? 0,
      );

    return eventos.map((ev) => {
      const snap = ev.resumen;
      const recargado = snap ? Number(snap.recargado) : dinero(ev.id, 'recarga');
      const consumido = snap ? Number(snap.consumido) : dinero(ev.id, 'consumo');
      const devuelto = snap ? Number(snap.devuelto) : dinero(ev.id, 'devolucion');

      const cupoFila = cupoAgg.find((c) => c.eventoId === ev.id);
      const cupo = Number(cupoFila?._sum.cantidad ?? 0);
      const vendidas = snap
        ? snap.entradasVendidas
        : Number(cupoFila?._sum.cantidadVendida ?? 0);

      const recaudado = snap
        ? Number(snap.recaudado)
        : Number(
            compraAgg.find(
              (c) => c.eventoId === ev.id && c.estado === 'confirmado',
            )?._sum.montoTotal ?? 0,
          );
      const comprasPendientes =
        compraAgg.find((c) => c.eventoId === ev.id && c.estado === 'pendiente')
          ?._count._all ?? 0;
      const incidenciasPendientes =
        incidenciasAgg.find((i) => i.eventoId === ev.id)?._count._all ?? 0;

      return {
        id: ev.id,
        nombre: ev.nombre,
        fecha: ev.fecha,
        fechaFin: ev.fechaFin,
        estado: ev.estado,
        archivadoEn: ev.archivadoEn,
        publicado: ev.publicadoEn != null,
        cupo,
        vendidas,
        ocupacion: cupo === 0 ? 0 : vendidas / cupo,
        recaudado,
        recargado,
        consumido,
        devuelto,
        saldoRemanente: snap
          ? Number(snap.saldoRemanente)
          : recargado -
            consumido -
            devuelto +
            dinero(ev.id, 'reverso_consumo'),
        pendientes: comprasPendientes + incidenciasPendientes,
        congelado: !!snap,
      };
    });
  }

  /** Spec W7 — reglas duras calculadas en backend. Devuelve la lista de alertas. */
  async alertas(): Promise<Alerta[]> {
    const ahora = Date.now();
    const limiteCompra = new Date(ahora - HORAS_COMPRA_PENDIENTE * 3_600_000);
    const limiteFinalizado = ahora - DIAS_FINALIZADO * 86_400_000;
    const limiteBorrador = ahora - DIAS_BORRADOR_ESTANCADO * 86_400_000;

    const [
      eventos,
      qrPorEvento,
      qrAnuladosPorEvento,
      categorias,
      comprasViejas,
      txAgg,
      jornadasConAforo,
      dentroPorJornada,
    ] = await Promise.all([
      this.prisma.evento.findMany({
        where: { archivadoEn: null },
        select: {
          id: true,
          nombre: true,
          fecha: true,
          fechaFin: true,
          publicadoEn: true,
          createdAt: true,
        },
      }),
      this.prisma.codigoQr.groupBy({ by: ['eventoId'], _count: { _all: true } }),
      this.prisma.codigoQr.groupBy({
        by: ['eventoId'],
        where: { anulado: true },
        _count: { _all: true },
      }),
      this.prisma.categoriaTicket.findMany({
        select: {
          eventoId: true,
          nombre: true,
          cantidad: true,
          cantidadVendida: true,
        },
      }),
      this.prisma.compra.count({
        where: { estado: 'pendiente', createdAt: { lt: limiteCompra } },
      }),
      this.prisma.transaccion.groupBy({
        by: ['eventoId', 'tipo'],
        _sum: { monto: true },
      }),
      // §5.5 — aforo por JORNADA: solo las que están en curso ahora.
      this.prisma.diaEvento.findMany({
        where: {
          aforoMaximo: { not: null },
          inicio: { lte: new Date(ahora) },
          fin: { gte: new Date(ahora) },
          evento: { archivadoEn: null },
        },
        select: {
          id: true,
          nombre: true,
          aforoMaximo: true,
          evento: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.entrada.groupBy({
        by: ['diaEventoId'],
        where: { estadoIngreso: 'ingresado' },
        _count: { _all: true },
      }),
    ]);
    const dentroJornada = new Map(
      dentroPorJornada.map((d) => [d.diaEventoId, d._count._all]),
    );

    const qrTotal = new Map(qrPorEvento.map((q) => [q.eventoId, q._count._all]));
    const qrAnulados = new Map(
      qrAnuladosPorEvento.map((q) => [q.eventoId, q._count._all]),
    );
    const catsPorEvento = new Map<
      string,
      Array<{ nombre: string; cantidad: number; cantidadVendida: number }>
    >();
    for (const c of categorias) {
      const lista = catsPorEvento.get(c.eventoId) ?? [];
      lista.push({
        nombre: c.nombre,
        cantidad: c.cantidad,
        cantidadVendida: c.cantidadVendida,
      });
      catsPorEvento.set(c.eventoId, lista);
    }
    const saldoRemanente = (eventoId: string) => {
      const d = (tipo: string) =>
        Number(
          txAgg.find((t) => t.eventoId === eventoId && t.tipo === tipo)?._sum
            .monto ?? 0,
        );
      return (
        d('recarga') + d('ajuste') + d('ajuste_manual') -
        d('consumo') - d('devolucion') + d('reverso_consumo')
      );
    };

    const alertas: Alerta[] = [];

    if (comprasViejas > 0) {
      alertas.push({
        nivel: 'alta',
        tipo: 'compras_sin_revisar',
        mensaje: `${comprasViejas} comprobante(s) llevan más de ${HORAS_COMPRA_PENDIENTE} h sin revisar.`,
      });
    }

    // §5.5 — aforo por jornada en curso: si las personas dentro llegan al 95%
    // de la capacidad de esa noche, es tema de seguridad.
    for (const j of jornadasConAforo) {
      const cap = j.aforoMaximo ?? 0;
      if (cap <= 0) continue;
      const adentro = dentroJornada.get(j.id) ?? 0;
      const ratio = adentro / cap;
      if (ratio < 0.95) continue;
      const donde = j.nombre ? `${j.evento.nombre} · ${j.nombre}` : j.evento.nombre;
      alertas.push({
        eventoId: j.evento.id,
        eventoNombre: j.evento.nombre,
        nivel: ratio >= 1 ? 'alta' : 'media',
        tipo: 'aforo_al_limite',
        mensaje:
          ratio >= 1
            ? `"${donde}": ${adentro} personas dentro para un aforo de ${cap} — al o por encima del límite.`
            : `"${donde}": ${adentro} personas dentro (${Math.round(ratio * 100)}% del aforo de ${cap}).`,
      });
    }

    for (const ev of eventos) {
      const publicado = ev.publicadoEn != null;
      const finMs = new Date(ev.fechaFin).getTime();
      const vigente = finMs >= ahora;
      const cats = catsPorEvento.get(ev.id) ?? [];
      const cupo = cats.reduce((s, c) => s + c.cantidad, 0);
      const totalQr = qrTotal.get(ev.id) ?? 0;
      const base = { eventoId: ev.id, eventoNombre: ev.nombre };

      // Publicar ya exige tickets+QR+landing+mapa (eventos.service.publicar), así
      // que acá no controlamos "sin QR" sino "el pool de QR no cubre el cupo".
      if (publicado && vigente && cupo > 0 && totalQr < cupo) {
        alertas.push({
          ...base,
          nivel: totalQr === 0 ? 'alta' : 'media',
          tipo: 'qr_insuficientes',
          mensaje:
            totalQr === 0
              ? `"${ev.nombre}" está publicado y vigente sin ningún código QR generado.`
              : `"${ev.nombre}": ${totalQr} códigos QR para un cupo de ${cupo} entradas — el pool no alcanza.`,
        });
      }

      // Borrador que quedó abandonado en el armado.
      if (
        !publicado &&
        new Date(ev.createdAt).getTime() < limiteBorrador
      ) {
        alertas.push({
          ...base,
          nivel: 'media',
          tipo: 'borrador_estancado',
          mensaje: `"${ev.nombre}" está en borrador desde hace más de ${DIAS_BORRADOR_ESTANCADO} días y todavía no se publicó.`,
        });
      }
      if (vigente) {
        for (const c of cats) {
          if (c.cantidad > 0 && c.cantidadVendida >= c.cantidad) {
            alertas.push({
              ...base,
              nivel: 'media',
              tipo: 'categoria_agotada',
              mensaje: `"${ev.nombre}": la categoría "${c.nombre}" está agotada y el evento sigue vigente.`,
            });
          }
        }
      }
      if (finMs < limiteFinalizado) {
        const rem = saldoRemanente(ev.id);
        if (rem > 0) {
          alertas.push({
            ...base,
            nivel: 'media',
            tipo: 'saldo_remanente_sin_archivar',
            mensaje: `"${ev.nombre}" terminó hace más de ${DIAS_FINALIZADO} días, tiene ${rem.toFixed(2)} pts de saldo remanente y no está archivado.`,
          });
        }
      }
      const anul = qrAnulados.get(ev.id) ?? 0;
      if (totalQr >= QR_ANULADOS_MINIMO && anul / totalQr > QR_ANULADOS_RATIO) {
        alertas.push({
          ...base,
          nivel: 'media',
          tipo: 'qr_anulados_altos',
          mensaje: `"${ev.nombre}": ${anul} de ${totalQr} códigos QR anulados (${Math.round(
            (anul / totalQr) * 100,
          )}%), posible problema con ese lote de manillas.`,
        });
      }
    }

    // Nivel alta primero; dentro del mismo nivel, se conserva el orden de detección.
    return alertas.sort((a, b) =>
      a.nivel === b.nivel ? 0 : a.nivel === 'alta' ? -1 : 1,
    );
  }

  /**
   * Spec W3 — embudo del ciclo de vida: solicitud enviada -> aprobada ->
   * evento publicado -> finalizado. Publicado/finalizado se cuentan SOLO sobre
   * eventos que nacieron de una solicitud, para que el embudo siga a la misma
   * población (los eventos que crea Admin directo no pasan por acá).
   */
  async embudo() {
    const [enviadas, aprobadas, publicados, finalizados, eventosDirectos] =
      await Promise.all([
        this.prisma.solicitudEvento.count(),
        this.prisma.solicitudEvento.count({ where: { estado: 'aprobado' } }),
        this.prisma.evento.count({
          where: { solicitudOrigen: { isNot: null }, publicadoEn: { not: null } },
        }),
        this.prisma.evento.count({
          where: { solicitudOrigen: { isNot: null }, estado: 'finalizado' },
        }),
        this.prisma.evento.count({ where: { solicitudOrigen: null } }),
      ]);

    return {
      etapas: [
        { clave: 'enviadas', label: 'Solicitudes enviadas', total: enviadas },
        { clave: 'aprobadas', label: 'Aprobadas', total: aprobadas },
        { clave: 'publicados', label: 'Eventos publicados', total: publicados },
        { clave: 'finalizados', label: 'Finalizados', total: finalizados },
      ],
      eventosDirectos, // creados por Admin sin solicitud (fuera del embudo)
    };
  }

  /** Spec 1.4 — operación en vivo de los eventos que están en curso ahora. */
  async vivo() {
    const ahora = new Date();
    const eventos = await this.prisma.evento.findMany({
      where: {
        archivadoEn: null,
        fecha: { lte: ahora },
        fechaFin: { gte: ahora },
      },
      select: {
        id: true,
        nombre: true,
        fecha: true,
        // §5.5 — aforo de la jornada en curso (una fiesta va 20:00 -> 02:00).
        dias: {
          where: { inicio: { lte: ahora }, fin: { gte: ahora } },
          select: { nombre: true, aforoMaximo: true },
          orderBy: { orden: 'asc' },
          take: 1,
        },
      },
      orderBy: { fecha: 'asc' },
    });
    if (eventos.length === 0) return { activo: false, eventos: [] };

    const haceUnaHora = new Date(ahora.getTime() - 3_600_000);

    const detalle = await Promise.all(
      eventos.map(async (ev) => {
        const [dentro, movimientos, txEvento, qrAnulados] = await Promise.all([
          this.prisma.entrada.count({
            where: { eventoId: ev.id, estadoIngreso: 'ingresado' },
          }),
          this.prisma.registroIngreso.findMany({
            where: {
              createdAt: { gte: haceUnaHora },
              entrada: { eventoId: ev.id },
            },
            select: { tipo: true, createdAt: true },
          }),
          this.prisma.transaccion.findMany({
            where: { eventoId: ev.id, tipo: { in: ['recarga', 'consumo'] } },
            select: { tipo: true, monto: true, createdAt: true, operadorId: true },
          }),
          this.prisma.codigoQr.findMany({
            where: { eventoId: ev.id, anulado: true },
            orderBy: { anuladoEn: 'desc' },
            take: 8,
            select: { codigo: true, motivoAnulacion: true, anuladoEn: true },
          }),
        ]);

        // Ingresos / salidas por minuto de la última hora (60 cubos).
        const porMinuto = Array.from({ length: 60 }, (_, min) => ({
          min,
          ingresos: 0,
          salidas: 0,
        }));
        for (const m of movimientos) {
          const idx = Math.floor(
            (m.createdAt.getTime() - haceUnaHora.getTime()) / 60_000,
          );
          if (idx < 0 || idx > 59) continue;
          if (m.tipo !== 'salida') porMinuto[idx].ingresos += 1; // verificacion_duplicado cuenta como ingreso
          else porMinuto[idx].salidas += 1;
        }

        // Recargas / consumos por hora desde el inicio del evento (máx 24 cubos).
        const inicio = ev.fecha.getTime();
        const horasTranscurridas = Math.max(
          1,
          Math.ceil((ahora.getTime() - inicio) / 3_600_000),
        );
        const porHora = Array.from(
          { length: Math.min(horasTranscurridas, 24) },
          (_, hora) => ({ hora, recargas: 0, consumos: 0 }),
        );
        const cuadre = new Map<number, number>();
        for (const t of txEvento) {
          const monto = Number(t.monto);
          const h = Math.floor((t.createdAt.getTime() - inicio) / 3_600_000);
          if (h >= 0 && h < porHora.length) {
            if (t.tipo === 'recarga') porHora[h].recargas += monto;
            else porHora[h].consumos += monto;
          }
          if (t.tipo === 'recarga') {
            cuadre.set(t.operadorId, (cuadre.get(t.operadorId) ?? 0) + monto);
          }
        }

        const operadorIds = [...cuadre.keys()];
        const operadores = operadorIds.length
          ? await this.prisma.usuario.findMany({
              where: { id: { in: operadorIds } },
              select: { id: true, nombre: true },
            })
          : [];
        const nombreOp = new Map(operadores.map((o) => [o.id, o.nombre]));
        const cuadreRecargadores = [...cuadre.entries()]
          .map(([id, total]) => ({ nombre: nombreOp.get(id) ?? `#${id}`, total }))
          .sort((a, b) => b.total - a.total);

        const jornada = ev.dias[0];
        const aforoMaximo = jornada?.aforoMaximo ?? null;
        return {
          id: ev.id,
          nombre: ev.nombre,
          jornada: jornada?.nombre ?? null,
          personasDentro: dentro,
          aforoMaximo,
          aforoRatio: aforoMaximo ? dentro / aforoMaximo : null,
          ingresosSalidasPorMinuto: porMinuto,
          recargasConsumosPorHora: porHora,
          cuadreRecargadores,
          ultimosQrAnulados: qrAnulados.map((q) => ({
            codigo: q.codigo,
            motivo: q.motivoAnulacion,
            hora: q.anuladoEn,
          })),
        };
      }),
    );

    return { activo: true, eventos: detalle };
  }

  /** Spec 5.2 — arqueos de caja recientes + resumen de descuadre. */
  async cortesCaja() {
    const filas = await this.prisma.corteCaja.findMany({
      orderBy: { abiertaEn: 'desc' },
      take: 100,
      include: {
        operador: { select: { nombre: true } },
        evento: { select: { nombre: true } },
      },
    });

    const cortes = filas.map((c) => ({
      id: c.id,
      evento: c.evento?.nombre ?? '—',
      operador: c.operador?.nombre ?? `#${c.operadorId}`,
      rol: c.rol,
      estado: c.estado,
      abiertaEn: c.abiertaEn,
      cerradaEn: c.cerradaEn,
      montoInicial: Number(c.montoInicial),
      montoSistema: c.montoSistema == null ? null : Number(c.montoSistema),
      montoEsperado: c.montoEsperado == null ? null : Number(c.montoEsperado),
      montoDeclarado: c.montoDeclarado == null ? null : Number(c.montoDeclarado),
      diferencia: c.diferencia == null ? null : Number(c.diferencia),
      observacion: c.observacion,
    }));

    const cerradas = cortes.filter((c) => c.estado === 'cerrada');
    return {
      resumen: {
        abiertas: cortes.length - cerradas.length,
        cerradas: cerradas.length,
        conDescuadre: cerradas.filter((c) => (c.diferencia ?? 0) !== 0).length,
        descuadreTotal: cerradas.reduce(
          (s, c) => s + Math.abs(c.diferencia ?? 0),
          0,
        ),
      },
      cortes,
    };
  }

  // Día de Bolivia como texto, para agrupar en SQL sin ambigüedad de tz.
  private static DIA_BOLIVIA = Prisma.sql`to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz'), 'YYYY-MM-DD')`;

  /** W1 — recaudación por entradas por día (compras confirmadas). */
  async recaudacionDiaria(desde?: string, hasta?: string) {
    const rango = rangoFechas(desde, hasta)!;
    const prev = rangoAnterior(rango);
    const traer = (gte: Date, lte: Date) =>
      this.prisma.$queryRaw<Array<{ dia: string; monto: number | null }>>(
        Prisma.sql`
          SELECT ${DashboardService.DIA_BOLIVIA} AS dia,
                 SUM("montoTotal")::float8 AS monto
          FROM compras
          WHERE estado = 'confirmado'
            AND "createdAt" >= ${gte} AND "createdAt" <= ${lte}
          GROUP BY 1 ORDER BY 1
        `,
      );
    const [filas, filasPrev] = await Promise.all([
      traer(rango.gte, rango.lte),
      traer(prev.gte, prev.lte),
    ]);
    const porDia = new Map(filas.map((f) => [f.dia, Number(f.monto ?? 0)]));
    const porDiaPrev = new Map(
      filasPrev.map((f) => [f.dia, Number(f.monto ?? 0)]),
    );
    // "Periodo anterior" alineado por posición de día (día 1 vs día 1, etc.),
    // para que la línea punteada quede sobre la actual aunque el mes tenga
    // distinta cantidad de días.
    const diasPrev = diasEntreBolivia(prev.gte, prev.lte);
    const puntos = diasEntreBolivia(rango.gte, rango.lte).map((dia, i) => ({
      dia,
      monto: porDia.get(dia) ?? 0,
      montoPrev: porDiaPrev.get(diasPrev[i]) ?? 0,
    }));
    return { puntos, rango: { desde: rango.gte, hasta: rango.lte } };
  }

  /** W2 — recaudación por evento, top 10. */
  async recaudacionPorEvento(desde?: string, hasta?: string) {
    const rango = rangoFechas(desde, hasta)!;
    const agg = await this.prisma.compra.groupBy({
      by: ['eventoId'],
      where: {
        estado: 'confirmado',
        createdAt: { gte: rango.gte, lte: rango.lte },
      },
      _sum: { montoTotal: true },
    });
    const top = agg
      .map((a) => ({
        eventoId: a.eventoId,
        recaudado: Number(a._sum.montoTotal ?? 0),
      }))
      .sort((a, b) => b.recaudado - a.recaudado)
      .slice(0, 10);
    const eventos = top.length
      ? await this.prisma.evento.findMany({
          where: { id: { in: top.map((t) => t.eventoId) } },
          select: { id: true, nombre: true },
        })
      : [];
    const nombre = new Map(eventos.map((e) => [e.id, e.nombre]));
    return top.map((t) => ({ ...t, nombre: nombre.get(t.eventoId) ?? '—' }));
  }

  /** W4 — estado de compras por día (pendiente / confirmado / rechazado). */
  async comprasDiarias(desde?: string, hasta?: string) {
    const rango = rangoFechas(desde, hasta)!;
    const filas = await this.prisma.$queryRaw<
      Array<{ dia: string; estado: string; n: number }>
    >(Prisma.sql`
      SELECT ${DashboardService.DIA_BOLIVIA} AS dia,
             estado::text AS estado,
             COUNT(*)::int AS n
      FROM compras
      WHERE "createdAt" >= ${rango.gte} AND "createdAt" <= ${rango.lte}
      GROUP BY 1, 2 ORDER BY 1
    `);
    const base = new Map<
      string,
      { dia: string; pendiente: number; confirmado: number; rechazado: number }
    >();
    for (const dia of diasEntreBolivia(rango.gte, rango.lte)) {
      base.set(dia, { dia, pendiente: 0, confirmado: 0, rechazado: 0 });
    }
    for (const f of filas) {
      const row = base.get(f.dia);
      if (
        row &&
        (f.estado === 'pendiente' ||
          f.estado === 'confirmado' ||
          f.estado === 'rechazado')
      ) {
        row[f.estado] = Number(f.n);
      }
    }
    return {
      puntos: [...base.values()],
      rango: { desde: rango.gte, hasta: rango.lte },
    };
  }

  /** W5 — incidencias de recarga por recargador (+ plata corregida a mano). */
  async incidenciasPorRecargador() {
    const agg = await this.prisma.incidenciaRecarga.groupBy({
      by: ['recargadorId', 'estado'],
      _count: { _all: true },
      _sum: { ajusteAplicado: true },
    });
    const base = new Map<
      number,
      {
        recargadorId: number;
        pendientes: number;
        resueltas: number;
        ajusteTotal: number;
      }
    >();
    for (const a of agg) {
      const row = base.get(a.recargadorId) ?? {
        recargadorId: a.recargadorId,
        pendientes: 0,
        resueltas: 0,
        ajusteTotal: 0,
      };
      if (a.estado === 'pendiente') row.pendientes += a._count._all;
      else row.resueltas += a._count._all;
      row.ajusteTotal += Number(a._sum.ajusteAplicado ?? 0);
      base.set(a.recargadorId, row);
    }
    const ids = [...base.keys()];
    const usuarios = ids.length
      ? await this.prisma.usuario.findMany({
          where: { id: { in: ids } },
          select: { id: true, nombre: true },
        })
      : [];
    const nombre = new Map(usuarios.map((u) => [u.id, u.nombre]));
    return [...base.values()]
      .map((r) => ({
        ...r,
        nombre: nombre.get(r.recargadorId) ?? `#${r.recargadorId}`,
      }))
      .sort(
        (a, b) => b.pendientes + b.resueltas - (a.pendientes + a.resueltas),
      );
  }
}
