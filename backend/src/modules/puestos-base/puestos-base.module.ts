import { Module } from '@nestjs/common';
import { PuestosBaseController } from './puestos-base.controller';
import { PuestosBaseService } from './puestos-base.service';

@Module({
  controllers: [PuestosBaseController],
  providers: [PuestosBaseService],
  exports: [PuestosBaseService],
})
export class PuestosBaseModule {}
