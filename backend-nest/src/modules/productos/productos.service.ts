/* ============================================================================
 * src/modules/productos/productos.service.ts
 * Productos de un puesto.
 * ========================================================================= */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearProductoDto } from './dto/crear-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(puestoId?: string) {
    if (!puestoId) throw new BadRequestException('puestoId es requerido');
    return this.prisma.producto.findMany({ where: { puestoId } });
  }

  async crear(dto: CrearProductoDto) {
    return this.prisma.producto.create({
      data: {
        puestoId: dto.puestoId,
        nombre: dto.nombre,
        precio: dto.precio,
        imagen: dto.imagen,
      },
    });
  }

  async eliminar(id: string) {
    await this.prisma.producto.delete({ where: { id } });
  }
}
