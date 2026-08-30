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
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { EntradasService } from './entradas.service';
import { AnularQrDto, MovimientoDto, VincularQrDto } from './dto/entradas.dto';

@Controller('entradas')
export class EntradasController {
  constructor(private readonly entradasService: EntradasService) {}

  @Get()
  listar(
    @Query('eventoId') eventoId?: string,
    @Query('estadoIngreso') estadoIngreso?: string,
  ) {
    return this.entradasService.listar(eventoId, estadoIngreso);
  }

  // Debe declararse ANTES de @Get(':id') para que "buscar" no matchee como id.
  @Get('buscar/:codigo')
  buscarPorCodigo(@Param('codigo') codigo: string) {
    return this.entradasService.buscarPorCodigoQr(codigo);
  }

  @Get(':id')
  obtenerPorId(@Param('id') id: string) {
    return this.entradasService.obtenerPorId(id);
  }

  @Get(':id/registros')
  registros(@Param('id') id: string) {
    return this.entradasService.registros(id);
  }

  @Post(':id/vincular-qr')
  @HttpCode(HttpStatus.OK)
  vincularQr(
    @Param('id') id: string,
    @Body() dto: VincularQrDto,
    @UsuarioActual('id') actorId: number,
  ) {
    return this.entradasService.vincularQr(id, dto.codigoQrId, actorId);
  }

  @Post(':id/anular-qr')
  @HttpCode(HttpStatus.NO_CONTENT)
  anularQr(
    @Param('id') id: string,
    @Body() dto: AnularQrDto,
    @UsuarioActual('id') actorId: number,
  ) {
    return this.entradasService.anularQr(id, dto.motivo, actorId);
  }

  @Post(':id/ingreso')
  @HttpCode(HttpStatus.OK)
  ingreso(
    @Param('id') id: string,
    @Body() dto: MovimientoDto,
    @UsuarioActual('id') actorId: number,
  ) {
    return this.entradasService.registrarMovimiento(id, 'ingreso', dto.foto, actorId);
  }

  @Post(':id/salida')
  @HttpCode(HttpStatus.OK)
  salida(
    @Param('id') id: string,
    @Body() dto: MovimientoDto,
    @UsuarioActual('id') actorId: number,
  ) {
    return this.entradasService.registrarMovimiento(id, 'salida', dto.foto, actorId);
  }
}
