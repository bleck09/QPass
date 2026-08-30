import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Idempotente } from '../../common/decorators/idempotente.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { TransaccionesService } from './transacciones.service';
import { DevolucionDto, RecargaDto } from './dto/transacciones.dto';

@Controller('transacciones')
export class TransaccionesController {
  constructor(private readonly transaccionesService: TransaccionesService) {}

  @Get()
  listar(
    @Query('usuarioId') usuarioId?: string,
    @Query('entradaId') entradaId?: string,
    @Query('eventoId') eventoId?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.transaccionesService.listar({
      usuarioId: usuarioId ? Number(usuarioId) : undefined,
      entradaId,
      eventoId,
      tipo,
    });
  }

  @Post('recarga')
  @Roles('Recargador', 'Admin')
  @Idempotente()
  recarga(@Body() dto: RecargaDto, @UsuarioActual('id') operadorId: number) {
    return this.transaccionesService.recargar({
      entradaId: dto.entradaId,
      monto: dto.monto,
      operadorId,
    });
  }

  @Post('devolucion')
  @Roles('Devolucion', 'Admin')
  @Idempotente()
  devolucion(@Body() dto: DevolucionDto, @UsuarioActual('id') operadorId: number) {
    return this.transaccionesService.devolver({
      usuarioId: dto.usuarioId,
      entradaId: dto.entradaId,
      monto: dto.monto,
      fotoCarnetUrl: dto.fotoCarnetUrl,
      eventoId: dto.eventoId,
      operadorId,
    });
  }
}
