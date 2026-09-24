/* ============================================================================
 * src/modules/pagos/pagos.controller.ts
 *
 * Webhook público de Libélula ("PAGO EXITOSO", ver Libelula guia.pdf §2/§3).
 * Libélula NO firma este callback, así que nunca se confía en él solo: antes
 * de confirmar cualquier Compra se vuelve a preguntar a Libélula
 * (server-to-server, con el appkey) si esa deuda realmente quedó pagada.
 * ========================================================================= */

import { Controller, Get, Logger, Query } from '@nestjs/common';
import { Publico } from '../../common/decorators/publico.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ComprasService } from '../compras/compras.service';
import { LibelulaService } from './libelula.service';

@Controller('pagos/libelula')
export class PagosController {
  private readonly logger = new Logger('PagosLibelula');

  constructor(
    private readonly prisma: PrismaService,
    private readonly libelula: LibelulaService,
    private readonly compras: ComprasService,
  ) {}

  @Get('callback')
  @Publico()
  async callback(@Query('transaction_id') transactionId?: string) {
    if (!transactionId) {
      this.logger.warn('Callback de Libélula sin transaction_id');
      return { ok: false };
    }

    const compra = await this.prisma.compra.findFirst({
      where: { libelulaIdTransaccion: transactionId, metodoPago: 'libelula' },
    });
    if (!compra) {
      this.logger.warn(
        `Callback de Libélula: no existe Compra con transaction_id=${transactionId}`,
      );
      return { ok: false };
    }
    if (compra.estado !== 'pendiente') {
      // Ya confirmada (posible reintento del callback) — idempotente.
      return { ok: true };
    }

    // Verificación server-to-server: nunca se confirma solo por el GET del
    // callback, porque no viene firmado.
    const verificacion = await this.libelula.consultarDeudaPorIdentificador(compra.id);
    if (!verificacion.encontrada || !verificacion.pagado) {
      this.logger.warn(
        `Callback de Libélula para Compra ${compra.id}, pero la verificación server-to-server no confirma el pago`,
      );
      return { ok: false };
    }

    await this.compras.confirmarPagoLibelula(compra.id, {
      formaPago: verificacion.formaPago,
      codigoRecaudacion: verificacion.codigoRecaudacion,
    });

    return { ok: true };
  }
}
