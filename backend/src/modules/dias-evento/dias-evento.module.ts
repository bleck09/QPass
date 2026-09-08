import { Module } from '@nestjs/common';
import { DiasEventoController } from './dias-evento.controller';
import { DiasEventoService } from './dias-evento.service';

@Module({
  controllers: [DiasEventoController],
  providers: [DiasEventoService],
  exports: [DiasEventoService],
})
export class DiasEventoModule {}
