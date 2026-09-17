import { Module } from '@nestjs/common';
import { CodigosQrModule } from '../codigos-qr/codigos-qr.module';
import { CasosDuplicadoController } from './casos-duplicado.controller';
import { CasosDuplicadoService } from './casos-duplicado.service';

@Module({
  imports: [CodigosQrModule],
  controllers: [CasosDuplicadoController],
  providers: [CasosDuplicadoService],
  // Lo usan Entradas, Transacciones y Ventas para frenar el escaneo de una copia
  // (asegurarManillaUsable). Este módulo NO importa ninguno de ellos.
  exports: [CasosDuplicadoService],
})
export class CasosDuplicadoModule {}
