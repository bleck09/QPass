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
import { EstadoCaso } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { ReportesEntradaService } from './reportes-entrada.service';
import {
  CorregirReporteEntradaDto,
  CrearReporteEntradaDto,
} from './dto/reportes-entrada.dto';

@Controller('reportes-entrada')
export class ReportesEntradaController {
  constructor(private readonly reportesEntradaService: ReportesEntradaService) {}

  @Get()
  listar(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('estado') estado?: EstadoCaso,
    @Query('eventoId') eventoId?: string,
  ) {
    return this.reportesEntradaService.listar(actor, { estado, eventoId });
  }

  @Post()
  crear(@Body() dto: CrearReporteEntradaDto) {
    return this.reportesEntradaService.crear(dto);
  }

  @Post(':id/corregir')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  corregir(
    @Param('id') id: string,
    @Body() dto: CorregirReporteEntradaDto,
    @UsuarioActual('id') adminId: number,
  ) {
    return this.reportesEntradaService.corregir(id, dto, adminId);
  }
}
