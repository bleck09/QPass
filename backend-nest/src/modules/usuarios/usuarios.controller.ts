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
import { Rol } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { UsuariosService } from './usuarios.service';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles('Admin', 'Cliente', 'Devolucion')
  listar(@Query('rol') rol?: Rol) {
    return this.usuariosService.listar(rol);
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.usuariosService.actualizar(id, dto, actor);
  }

  @Post(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  cambiarPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarPasswordDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.usuariosService.cambiarPassword(id, dto, actor);
  }

  @Get(':id/cambios-password')
  historialPassword(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.usuariosService.historialPassword(id, actor);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.eliminar(id);
  }
}
