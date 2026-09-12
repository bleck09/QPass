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
  Query,
} from '@nestjs/common';
import { Publico } from '../../common/decorators/publico.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ElementosMapaService } from './elementos-mapa.service';
import { CrearElementoMapaDto } from './dto/crear-elemento-mapa.dto';
import { ActualizarElementoMapaDto } from './dto/actualizar-elemento-mapa.dto';

@Controller('elementos-mapa')
export class ElementosMapaController {
  constructor(private readonly elementosMapaService: ElementosMapaService) {}

  /** Público: la landing del evento también pinta estos cuadros en su mapa. */
  @Get()
  @Publico()
  listar(@Query('eventoId') eventoId: string) {
    return this.elementosMapaService.listar(eventoId);
  }

  @Post()
  @Roles('Admin')
  crear(@Body() dto: CrearElementoMapaDto) {
    return this.elementosMapaService.crear(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarElementoMapaDto) {
    return this.elementosMapaService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  eliminar(@Param('id') id: string) {
    return this.elementosMapaService.eliminar(id);
  }
}
