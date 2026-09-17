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
import { CodigosQrService } from './codigos-qr.service';
import { GenerarCodigosQrDto } from './dto/generar-codigos-qr.dto';

@Controller('codigos-qr')
export class CodigosQrController {
  constructor(private readonly codigosQrService: CodigosQrService) {}

  @Get()
  listar(
    @Query('eventoId') eventoId?: string,
    @Query('disponibles') disponibles?: string,
  ) {
    return this.codigosQrService.listar(eventoId, disponibles);
  }

  /** Historial de entrega/cambio de manillas del evento. */
  @Get('historial')
  @Roles('Admin', 'Supervisor', 'Cliente')
  historial(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('eventoId') eventoId?: string,
  ) {
    return this.codigosQrService.historial(eventoId, actor);
  }

  /** "Mis manillas": los cambios de manilla de las entradas del que consulta. */
  @Get('historial/mias')
  historialMias(@UsuarioActual('id') usuarioId: number) {
    return this.codigosQrService.historialDelUsuario(usuarioId);
  }

  @Get('buscar/:codigo')
  buscarPorCodigo(@Param('codigo') codigo: string) {
    return this.codigosQrService.buscarPorCodigo(codigo);
  }

  @Post('generar')
  @Roles('Admin')
  generar(@Body() dto: GenerarCodigosQrDto) {
    return this.codigosQrService.generar(dto);
  }

  @Delete()
  @Roles('Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminarNoVinculados(@Query('eventoId') eventoId?: string) {
    return this.codigosQrService.eliminarNoVinculados(eventoId);
  }
}
