/* ============================================================================
 * src/modules/productos/productos.service.ts
 *
 * Estado de los productos de un Puesto EN UN EVENTO. El catálogo (nombre/precio
 * base/imagen) vive en ProductoBase (módulo puestos-base); acá solo se togglea
 * activo, se fija stock y se sobrescribe el precio para ese evento — todo sobre
 * la fila ProductoEstado (una por producto, creada al activar el puesto).
 * ========================================================================= */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { EstadoProductoDto } from './dto/actualizar-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  /** Catálogo del puesto (base + estado por evento) aplanado para vender/gestionar. */
  async listar(puestoId?: string) {
    if (!puestoId) throw new BadRequestException('puestoId es requerido');
    const puesto = await this.prisma.puesto.findUnique({
      where: { id: puestoId },
      include: {
        base: { include: { productos: { where: { archivado: false } } } },
        productosEstado: true,
      },
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');
    const estados = new Map(
      puesto.productosEstado.map((e) => [e.productoBaseId, e]),
    );
    return puesto.base.productos.map((pb) => {
      const est = estados.get(pb.id);
      return {
        id: pb.id,
        nombre: pb.nombre,
        imagen: pb.imagen,
        categoria: pb.categoria,
        precioBase: pb.precio,
        precio: est?.precio ?? pb.precio,
        precioSobrescrito: est?.precio != null,
        activo: est?.activo ?? true,
        stock: est?.stock ?? null,
      };
    });
  }

  /**
   * Upsert del estado de un producto base en un puesto: activo / stock / precio
   * (precio null = vuelve al del base). Guarda de dueño vía el puesto.
   */
  async actualizarEstado(dto: EstadoProductoDto, actor: UsuarioJwt) {
    await this.eventoPolicy.porPuesto(dto.puestoId);
    const puesto = await this.prisma.puesto.findUnique({
      where: { id: dto.puestoId },
      select: { id: true, negocioId: true, puestoBaseId: true },
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');
    if (actor.rol === 'UsuarioNegocio' && puesto.negocioId !== actor.id) {
      throw new ForbiddenException('Ese puesto no es tuyo');
    }
    const pb = await this.prisma.productoBase.findUnique({
      where: { id: dto.productoBaseId },
      select: { puestoBaseId: true },
    });
    if (!pb || pb.puestoBaseId !== puesto.puestoBaseId) {
      throw new BadRequestException('Ese producto no pertenece a este puesto');
    }

    const set: { activo?: boolean; stock?: number | null; precio?: number | null } =
      {};
    if (dto.activo !== undefined) set.activo = dto.activo;
    if (dto.stock !== undefined) set.stock = dto.stock;
    if (dto.precio !== undefined) set.precio = dto.precio;

    return this.prisma.productoEstado.upsert({
      where: {
        puestoId_productoBaseId: {
          puestoId: dto.puestoId,
          productoBaseId: dto.productoBaseId,
        },
      },
      create: {
        puestoId: dto.puestoId,
        productoBaseId: dto.productoBaseId,
        activo: set.activo ?? true,
        stock: set.stock ?? null,
        precio: set.precio ?? null,
      },
      update: set,
    });
  }
}
