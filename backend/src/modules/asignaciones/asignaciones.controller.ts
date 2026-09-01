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
import { Rol } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AsignacionesService } from './asignaciones.service';
import { CrearAsignacionDto } from './dto/crear-asignacion.dto';

@Controller('asignaciones')
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Get()
  listar(
    @Query('eventoId') eventoId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('rol') rol?: string,
  ) {
    const usuarioIdNum = usuarioId ? Number(usuarioId) : undefined;
    return this.asignacionesService.listar(
      eventoId || undefined,
      Number.isNaN(usuarioIdNum) ? undefined : usuarioIdNum,
      (rol as Rol) || undefined,
    );
  }

  @Post()
  @Roles('Admin')
  asignar(@Body() dto: CrearAsignacionDto) {
    return this.asignacionesService.asignar(dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  quitar(@Param('id') id: string) {
    return this.asignacionesService.quitar(id);
  }
}
