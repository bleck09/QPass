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
import { Publico } from '../../common/decorators/publico.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriasTicketService } from './categorias-ticket.service';
import { CrearCategoriaTicketDto } from './dto/crear-categoria-ticket.dto';

@Controller('categorias-ticket')
export class CategoriasTicketController {
  constructor(private readonly categoriasTicketService: CategoriasTicketService) {}

  @Get()
  @Publico()
  listar(@Query('eventoId') eventoId?: string) {
    return this.categoriasTicketService.listar(eventoId);
  }

  @Post()
  @Roles('Admin')
  crear(@Body() dto: CrearCategoriaTicketDto) {
    return this.categoriasTicketService.crear(dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.categoriasTicketService.eliminar(id);
  }
}
