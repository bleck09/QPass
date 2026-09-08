import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { BilleterasEventoService } from './billeteras-evento.service';

@Controller('billeteras-evento')
export class BilleterasEventoController {
  constructor(
    private readonly billeterasEventoService: BilleterasEventoService,
  ) {}

  /** Mis billeteras, una por evento. Cualquier usuario autenticado. */
  @Get('mias')
  mias(@UsuarioActual('id') usuarioId: number) {
    return this.billeterasEventoService.mias(usuarioId);
  }

  /** Billeteras de un evento (para el retiro de Devolución / vista de Admin). */
  @Get()
  @Roles('Admin', 'Devolucion', 'Recargador')
  porEvento(@Query('eventoId') eventoId?: string) {
    return this.billeterasEventoService.porEvento(eventoId);
  }
}
