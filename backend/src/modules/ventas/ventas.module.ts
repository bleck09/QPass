import { Module } from '@nestjs/common';
import { TransaccionesModule } from '../transacciones/transacciones.module';
import { CasosDuplicadoModule } from '../casos-duplicado/casos-duplicado.module';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [TransaccionesModule, CasosDuplicadoModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
