import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { DashboardNegocioService } from './dashboard-negocio.service';

/**
 * Tablero operativo del USUARIO NEGOCIO (spec §3). Scope: sus puestos en un evento.
 * El negocioId NUNCA viene del query string — es actor.id (patrón puestos.service).
 */
@Controller('dashboard/negocio')
@Roles('UsuarioNegocio')
export class DashboardNegocioController {
  constructor(private readonly dashboardNegocioService: DashboardNegocioService) {}

  @Get()
  resumen(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('eventoId') eventoId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.dashboardNegocioService.resumen(actor, eventoId, desde, hasta);
  }
}
