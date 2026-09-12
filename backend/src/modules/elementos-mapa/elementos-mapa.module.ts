import { Module } from '@nestjs/common';
import { ElementosMapaController } from './elementos-mapa.controller';
import { ElementosMapaService } from './elementos-mapa.service';

@Module({
  controllers: [ElementosMapaController],
  providers: [ElementosMapaService],
  exports: [ElementosMapaService],
})
export class ElementosMapaModule {}
