import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { DashboardClienteService } from './dashboard-cliente.service';

/**
 * Tablero de evento para el CLIENTE organizador (spec §2). Agregados sin datos
 * personales de asistentes. Scope: eventos donde Evento.clienteId === actor.id.
 */
@Controller('dashboard/cliente')
@Roles('Cliente')
export class DashboardClienteController {
  constructor(
    private readonly dashboardClienteService: DashboardClienteService,
  ) {}

  /** Sus eventos como organizador. */
  @Get('eventos')
  eventos(@UsuarioActual() actor: UsuarioJwt) {
    return this.dashboardClienteService.eventos(actor);
  }

  /** Resumen de un evento suyo (403 si no lo es). */
  @Get('evento/:id')
  resumen(@UsuarioActual() actor: UsuarioJwt, @Param('id') eventoId: string) {
    return this.dashboardClienteService.resumen(actor, eventoId);
  }
}
