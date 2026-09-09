import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Query } from '@nestjs/common';
import { Publico } from '../../common/decorators/publico.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { ProductosService } from './productos.service';
import { EstadoProductoDto } from './dto/actualizar-producto.dto';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  /** Catálogo de un puesto (base + estado del evento) aplanado. */
  @Get()
  @Publico()
  listar(@Query('puestoId') puestoId?: string) {
    return this.productosService.listar(puestoId);
  }

  /** Ajusta activo / stock / precio de un producto para ESE evento. */
  @Patch('estado')
  @Roles('UsuarioNegocio', 'Admin')
  @HttpCode(HttpStatus.OK)
  actualizarEstado(
    @Body() dto: EstadoProductoDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.productosService.actualizarEstado(dto, actor);
  }
}
