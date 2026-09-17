import { Module } from '@nestjs/common';
import { CasosDuplicadoModule } from '../casos-duplicado/casos-duplicado.module';
import { EntradasController } from './entradas.controller';
import { EntradasService } from './entradas.service';

@Module({
  imports: [CasosDuplicadoModule],
  controllers: [EntradasController],
  providers: [EntradasService],
  exports: [EntradasService],
})
export class EntradasModule {}
