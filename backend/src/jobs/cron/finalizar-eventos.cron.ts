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
    const vencidos = await this.prisma.evento.findMany({
      where: { estado: 'activo', fechaFin: { lt: new Date() } },
      select: { id: true },
    });
    if (vencidos.length === 0) return;
    const ids = vencidos.map((e) => e.id);
    await this.prisma.$transaction([
      this.prisma.evento.updateMany({
        where: { id: { in: ids }, estado: 'activo' },
        data: { estado: 'finalizado' },
      }),
      // Manillas vigentes -> cerrada (siguen sirviendo para la devolución). Las
      // en_alerta NO se tocan: la copia de un duplicado sigue bloqueada y avisando.
      this.prisma.codigoQr.updateMany({
        where: { eventoId: { in: ids }, estado: 'activa' },
        data: { estado: 'cerrada' },
      }),
    ]);
    this.logger.log(`${ids.length} evento(s) pasaron a finalizado.`);
  }
}
