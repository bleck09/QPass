import { Module } from '@nestjs/common';
import { TransaccionesController } from './transacciones.controller';
import { TransaccionesService } from './transacciones.service';

@Module({
  controllers: [TransaccionesController],
  providers: [TransaccionesService],
  // Lo usan VentasModule (registrarVenta) e IncidenciasRecargaModule (ajustar).
  exports: [TransaccionesService],
})
export class TransaccionesModule {}
