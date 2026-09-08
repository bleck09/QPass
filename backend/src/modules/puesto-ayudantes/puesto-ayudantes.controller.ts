import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
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
import {
  EditarAyudanteDto,
  ResetPasswordAyudanteDto,
} from './dto/ayudante.dto';

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

  /** Todos MIS ayudantes (por negocioAsignadoId), con o sin puesto. */
  @Get('mis-ayudantes')
  @Roles('UsuarioNegocio')
  misAyudantes(@UsuarioActual('id') negocioId: number) {
    return this.puestoAyudantesService.misAyudantes(negocioId);
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

  @Patch('ayudante/:id')
  @Roles('UsuarioNegocio')
  @HttpCode(HttpStatus.OK)
  editarAyudante(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarAyudanteDto,
    @UsuarioActual('id') negocioId: number,
  ) {
    return this.puestoAyudantesService.editarAyudante(id, negocioId, dto);
  }

  @Post('ayudante/:id/reset-password')
  @Roles('UsuarioNegocio')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPasswordAyudante(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordAyudanteDto,
    @UsuarioActual('id') negocioId: number,
  ) {
    return this.puestoAyudantesService.resetPasswordAyudante(id, negocioId, dto);
  }

  @Post('ayudante/:id/desvincular')
  @Roles('UsuarioNegocio')
  @HttpCode(HttpStatus.NO_CONTENT)
  desvincularAyudante(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual('id') negocioId: number,
  ) {
    return this.puestoAyudantesService.desvincularAyudante(id, negocioId);
  }
}
