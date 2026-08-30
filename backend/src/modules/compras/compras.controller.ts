import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
} from '../../common/decorators/usuario-actual.decorator';
import { ComprasService } from './compras.service';
import {
  CorregirEntradasDto,
  CrearCompraDto,
  RechazarCompraDto,
} from './dto/compras.dto';

@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  crear(@Body() dto: CrearCompraDto, @UsuarioActual('id') compradorId: number) {
    return this.comprasService.crear(dto, compradorId);
  }

  @Get('mias')
  mias(@UsuarioActual('id') compradorId: number) {
    return this.comprasService.mias(compradorId);
  }

  @Get()
  @Roles('Admin', 'Cliente')
  listar(@Query('eventoId') eventoId?: string) {
    return this.comprasService.listar(eventoId);
  }

  @Patch(':id/entradas')
  @HttpCode(HttpStatus.OK)
  corregirEntradas(
    @Param('id') id: string,
    @Body() dto: CorregirEntradasDto,
    @UsuarioActual('id') actorId: number,
  ) {
    return this.comprasService.corregirEntradas(id, dto, actorId);
  }

  @Post(':id/aprobar')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  aprobar(@Param('id') id: string, @UsuarioActual('id') adminId: number) {
    return this.comprasService.aprobar(id, adminId);
  }

  @Post(':id/rechazar')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  rechazar(
    @Param('id') id: string,
    @Body() dto: RechazarCompraDto,
    @UsuarioActual('id') adminId: number,
  ) {
    return this.comprasService.rechazar(id, dto.motivoRechazo, adminId);
  }
}
