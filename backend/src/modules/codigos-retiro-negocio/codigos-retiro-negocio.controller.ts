import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { CodigosRetiroNegocioService } from './codigos-retiro-negocio.service';

@Controller('codigos-retiro-negocio')
export class CodigosRetiroNegocioController {
  constructor(
    private readonly codigosRetiroNegocioService: CodigosRetiroNegocioService,
  ) {}

  /** Mi código de retiro para un evento (Usuario Negocio). */
  @Get('mio')
  @Roles('UsuarioNegocio')
  mio(@UsuarioActual() actor: UsuarioJwt, @Query('eventoId') eventoId?: string) {
    return this.codigosRetiroNegocioService.mio(actor, eventoId);
  }

  /** Resuelve un código escaneado en Devoluciones. */
  @Get('buscar/:codigo')
  @Roles('Devolucion', 'Admin')
  buscar(@Param('codigo') codigo: string) {
    return this.codigosRetiroNegocioService.buscar(codigo);
  }
}
