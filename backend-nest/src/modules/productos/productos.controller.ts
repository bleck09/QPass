import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Publico } from '../../common/decorators/publico.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductosService } from './productos.service';
import { CrearProductoDto } from './dto/crear-producto.dto';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  @Publico()
  listar(@Query('puestoId') puestoId?: string) {
    return this.productosService.listar(puestoId);
  }

  @Post()
  @Roles('UsuarioNegocio', 'Admin')
  crear(@Body() dto: CrearProductoDto) {
    return this.productosService.crear(dto);
  }

  @Delete(':id')
  @Roles('UsuarioNegocio', 'Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.productosService.eliminar(id);
  }
}
