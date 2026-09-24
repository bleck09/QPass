import { Module } from '@nestjs/common';
import { LibelulaService } from './libelula.service';

@Module({
  providers: [LibelulaService],
  exports: [LibelulaService],
})
export class LibelulaModule {}
