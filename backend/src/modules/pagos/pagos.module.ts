import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { LibelulaModule } from './libelula.module';
import { ComprasModule } from '../compras/compras.module';

@Module({
  imports: [LibelulaModule, ComprasModule],
  controllers: [PagosController],
})
export class PagosModule {}
