/* ============================================================================
 * src/jobs/cron/limpiar-idempotencia.cron.ts
 * Borra las filas de SolicitudIdempotente viejas. No hace falta guardarlas para
 * siempre: con 48hs alcanza para cubrir reintentos de red reales (C10).
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

const HORAS_RETENCION = 48;

@Injectable()
export class LimpiarIdempotenciaCron {
  private readonly logger = new Logger('LimpiarIdempotenciaCron');

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async ejecutar() {
    const limite = new Date(Date.now() - HORAS_RETENCION * 60 * 60 * 1000);
    const { count } = await this.prisma.solicitudIdempotente.deleteMany({
      where: { createdAt: { lt: limite } },
    });
    if (count > 0) {
      this.logger.log(`${count} clave(s) de idempotencia vencidas eliminadas.`);
    }
  }
}
