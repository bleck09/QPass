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
import { ContextoAlertaManilla } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { VerificarDuplicadoDto } from '../casos-duplicado/dto/casos-duplicado.dto';
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

  // Debe declararse ANTES de @Get(':id') para que "mias" no matchee como id.
  @Get('mias')
  mias(@UsuarioActual('id') usuarioId: number) {
    return this.entradasService.mias(usuarioId);
  }

  // Debe declararse ANTES de @Get(':id') para que "buscar" no matchee como id.
  // `contexto`/`puestoId` solo sirven para ubicar al falso si la manilla es una
  // copia (AlertaManilla). Sin contexto se deduce del rol.
  @Get('buscar/:codigo')
  buscarPorCodigo(
    @Param('codigo') codigo: string,
    @UsuarioActual() actor: UsuarioJwt,
    @Query('contexto') contexto?: string,
    @Query('puestoId') puestoId?: string,
  ) {
    return this.entradasService.buscarPorCodigoQr(codigo, {
      actor,
      contexto: Object.values(ContextoAlertaManilla).includes(
        contexto as ContextoAlertaManilla,
      )
        ? (contexto as ContextoAlertaManilla)
        : undefined,
      puestoId: puestoId || undefined,
    });
  }

  // Escáner de "Mi Perfil" (cualquier usuario logueado, cualquier evento):
  // solo nombre + evento + tipo de entrada, sin saldo ni datos sensibles.
  // Debe declararse ANTES de @Get(':id') para que "buscar-basico" no matchee como id.
  @Get('buscar-basico/:codigo')
  buscarBasico(@Param('codigo') codigo: string) {
    return this.entradasService.buscarBasicoPorCodigoQr(codigo);
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
    return this.entradasService.vincularQr(id, dto.codigoQrId, actorId, dto.motivo);
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
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.entradasService.registrarMovimiento(id, 'ingreso', dto.foto, actor, dto.eventoId, dto.codigoQr);
  }

  @Post(':id/salida')
  @HttpCode(HttpStatus.OK)
  salida(
    @Param('id') id: string,
    @Body() dto: MovimientoDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.entradasService.registrarMovimiento(id, 'salida', dto.foto, actor, dto.eventoId, dto.codigoQr);
  }

  /** El dueño real llegó y su manilla ya figuraba adentro (copia del QR). */
  @Post(':id/verificar-duplicado')
  @Roles('Supervisor', 'Admin')
  @HttpCode(HttpStatus.OK)
  verificarDuplicado(
    @Param('id') id: string,
    @Body() dto: VerificarDuplicadoDto,
    @UsuarioActual('id') actorId: number,
  ) {
    return this.entradasService.verificarDuplicado(id, dto, actorId);
  }
}
