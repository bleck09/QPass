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
import { EstadoSolicitudEvento } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { SolicitudesEventoService } from './solicitudes-evento.service';
import {
  ActualizarSolicitudEventoDto,
  CrearSolicitudEventoDto,
  PedirCambiosDto,
  RechazarDto,
} from './dto/solicitudes-evento.dto';

@Controller('solicitudes-evento')
export class SolicitudesEventoController {
  constructor(
    private readonly solicitudesEventoService: SolicitudesEventoService,
  ) {}

  @Get()
  @Roles('Admin', 'Cliente')
  listar(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('estado') estado?: EstadoSolicitudEvento,
  ) {
    return this.solicitudesEventoService.listar(actor, estado);
  }

  @Get(':id')
  @Roles('Admin', 'Cliente')
  obtenerPorId(@Param('id') id: string, @UsuarioActual() actor: UsuarioJwt) {
    return this.solicitudesEventoService.obtenerPorId(id, actor);
  }

  // Chequeos previos a decidir (choque de fechas, historial del cliente).
  @Get(':id/revision')
  @Roles('Admin')
  revision(@Param('id') id: string) {
    return this.solicitudesEventoService.revision(id);
  }

  @Post()
  @Roles('Cliente')
  crear(
    @Body() dto: CrearSolicitudEventoDto,
    @UsuarioActual('id') clienteId: number,
  ) {
    return this.solicitudesEventoService.crear(dto, clienteId);
  }

  @Patch(':id')
  @Roles('Cliente')
  @HttpCode(HttpStatus.OK)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarSolicitudEventoDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.solicitudesEventoService.actualizar(id, dto, actor);
  }

  @Post(':id/aprobar')
  @Roles('Admin')
  aprobar(@Param('id') id: string, @UsuarioActual('id') adminId: number) {
    return this.solicitudesEventoService.aprobar(id, adminId);
  }

  @Post(':id/rechazar')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  rechazar(
    @Param('id') id: string,
    @Body() dto: RechazarDto,
    @UsuarioActual('id') adminId: number,
  ) {
    return this.solicitudesEventoService.rechazar(id, dto.motivoRechazo, adminId);
  }

  @Post(':id/pedir-cambios')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  pedirCambios(
    @Param('id') id: string,
    @Body() dto: PedirCambiosDto,
    @UsuarioActual('id') adminId: number,
  ) {
    return this.solicitudesEventoService.pedirCambios(id, dto.comentario, adminId);
  }
}
