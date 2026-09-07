/* ============================================================================
 * src/modules/eventos/resumen-evento.service.ts
 *
 * Calcula y congela la foto de cierre de un evento (spec 5.7). Se genera al
 * archivarlo y se borra al desarchivarlo. Los dashboards leen de acá para los
 * eventos archivados y así no recalculan sobre tablas vivas.
 * ========================================================================= */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

export interface CifrasCierre {
  entradasVendidas: number;
  asistentes: number;
  recaudado: number;
  recargado: number;
  consumido: number;
  devuelto: number;
  saldoRemanente: number;
}

@Injectable()
export class ResumenEventoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Números del evento a partir de las tablas vivas. No escribe nada. */
  async calcular(eventoId: string, tx?: Prisma.TransactionClient): Promise<CifrasCierre> {
    const db: Db = tx ?? this.prisma;
    const [entradasVendidas, asistentes, recaudadoAgg, txPorTipo] =
      await Promise.all([
        db.entrada.count({
          where: { eventoId, compra: { estado: 'confirmado' } },
        }),
        db.entrada.count({
          where: { eventoId, estadoIngreso: { in: ['ingresado', 'salio'] } },
        }),
        db.compra.aggregate({
          _sum: { montoTotal: true },
          where: { eventoId, estado: 'confirmado' },
        }),
        db.transaccion.groupBy({
          by: ['tipo'],
          where: { eventoId },
          _sum: { monto: true },
        }),
      ]);

    const suma = (tipo: string) =>
      Number(txPorTipo.find((t) => t.tipo === tipo)?._sum.monto ?? 0);
    const recargado = suma('recarga');
    const consumido = suma('consumo') - suma('reverso_consumo'); // neto de ventas anuladas (§5.3)
    const devuelto = suma('devolucion');

    return {
      entradasVendidas,
      asistentes,
      recaudado: Number(recaudadoAgg._sum.montoTotal ?? 0),
      recargado,
      consumido,
      devuelto,
      saldoRemanente: recargado - consumido - devuelto,
    };
  }

  /** Calcula y persiste el snapshot (upsert). */
  async generar(eventoId: string, tx?: Prisma.TransactionClient) {
    const db: Db = tx ?? this.prisma;
    const cifras = await this.calcular(eventoId, tx);
    const datos = { ...cifras, generadoEn: new Date() };
    return db.resumenEvento.upsert({
      where: { eventoId },
      create: { eventoId, ...datos },
      update: datos,
    });
  }

  async borrar(eventoId: string, tx?: Prisma.TransactionClient) {
    const db: Db = tx ?? this.prisma;
    await db.resumenEvento.deleteMany({ where: { eventoId } });
  }
}
