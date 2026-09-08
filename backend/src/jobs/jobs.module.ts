/* ============================================================================
 * src/jobs/jobs.module.ts
 * TODO lo asíncrono del sistema vive acá (C11). Hoy: 3 crons (@nestjs/schedule,
 * sin Redis). Las colas BullMQ (correos/notificaciones) son el siguiente paso
 * — ver README y el comentario de MailService.
 * ========================================================================= */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FinalizarEventosCron } from './cron/finalizar-eventos.cron';
import { ReconciliacionSaldoCron } from './cron/reconciliacion-saldo.cron';
import { LimpiarIdempotenciaCron } from './cron/limpiar-idempotencia.cron';
import { CaducidadBilleteraCron } from './cron/caducidad-billetera.cron';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    FinalizarEventosCron,
    ReconciliacionSaldoCron,
    LimpiarIdempotenciaCron,
    CaducidadBilleteraCron,
  ],
})
export class JobsModule {}
