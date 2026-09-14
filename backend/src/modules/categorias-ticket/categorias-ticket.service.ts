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
import { ActualizarCategoriaTicketDto } from './dto/actualizar-categoria-ticket.dto';

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
      this.prisma.categoriaTicket.findMany({
        where: { eventoId },
        include: {
          diaEvento: {
            select: { id: true, nombre: true, orden: true, inicio: true, fin: true },
          },
        },
        orderBy: [{ diaEvento: { orden: 'asc' } }, { createdAt: 'asc' }],
      }),
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
    const dia = await this.prisma.diaEvento.findUnique({
      where: { id: dto.diaEventoId },
      select: { eventoId: true },
    });
    if (!dia || dia.eventoId !== dto.eventoId) {
      throw new BadRequestException('La jornada no pertenece a este evento');
    }
    return this.prisma.categoriaTicket.create({
      data: {
        eventoId: dto.eventoId,
        diaEventoId: dto.diaEventoId,
        nombre: dto.nombre,
        beneficios: dto.beneficios?.filter((b) => b.trim() !== '') ?? [],
        cantidad: dto.cantidad,
        precio: dto.precio,
      },
    });
  }

  /**
   * Solo nombre/beneficios/cantidad/precio (ver el DTO). El caso que motivó
   * esto: subir el cupo de una categoría que se agotó más rápido de lo
   * esperado, sin tener que borrarla y perder lo ya vendido.
   */
  async actualizar(id: string, dto: ActualizarCategoriaTicketDto) {
    const categoria = await this.prisma.categoriaTicket.findUnique({ where: { id } });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    await this.eventoPolicy.porEvento(categoria.eventoId);
    if (dto.cantidad !== undefined && dto.cantidad < categoria.cantidadVendida) {
      throw new ConflictException(
        `No se puede bajar el cupo a ${dto.cantidad}: ya hay ${categoria.cantidadVendida} entradas vendidas o reservadas.`,
      );
    }
    return this.prisma.categoriaTicket.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        beneficios: dto.beneficios?.filter((b) => b.trim() !== ''),
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
