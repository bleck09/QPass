import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { EstadoCaso } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { IncidenciasRecargaService } from './incidencias-recarga.service';
import {
  CrearIncidenciaRecargaDto,
  ResolverIncidenciaRecargaDto,
} from './dto/incidencias-recarga.dto';

@Controller('incidencias')
export class IncidenciasRecargaController {
  constructor(
    private readonly incidenciasRecargaService: IncidenciasRecargaService,
  ) {}

  @Get()
  @Roles('Admin', 'Recargador', 'Cliente')
  listar(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('estado') estado?: EstadoCaso,
    @Query('eventoId') eventoId?: string,
  ) {
    return this.incidenciasRecargaService.listar(actor, { estado, eventoId });
  }

  @Post()
  @Roles('Recargador')
  crear(
    @Body() dto: CrearIncidenciaRecargaDto,
    @UsuarioActual('id') recargadorId: number,
  ) {
    return this.incidenciasRecargaService.crear(dto, recargadorId);
  }

  @Post(':id/resolver')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  resolver(
    @Param('id') id: string,
    @Body() dto: ResolverIncidenciaRecargaDto,
    @UsuarioActual('id') adminId: number,
  ) {
    return this.incidenciasRecargaService.resolver(id, dto, adminId);
  }
}
