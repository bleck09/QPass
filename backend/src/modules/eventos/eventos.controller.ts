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
} from '@nestjs/common';
import { Publico } from '../../common/decorators/publico.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { EventosService } from './eventos.service';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { ActualizarEventoDto } from './dto/actualizar-evento.dto';
import { ActualizarContornoDto } from './dto/actualizar-contorno.dto';

@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  @Publico()
  listar() {
    return this.eventosService.listar();
  }

  // Antes de ':id' a propósito: si no, "todos" se interpretaría como un id.
  @Get('todos')
  @Roles('Admin')
  listarTodos() {
    return this.eventosService.listarTodos();
  }

  @Get(':id')
  @Publico()
  obtenerPorId(@Param('id') id: string) {
    return this.eventosService.obtenerPorId(id);
  }

  // Igual que obtenerPorId, pero sin filtrar por publicado — para pantallas
  // de Admin (ej. Mapa.jsx) que necesitan ver un evento puntual aunque
  // todavía esté en borrador.
  @Get(':id/admin')
  @Roles('Admin')
  obtenerPorIdAdmin(@Param('id') id: string) {
    return this.eventosService.obtenerPorIdAdmin(id);
  }

  @Get(':id/progreso')
  @Roles('Admin')
  progreso(@Param('id') id: string) {
    return this.eventosService.progreso(id);
  }

  @Post()
  @Roles('Admin')
  crear(@Body() dto: CrearEventoDto, @UsuarioActual('id') usuarioId: number) {
    return this.eventosService.crear(dto, usuarioId);
  }

  @Patch(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarEventoDto,
    @UsuarioActual('id') adminId: number,
  ) {
    return this.eventosService.actualizar(id, dto, adminId);
  }

  @Patch(':id/contorno')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  actualizarContorno(
    @Param('id') id: string,
    @Body() dto: ActualizarContornoDto,
    @UsuarioActual('id') adminId: number,
  ) {
    return this.eventosService.actualizarContorno(id, dto.contorno, adminId);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  eliminar(@Param('id') id: string, @UsuarioActual('id') adminId: number) {
    return this.eventosService.eliminar(id, adminId);
  }

  @Post(':id/cerrar')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  cerrar(@Param('id') id: string, @UsuarioActual('id') adminId: number) {
    return this.eventosService.cerrar(id, adminId);
  }

  @Post(':id/archivar')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  archivar(@Param('id') id: string, @UsuarioActual('id') adminId: number) {
    return this.eventosService.archivar(id, adminId);
  }

  @Post(':id/desarchivar')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  desarchivar(@Param('id') id: string, @UsuarioActual('id') adminId: number) {
    return this.eventosService.desarchivar(id, adminId);
  }

  @Post(':id/publicar')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  publicar(@Param('id') id: string, @UsuarioActual('id') adminId: number) {
    return this.eventosService.publicar(id, adminId);
  }

  @Post(':id/despublicar')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  despublicar(@Param('id') id: string, @UsuarioActual('id') adminId: number) {
    return this.eventosService.despublicar(id, adminId);
  }
}
