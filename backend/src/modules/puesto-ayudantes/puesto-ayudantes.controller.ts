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
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { PuestoAyudantesService } from './puesto-ayudantes.service';
import { CrearPuestoAyudanteDto } from './dto/crear-puesto-ayudante.dto';

@Controller('puesto-ayudantes')
export class PuestoAyudantesController {
  constructor(private readonly puestoAyudantesService: PuestoAyudantesService) {}

  @Get()
  listar(
    @Query('puestoId') puestoId?: string,
    @Query('ayudanteId') ayudanteId?: string,
  ) {
    return this.puestoAyudantesService.listar(
      puestoId,
      ayudanteId ? Number(ayudanteId) : undefined,
    );
  }

  @Post()
  @Roles('UsuarioNegocio', 'Admin')
  asignar(
    @Body() dto: CrearPuestoAyudanteDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.puestoAyudantesService.asignar(dto, actor);
  }

  @Delete(':id')
  @Roles('UsuarioNegocio', 'Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  quitar(@Param('id') id: string) {
    return this.puestoAyudantesService.quitar(id);
  }
}
