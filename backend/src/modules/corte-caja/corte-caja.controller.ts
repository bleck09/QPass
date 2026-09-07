import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Idempotente } from '../../common/decorators/idempotente.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { CorteCajaService } from './corte-caja.service';
import { AbrirCajaDto, CerrarCajaDto } from './dto/corte-caja.dto';

@Controller('cortes-caja')
export class CorteCajaController {
  constructor(private readonly corteCajaService: CorteCajaService) {}

  @Post('abrir')
  @Roles('Recargador', 'Devolucion', 'Admin')
  abrir(@UsuarioActual() actor: UsuarioJwt, @Body() dto: AbrirCajaDto) {
    return this.corteCajaService.abrir(actor, dto);
  }

  /** Caja abierta del actor para un evento (con esperado parcial en vivo), o null. */
  @Get('actual')
  @Roles('Recargador', 'Devolucion')
  actual(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('eventoId') eventoId?: string,
  ) {
    return this.corteCajaService.actual(actor, eventoId);
  }

  /** Historial. No-Admin ve solo sus cajas. */
  @Get()
  @Roles('Recargador', 'Devolucion', 'Admin')
  listar(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('eventoId') eventoId?: string,
  ) {
    return this.corteCajaService.listar(actor, eventoId);
  }

  @Post(':id/cerrar')
  @Roles('Recargador', 'Devolucion', 'Admin')
  @Idempotente()
  @HttpCode(HttpStatus.OK)
  cerrar(
    @UsuarioActual() actor: UsuarioJwt,
    @Param('id') id: string,
    @Body() dto: CerrarCajaDto,
  ) {
    return this.corteCajaService.cerrar(actor, id, dto);
  }
}
