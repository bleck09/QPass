import { Module } from '@nestjs/common';
import { AsignacionesController } from './asignaciones.controller';
import { AsignacionesService } from './asignaciones.service';
import { CodigosRetiroNegocioModule } from '../codigos-retiro-negocio/codigos-retiro-negocio.module';

@Module({
  imports: [CodigosRetiroNegocioModule],
  controllers: [AsignacionesController],
  providers: [AsignacionesService],
})
export class AsignacionesModule {}
