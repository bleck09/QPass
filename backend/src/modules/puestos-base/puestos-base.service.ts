/* ============================================================================
 * src/modules/puestos-base/puestos-base.service.ts
 *
 * Catálogo del negocio: PuestoBase + ProductoBase. El Usuario Negocio los define
 * UNA vez acá y luego los "activa" en cada evento (ver PuestosService.crear, que
 * crea un Puesto + un ProductoEstado por producto). Nada de esto es por evento.
 * ========================================================================= */

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActualizarProductoBaseDto,
  ActualizarPuestoBaseDto,
  CrearProductoBaseDto,
  CrearPuestoBaseDto,
} from './dto/puesto-base.dto';

@Injectable()
export class PuestosBaseService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mi catálogo: puestos base no archivados con sus productos no archivados. */
  async listar(negocioId: number) {
    return this.prisma.puestoBase.findMany({
      where: { negocioId, archivado: false },
      include: {
        productos: {
          where: { archivado: false },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { puestos: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async crear(negocioId: number, dto: CrearPuestoBaseDto) {
    return this.prisma.puestoBase.create({
      data: {
        negocioId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        logo: dto.logo,
        categoria: dto.categoria,
      },
    });
  }

  async actualizar(
    negocioId: number,
    id: string,
    dto: ActualizarPuestoBaseDto,
  ) {
    await this.miPuestoBase(negocioId, id);
    return this.prisma.puestoBase.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        logo: dto.logo,
        categoria: dto.categoria,
      },
    });
  }

  /** Archiva el puesto base (no se borra: puede tener activaciones/ventas históricas). */
  async archivar(negocioId: number, id: string) {
    await this.miPuestoBase(negocioId, id);
    return this.prisma.puestoBase.update({
      where: { id },
      data: { archivado: true },
    });
  }

  async crearProducto(
    negocioId: number,
    puestoBaseId: string,
    dto: CrearProductoBaseDto,
  ) {
    await this.miPuestoBase(negocioId, puestoBaseId);
    return this.prisma.productoBase.create({
      data: {
        puestoBaseId,
        nombre: dto.nombre,
        precio: dto.precio,
        imagen: dto.imagen,
        categoria: dto.categoria ?? null,
      },
    });
  }

  async actualizarProducto(
    negocioId: number,
    id: string,
    dto: ActualizarProductoBaseDto,
  ) {
    await this.miProductoBase(negocioId, id);
    return this.prisma.productoBase.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        precio: dto.precio,
        imagen: dto.imagen,
        categoria: dto.categoria,
      },
    });
  }

  /**
   * Borra el producto base si nunca se vendió; si ya tiene VentaItem lo archiva
   * (el snapshot en VentaItem conserva nombre/precio, pero la FK debe seguir viva).
   */
  async eliminarProducto(negocioId: number, id: string) {
    await this.miProductoBase(negocioId, id);
    const ventas = await this.prisma.ventaItem.count({
      where: { productoBaseId: id },
    });
    if (ventas > 0) {
      return this.prisma.productoBase.update({
        where: { id },
        data: { archivado: true },
      });
    }
    await this.prisma.productoBase.delete({ where: { id } });
    return { eliminado: true };
  }

  // --- guardas de dueño -----------------------------------------------------

  private async miPuestoBase(negocioId: number, id: string) {
    const pb = await this.prisma.puestoBase.findUnique({ where: { id } });
    if (!pb) throw new NotFoundException('Puesto base no encontrado');
    if (pb.negocioId !== negocioId) {
      throw new ForbiddenException('Ese puesto no es de tu catálogo');
    }
    return pb;
  }

  private async miProductoBase(negocioId: number, id: string) {
    const p = await this.prisma.productoBase.findUnique({
      where: { id },
      select: { id: true, puestoBase: { select: { negocioId: true } } },
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    if (p.puestoBase.negocioId !== negocioId) {
      throw new ForbiddenException('Ese producto no es de tu catálogo');
    }
    return p;
  }
}
