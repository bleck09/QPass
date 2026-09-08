/* ============================================================================
 * src/jobs/cron/reconciliacion-saldo.cron.ts
 * Corre una vez por noche. Compara BilleteraEvento.saldo (caché por usuario y
 * evento) contra la suma real del ledger (Transaccion) de ese par. Si difieren,
 * loguea la alerta — es la red de seguridad que detecta un drift antes de que
 * alguien lo reclame (C11, checklist C20).
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Signo de cada tipo de movimiento sobre la billetera del (usuarioId, eventoId) de la fila.
const SIGNO: Record<string, number> = {
  recarga: 1,
  venta: 1,
  ajuste: 1,
  reverso_consumo: 1, // reintegra saldo al comprador
  consumo: -1,
  devolucion: -1,
  reverso_venta: -1, // se lo quita al negocio
};

@Injectable()
export class ReconciliacionSaldoCron {
  private readonly logger = new Logger('ReconciliacionSaldoCron');

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async ejecutar() {
    const [billeteras, porPar] = await Promise.all([
      this.prisma.billeteraEvento.findMany({
        select: { usuarioId: true, eventoId: true, saldo: true },
      }),
      this.prisma.transaccion.groupBy({
        by: ['usuarioId', 'eventoId', 'tipo'],
        _sum: { monto: true },
      }),
    ]);

    // (usuarioId|eventoId) -> saldo esperado según el ledger.
    const esperadoPorPar = new Map<string, Prisma.Decimal>();
    for (const fila of porPar) {
      const clave = `${fila.usuarioId}|${fila.eventoId}`;
      const signo = SIGNO[fila.tipo] ?? 0;
      const delta = new Prisma.Decimal(fila._sum.monto ?? 0).times(signo);
      esperadoPorPar.set(
        clave,
        (esperadoPorPar.get(clave) ?? new Prisma.Decimal(0)).plus(delta),
      );
    }

    let discrepancias = 0;
    const vistos = new Set<string>();
    for (const b of billeteras) {
      const clave = `${b.usuarioId}|${b.eventoId}`;
      vistos.add(clave);
      const esperado = esperadoPorPar.get(clave) ?? new Prisma.Decimal(0);
      if (!esperado.equals(b.saldo)) {
        discrepancias++;
        this.logger.error(
          `Drift de saldo evento ${b.eventoId} usuario ${b.usuarioId}: ` +
            `cache=${b.saldo.toString()} ledger=${esperado.toString()}`,
        );
      }
    }
    // Ledger con movimiento pero sin fila de billetera (no debería pasar).
    for (const [clave, esperado] of esperadoPorPar) {
      if (!vistos.has(clave) && !esperado.equals(0)) {
        discrepancias++;
        const [u, e] = clave.split('|');
        this.logger.error(
          `Ledger sin billetera: evento ${e} usuario ${u} tiene ${esperado.toString()} en el ledger y ninguna fila.`,
        );
      }
    }

    this.logger.log(
      `Reconciliación completa: ${billeteras.length} billeteras, ${discrepancias} con drift.`,
    );
  }
}
