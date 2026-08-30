import { Module } from '@nestjs/common';
import { SolicitudesEventoController } from './solicitudes-evento.controller';
import { SolicitudesEventoService } from './solicitudes-evento.service';

@Module({
  controllers: [SolicitudesEventoController],
  providers: [SolicitudesEventoService],
})
export class SolicitudesEventoModule {}
