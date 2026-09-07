import { Module } from '@nestjs/common';
import { CorteCajaController } from './corte-caja.controller';
import { CorteCajaService } from './corte-caja.service';

@Module({
  controllers: [CorteCajaController],
  providers: [CorteCajaService],
})
export class CorteCajaModule {}
