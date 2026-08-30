import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Idempotente } from '../../common/decorators/idempotente.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { VentasService } from './ventas.service';
import { CrearVentaDto } from './dto/crear-venta.dto';

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
}
