import { Module } from '@nestjs/common';
import { TransaccionesModule } from '../transacciones/transacciones.module';
import { IncidenciasRecargaController } from './incidencias-recarga.controller';
import { IncidenciasRecargaService } from './incidencias-recarga.service';

@Module({
  imports: [TransaccionesModule],
  controllers: [IncidenciasRecargaController],
  providers: [IncidenciasRecargaService],
})
export class IncidenciasRecargaModule {}
