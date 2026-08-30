/* ============================================================================
 * src/jobs/cron/reconciliacion-saldo.cron.ts
 * Corre una vez por noche. Compara Usuario.saldo (caché) contra la suma real
 * del ledger (Transaccion) de ese usuario. Si difieren, loguea la alerta — es
 * la red de seguridad que detecta un drift antes de que un usuario lo reclame
 * (C11, checklist C20).
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Signo de cada tipo de movimiento sobre la billetera del usuarioId de la fila.
const SIGNO: Record<string, number> = {
  recarga: 1,
  venta: 1,
  ajuste: 1,
  consumo: -1,
  devolucion: -1,
};

@Injectable()
export class ReconciliacionSaldoCron {
  private readonly logger = new Logger('ReconciliacionSaldoCron');

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async ejecutar() {
    const usuarios = await this.prisma.usuario.findMany({
      select: { id: true, saldo: true },
    });

    let discrepancias = 0;
    for (const usuario of usuarios) {
      const porTipo = await this.prisma.transaccion.groupBy({
        by: ['tipo'],
        where: { usuarioId: usuario.id },
        _sum: { monto: true },
      });

      const esperado = porTipo.reduce((acc, fila) => {
        const signo = SIGNO[fila.tipo] ?? 0;
        return acc.plus(new Prisma.Decimal(fila._sum.monto ?? 0).times(signo));
      }, new Prisma.Decimal(0));

      if (!esperado.equals(usuario.saldo)) {
        discrepancias++;
        this.logger.error(
          `Drift de saldo en usuario ${usuario.id}: cache=${usuario.saldo.toString()} ledger=${esperado.toString()}`,
        );
      }
    }

    this.logger.log(
      `Reconciliación completa: ${usuarios.length} usuarios, ${discrepancias} con drift.`,
    );
  }
}
