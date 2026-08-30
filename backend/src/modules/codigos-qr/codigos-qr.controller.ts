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
