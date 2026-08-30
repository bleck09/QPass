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
import { Publico } from '../../common/decorators/publico.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { PuestosService } from './puestos.service';
import { CrearPuestoDto } from './dto/crear-puesto.dto';
import { ActualizarPuestoDto } from './dto/actualizar-puesto.dto';

@Controller('puestos')
export class PuestosController {
  constructor(private readonly puestosService: PuestosService) {}

  @Get()
  @Publico()
  listar(
    @Query('eventoId') eventoId?: string,
    @Query('negocioId') negocioId?: string,
  ) {
    return this.puestosService.listar(
      eventoId,
      negocioId ? Number(negocioId) : undefined,
    );
  }

  @Post()
  @Roles('UsuarioNegocio', 'Admin')
  crear(@Body() dto: CrearPuestoDto, @UsuarioActual() actor: UsuarioJwt) {
    return this.puestosService.crear(dto, actor);
  }

  @Patch(':id')
  @Roles('UsuarioNegocio', 'Admin')
  @HttpCode(HttpStatus.OK)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarPuestoDto) {
    return this.puestosService.actualizar(id, dto);
  }
}
