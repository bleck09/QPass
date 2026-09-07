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
import { VentasService } from './ventas.service';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Get()
  listar(
    @Query('puestoId') puestoId?: string,
    @Query('entradaId') entradaId?: string,
    @Query('eventoId') eventoId?: string,
  ) {
    return this.ventasService.listar({ puestoId, entradaId, eventoId });
  }

  @Post()
  @Roles('Ayudante')
  @Idempotente()
  crear(@Body() dto: CrearVentaDto, @UsuarioActual('id') ayudanteId: number) {
    return this.ventasService.crear(dto, ayudanteId);
  }

  /** Anular una venta (§5.3): Admin o el Usuario Negocio dueño del puesto. */
  @Post(':id/anular')
  @Roles('Admin', 'UsuarioNegocio')
  @Idempotente()
  @HttpCode(HttpStatus.OK)
  anular(
    @Param('id') id: string,
    @Body() dto: AnularVentaDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.ventasService.anular(id, dto.motivo, actor);
  }
}
