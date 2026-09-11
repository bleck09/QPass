import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { CodigosQrModule } from '../codigos-qr/codigos-qr.module';

@Module({
  imports: [CodigosQrModule],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
