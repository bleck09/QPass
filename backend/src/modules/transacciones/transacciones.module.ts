import { Module } from '@nestjs/common';
import { CasosDuplicadoModule } from '../casos-duplicado/casos-duplicado.module';
import { TransaccionesController } from './transacciones.controller';
import { TransaccionesService } from './transacciones.service';

@Module({
  imports: [CasosDuplicadoModule],
  controllers: [TransaccionesController],
  providers: [TransaccionesService],
  // Lo usan VentasModule (registrarVenta) e IncidenciasRecargaModule (ajustar).
  exports: [TransaccionesService],
})
export class TransaccionesModule {}
