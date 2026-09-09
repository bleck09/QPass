import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { PuestosBaseService } from './puestos-base.service';
import {
  ActualizarProductoBaseDto,
  ActualizarPuestoBaseDto,
  CrearProductoBaseDto,
  CrearPuestoBaseDto,
} from './dto/puesto-base.dto';

/** Catálogo del negocio (puestos + productos definidos una vez, reutilizables). */
@Controller('puestos-base')
@Roles('UsuarioNegocio')
export class PuestosBaseController {
  constructor(private readonly service: PuestosBaseService) {}

  @Get()
  listar(@UsuarioActual('id') negocioId: number) {
    return this.service.listar(negocioId);
  }

  @Get(':id')
  obtener(
    @UsuarioActual('id') negocioId: number,
    @Param('id') id: string,
  ) {
    return this.service.obtener(negocioId, id);
  }

  @Post()
  crear(
    @UsuarioActual('id') negocioId: number,
    @Body() dto: CrearPuestoBaseDto,
  ) {
    return this.service.crear(negocioId, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  actualizar(
    @UsuarioActual('id') negocioId: number,
    @Param('id') id: string,
    @Body() dto: ActualizarPuestoBaseDto,
  ) {
    return this.service.actualizar(negocioId, id, dto);
  }

  @Post(':id/archivar')
  @HttpCode(HttpStatus.OK)
  archivar(
    @UsuarioActual('id') negocioId: number,
    @Param('id') id: string,
  ) {
    return this.service.archivar(negocioId, id);
  }

  @Post(':id/productos')
  crearProducto(
    @UsuarioActual('id') negocioId: number,
    @Param('id') puestoBaseId: string,
    @Body() dto: CrearProductoBaseDto,
  ) {
    return this.service.crearProducto(negocioId, puestoBaseId, dto);
  }

  @Patch('productos/:id')
  @HttpCode(HttpStatus.OK)
  actualizarProducto(
    @UsuarioActual('id') negocioId: number,
    @Param('id') id: string,
    @Body() dto: ActualizarProductoBaseDto,
  ) {
    return this.service.actualizarProducto(negocioId, id, dto);
  }

  @Delete('productos/:id')
  @HttpCode(HttpStatus.OK)
  eliminarProducto(
    @UsuarioActual('id') negocioId: number,
    @Param('id') id: string,
  ) {
    return this.service.eliminarProducto(negocioId, id);
  }
}
