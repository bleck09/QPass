import { Module } from '@nestjs/common';
import { CodigosRetiroNegocioController } from './codigos-retiro-negocio.controller';
import { CodigosRetiroNegocioService } from './codigos-retiro-negocio.service';

@Module({
  controllers: [CodigosRetiroNegocioController],
  providers: [CodigosRetiroNegocioService],
  exports: [CodigosRetiroNegocioService],
})
export class CodigosRetiroNegocioModule {}
