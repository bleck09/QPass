/* ============================================================================
 * src/modules/avisos-stock/avisos-stock.service.ts
 *
 * Un Ayudante avisa a su Usuario Negocio que un producto de su puesto se quedó
 * sin stock o está por agotarse (§5.4). El negocio lo ve en su panel de puestos
 * y lo marca como visto. Campos denormalizados => se listan sin joins.
 * ========================================================================= */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearAvisoStockDto } from './dto/crear-aviso-stock.dto';

// Mismo umbral que el frontend (utils/stock.js).
const UMBRAL_STOCK_BAJO = 5;
// No se crean dos avisos del mismo producto/puesto dentro de esta ventana.
const VENTANA_DEDUPE_MIN = 60;

@Injectable()
export class AvisosStockService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearAvisoStockDto, ayudanteId: number) {
    const puesto = await this.prisma.puesto.findUnique({
      where: { id: dto.puestoId },
      include: {
        base: { select: { nombre: true } },
        evento: { select: { nombre: true } },
      },
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');

    const [estado, base, ayudante] = await Promise.all([
      this.prisma.productoEstado.findUnique({
        where: {
          puestoId_productoBaseId: {
            puestoId: dto.puestoId,
            productoBaseId: dto.productoBaseId,
          },
        },
      }),
      this.prisma.productoBase.findUnique({
        where: { id: dto.productoBaseId },
        select: { nombre: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: ayudanteId },
        select: { nombre: true },
      }),
    ]);
    if (!base) throw new NotFoundException('Producto no encontrado');

    const stock = estado?.stock ?? null;
    const tipo =
      estado?.activo === false || stock === 0
        ? 'sin_stock'
        : stock != null && stock <= UMBRAL_STOCK_BAJO
          ? 'bajo'
          : 'bajo';

    // Dedupe: si ya hay un aviso sin ver de este producto/puesto reciente, no repetir.
    const desde = new Date(Date.now() - VENTANA_DEDUPE_MIN * 60_000);
    const yaExiste = await this.prisma.avisoStock.findFirst({
      where: {
        puestoId: dto.puestoId,
        productoBaseId: dto.productoBaseId,
        visto: false,
        createdAt: { gte: desde },
      },
    });
    if (yaExiste) return yaExiste;

    return this.prisma.avisoStock.create({
      data: {
        puestoId: dto.puestoId,
        productoBaseId: dto.productoBaseId,
        productoNombre: base.nombre,
        puestoNombre: puesto.base.nombre,
        eventoNombre: puesto.evento.nombre,
        ayudanteId,
        ayudanteNombre: ayudante?.nombre ?? 'Ayudante',
        negocioId: puesto.negocioId,
        tipo,
        stockRestante: stock,
      },
    });
  }

  /** Avisos SIN ver del negocio, más recientes primero. */
  listar(negocioId: number) {
    return this.prisma.avisoStock.findMany({
      where: { negocioId, visto: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async marcarVisto(id: string, negocioId: number) {
    await this.prisma.avisoStock.updateMany({
      where: { id, negocioId },
      data: { visto: true },
    });
  }

  async marcarTodosVistos(negocioId: number) {
    await this.prisma.avisoStock.updateMany({
      where: { negocioId, visto: false },
      data: { visto: true },
    });
  }
}
