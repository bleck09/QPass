import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { CodigosQrModule } from '../codigos-qr/codigos-qr.module';
import { LibelulaModule } from '../pagos/libelula.module';

@Module({
  imports: [CodigosQrModule, LibelulaModule],
  controllers: [ComprasController],
  providers: [ComprasService],
  exports: [ComprasService],
})
export class ComprasModule {}
