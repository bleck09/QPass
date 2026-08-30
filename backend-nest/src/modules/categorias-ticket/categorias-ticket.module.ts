import { Module } from '@nestjs/common';
import { CategoriasTicketController } from './categorias-ticket.controller';
import { CategoriasTicketService } from './categorias-ticket.service';

@Module({
  controllers: [CategoriasTicketController],
  providers: [CategoriasTicketService],
  exports: [CategoriasTicketService],
})
export class CategoriasTicketModule {}
