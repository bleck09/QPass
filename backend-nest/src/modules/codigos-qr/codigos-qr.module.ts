import { Module } from '@nestjs/common';
import { CodigosQrController } from './codigos-qr.controller';
import { CodigosQrService } from './codigos-qr.service';

@Module({
  controllers: [CodigosQrController],
  providers: [CodigosQrService],
  exports: [CodigosQrService],
})
export class CodigosQrModule {}
