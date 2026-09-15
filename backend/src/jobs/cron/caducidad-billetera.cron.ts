/* ============================================================================
 * src/jobs/cron/caducidad-billetera.cron.ts
 * Fija (y refresca) BilleteraEvento.expiraEn = Evento.fechaFin +
 * Evento.diasParaRetiro días, para toda billetera de un evento que ya terminó.
 * Pasado ese instante la Devolución bloquea el retiro (ver
 * TransaccionesService.devolver). Recalcula siempre, así un cambio de
 * diasParaRetiro también se refleja.
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CaducidadBilleteraCron {
  private readonly logger = new Logger('CaducidadBilleteraCron');

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async ejecutar() {
    const filas = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "billeteras_evento" b
      SET "expiraEn" = e."fechaFin" + (e."diasParaRetiro" || ' days')::interval,
          "updatedAt" = CURRENT_TIMESTAMP
      FROM "eventos" e
      WHERE b."eventoId" = e."id" AND e."fechaFin" < now()
    `);
    if (filas > 0) {
      this.logger.log(`Plazo de retiro fijado/actualizado en ${filas} billetera(s).`);
    }
  }
}
