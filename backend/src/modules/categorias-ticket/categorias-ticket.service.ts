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
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { CrearCategoriaTicketDto } from './dto/crear-categoria-ticket.dto';

@Injectable()
export class CategoriasTicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  /**
   * Lista las categorías con el desglose de cupo:
   *   - vendidas    : entradas de compras YA aprobadas
   *   - reservadas  : cupo tomado por compras pendientes de aprobación
   *   - disponibles : cantidad - cantidadVendida (lo que queda libre)
   * cantidadVendida ya cuenta pendientes + aprobadas (reserva atómica al comprar).
   */
  async listar(eventoId?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    const [categorias, confirmadas] = await Promise.all([
      this.prisma.categoriaTicket.findMany({ where: { eventoId } }),
      this.prisma.entrada.groupBy({
        by: ['categoriaTicketId'],
        where: { eventoId, compra: { estado: 'confirmado' } },
        _count: { _all: true },
      }),
    ]);
    const vendidasPorCat = new Map(
      confirmadas.map((g) => [g.categoriaTicketId, g._count._all]),
    );
    return categorias.map((c) => {
      const vendidas = vendidasPorCat.get(c.id) ?? 0;
      return {
        ...c,
        vendidas,
        reservadas: Math.max(0, c.cantidadVendida - vendidas),
        disponibles: Math.max(0, c.cantidad - c.cantidadVendida),
      };
    });
  }

  async crear(dto: CrearCategoriaTicketDto) {
    await this.eventoPolicy.porEvento(dto.eventoId);
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
    await this.eventoPolicy.porEvento(categoria.eventoId);
    if (categoria.cantidadVendida > 0) {
      throw new ConflictException(
        'No se puede eliminar: ya tiene entradas vendidas',
      );
    }
    await this.prisma.categoriaTicket.delete({ where: { id } });
  }
}
