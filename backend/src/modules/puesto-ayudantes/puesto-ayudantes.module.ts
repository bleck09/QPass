import { Module } from '@nestjs/common';
import { PuestoAyudantesController } from './puesto-ayudantes.controller';
import { PuestoAyudantesService } from './puesto-ayudantes.service';

@Module({
  controllers: [PuestoAyudantesController],
  providers: [PuestoAyudantesService],
})
export class PuestoAyudantesModule {}
