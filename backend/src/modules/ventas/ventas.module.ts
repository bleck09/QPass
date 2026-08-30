import { Module } from '@nestjs/common';
import { TransaccionesModule } from '../transacciones/transacciones.module';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [TransaccionesModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
