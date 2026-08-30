/* ============================================================================
 * src/modules/categorias-ticket/categorias-ticket.service.ts
 * Categorías/tipos de ticket de un evento. La RESERVA de cupo
 * (cantidadVendida) la maneja ComprasService de forma atómica (C4).
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearCategoriaTicketDto } from './dto/crear-categoria-ticket.dto';

@Injectable()
export class CategoriasTicketService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(eventoId?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    return this.prisma.categoriaTicket.findMany({ where: { eventoId } });
  }

  async crear(dto: CrearCategoriaTicketDto) {
    return this.prisma.categoriaTicket.create({
      data: {
        eventoId: dto.eventoId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        cantidad: dto.cantidad,
        precio: dto.precio,
      },
    });
  }

  async eliminar(id: string) {
    const categoria = await this.prisma.categoriaTicket.findUnique({
      where: { id },
    });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    if (categoria.cantidadVendida > 0) {
      throw new ConflictException(
        'No se puede eliminar: ya tiene entradas vendidas',
      );
    }
    await this.prisma.categoriaTicket.delete({ where: { id } });
  }
}
