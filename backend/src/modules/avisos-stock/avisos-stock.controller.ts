import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { AvisosStockService } from './avisos-stock.service';
import { CrearAvisoStockDto } from './dto/crear-aviso-stock.dto';

@Controller('avisos-stock')
export class AvisosStockController {
  constructor(private readonly avisosStockService: AvisosStockService) {}

  /** El Ayudante avisa que un producto de su puesto está sin stock / bajo. */
  @Post()
  @Roles('Ayudante')
  crear(
    @Body() dto: CrearAvisoStockDto,
    @UsuarioActual('id') ayudanteId: number,
  ) {
    return this.avisosStockService.crear(dto, ayudanteId);
  }

  /** El negocio ve sus avisos sin leer. */
  @Get()
  @Roles('UsuarioNegocio')
  listar(@UsuarioActual('id') negocioId: number) {
    return this.avisosStockService.listar(negocioId);
  }

  @Post('marcar-vistos')
  @Roles('UsuarioNegocio')
  @HttpCode(HttpStatus.NO_CONTENT)
  marcarTodosVistos(@UsuarioActual('id') negocioId: number) {
    return this.avisosStockService.marcarTodosVistos(negocioId);
  }

  @Patch(':id/visto')
  @Roles('UsuarioNegocio')
  @HttpCode(HttpStatus.NO_CONTENT)
  marcarVisto(
    @Param('id') id: string,
    @UsuarioActual('id') negocioId: number,
  ) {
    return this.avisosStockService.marcarVisto(id, negocioId);
  }
}
