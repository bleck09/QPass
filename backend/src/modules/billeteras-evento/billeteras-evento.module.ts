import { Module } from '@nestjs/common';
import { BilleterasEventoController } from './billeteras-evento.controller';
import { BilleterasEventoService } from './billeteras-evento.service';

@Module({
  controllers: [BilleterasEventoController],
  providers: [BilleterasEventoService],
  exports: [BilleterasEventoService],
})
export class BilleterasEventoModule {}
