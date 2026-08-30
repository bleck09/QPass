/* ============================================================================
 * src/jobs/cron/finalizar-eventos.cron.ts
 * Corre cada minuto. Pasa a "finalizado" cualquier Evento cuya fechaFin ya
 * pasó. Ver el comentario del modelo Evento en schema.prisma. Este cron existe
 * porque NINGÚN request HTTP dispara ese cambio (C11).
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinalizarEventosCron {
  private readonly logger = new Logger('FinalizarEventosCron');

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async ejecutar() {
    const { count } = await this.prisma.evento.updateMany({
      where: { estado: 'activo', fechaFin: { lt: new Date() } },
      data: { estado: 'finalizado' },
    });
    if (count > 0) {
      this.logger.log(`${count} evento(s) pasaron a finalizado.`);
    }
  }
}
