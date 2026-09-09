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
  Query,
} from '@nestjs/common';
import { Publico } from '../../common/decorators/publico.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { PuestosService } from './puestos.service';
import { ActivarPuestoDto } from './dto/crear-puesto.dto';
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

  /** Todos mis puestos (de todos mis eventos). */
  @Get('mios')
  @Roles('UsuarioNegocio')
  mios(@UsuarioActual('id') negocioId: number) {
    return this.puestosService.mios(negocioId);
  }

  /** Activa un PuestoBase del catálogo del negocio en un evento. */
  @Post()
  @Roles('UsuarioNegocio', 'Admin')
  crear(@Body() dto: ActivarPuestoDto, @UsuarioActual() actor: UsuarioJwt) {
    return this.puestosService.crear(dto, actor);
  }

  @Patch(':id')
  @Roles('UsuarioNegocio', 'Admin')
  @HttpCode(HttpStatus.OK)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarPuestoDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.puestosService.actualizar(id, dto, actor);
  }

  @Delete(':id')
  @Roles('UsuarioNegocio', 'Admin')
  @HttpCode(HttpStatus.OK)
  desactivar(@Param('id') id: string, @UsuarioActual() actor: UsuarioJwt) {
    return this.puestosService.desactivar(id, actor);
  }
}
