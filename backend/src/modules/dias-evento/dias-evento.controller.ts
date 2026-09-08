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
import { DiasEventoService } from './dias-evento.service';
import {
  ActualizarDiaEventoDto,
  CrearDiaEventoDto,
} from './dto/dia-evento.dto';

@Controller('dias-evento')
export class DiasEventoController {
  constructor(private readonly diasEventoService: DiasEventoService) {}

  @Get()
  @Publico()
  listar(@Query('eventoId') eventoId?: string) {
    return this.diasEventoService.listar(eventoId);
  }

  @Post()
  @Roles('Admin')
  crear(@Body() dto: CrearDiaEventoDto) {
    return this.diasEventoService.crear(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarDiaEventoDto) {
    return this.diasEventoService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.diasEventoService.eliminar(id);
  }
}
