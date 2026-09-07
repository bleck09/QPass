import { Module } from '@nestjs/common';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { ResumenEventoService } from './resumen-evento.service';

@Module({
  controllers: [EventosController],
  providers: [EventosService, ResumenEventoService],
  exports: [EventosService, ResumenEventoService],
})
export class EventosModule {}
