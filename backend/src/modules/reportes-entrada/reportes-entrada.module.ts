import { Module } from '@nestjs/common';
import { ReportesEntradaController } from './reportes-entrada.controller';
import { ReportesEntradaService } from './reportes-entrada.service';

@Module({
  controllers: [ReportesEntradaController],
  providers: [ReportesEntradaService],
})
export class ReportesEntradaModule {}
