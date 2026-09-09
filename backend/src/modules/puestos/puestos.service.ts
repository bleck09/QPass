/* ============================================================================
 * src/modules/puestos/puestos.service.ts
 *
 * Un Puesto es la ACTIVACIÓN de un PuestoBase (catálogo del negocio) dentro de
 * un evento. Al activarlo se crea una fila ProductoEstado por cada ProductoBase
 * del catálogo (activo / stock / precio por evento). El nombre / logo / catálogo
 * se leen del PuestoBase; acá solo vive la posición en el mapa (x/y/ancho/alto,
 * los pone el Admin) y el estado local de cada producto.
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { ActivarPuestoDto } from './dto/crear-puesto.dto';
import { ActualizarPuestoDto } from './dto/actualizar-puesto.dto';

type PuestoConCatalogo = Prisma.PuestoGetPayload<{
  include: {
    base: { include: { productos: true } };
    productosEstado: true;
    ayudantes: { include: { ayudante: true } };
  };
}>;

/** Aplana el catálogo del PuestoBase + el estado por evento en una sola lista. */
function mapearPuesto(p: PuestoConCatalogo) {
  const estados = new Map(p.productosEstado.map((e) => [e.productoBaseId, e]));
  const productos = p.base.productos
    .filter((pb) => !pb.archivado)
    .map((pb) => {
      const est = estados.get(pb.id);
      return {
        id: pb.id, // = ProductoBase.id (lo que el carrito manda como productoId)
        nombre: pb.nombre,
        imagen: pb.imagen,
        categoria: pb.categoria,
        precioBase: pb.precio,
        precio: est?.precio ?? pb.precio, // efectivo (override del evento o base)
        precioSobrescrito: est?.precio != null,
        activo: est?.activo ?? true,
        stock: est?.stock ?? null,
      };
    });
  return {
    id: p.id,
    eventoId: p.eventoId,
    negocioId: p.negocioId,
    puestoBaseId: p.puestoBaseId,
    nombre: p.base.nombre,
    descripcion: p.base.descripcion,
    logo: p.base.logo,
    categoria: p.base.categoria,
    x: p.x,
    y: p.y,
    ancho: p.ancho,
    alto: p.alto,
    estadoActivo: p.estadoActivo,
    base: {
      id: p.base.id,
      nombre: p.base.nombre,
      descripcion: p.base.descripcion,
      logo: p.base.logo,
      categoria: p.base.categoria,
    },
    productos,
    ayudantes: p.ayudantes,
  };
}

const INCLUDE_CATALOGO = {
  base: { include: { productos: true } },
  productosEstado: true,
  ayudantes: { include: { ayudante: true } },
} satisfies Prisma.PuestoInclude;

@Injectable()
export class PuestosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  async listar(eventoId?: string, negocioId?: number) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    const puestos = await this.prisma.puesto.findMany({
      where: { eventoId, negocioId },
      include: INCLUDE_CATALOGO,
      orderBy: { createdAt: 'asc' },
    });
    return puestos.map(mapearPuesto);
  }

  /** Todos MIS puestos, de todos los eventos (para gestionar ayudantes). */
  async mios(negocioId: number) {
    const puestos = await this.prisma.puesto.findMany({
      where: { negocioId },
      select: {
        id: true,
        eventoId: true,
        base: { select: { nombre: true } },
        evento: { select: { id: true, nombre: true, fecha: true } },
      },
      orderBy: [{ evento: { fecha: 'desc' } }],
    });
    return puestos.map((p) => ({
      id: p.id,
      eventoId: p.eventoId,
      nombre: p.base.nombre,
      base: p.base,
      evento: p.evento,
    }));
  }

  /**
   * Activa un PuestoBase del catálogo en un evento: crea el Puesto + un
   * ProductoEstado por cada ProductoBase no archivado.
   */
  async crear(dto: ActivarPuestoDto, actor: UsuarioJwt) {
    await this.eventoPolicy.porEvento(dto.eventoId);
    const base = await this.prisma.puestoBase.findUnique({
      where: { id: dto.puestoBaseId },
      include: { productos: { where: { archivado: false } } },
    });
    if (!base || base.archivado) {
      throw new NotFoundException('Puesto base no encontrado');
    }
    if (actor.rol === 'UsuarioNegocio' && base.negocioId !== actor.id) {
      throw new ForbiddenException('Ese puesto no es de tu catálogo');
    }

    try {
      const puesto = await this.prisma.puesto.create({
        data: {
          eventoId: dto.eventoId,
          negocioId: base.negocioId,
          puestoBaseId: base.id,
          productosEstado: {
            create: base.productos.map((pb) => ({ productoBaseId: pb.id })),
          },
        },
        include: INCLUDE_CATALOGO,
      });
      return mapearPuesto(puesto);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ese puesto ya está activado en este evento',
        );
      }
      throw e;
    }
  }

  /** Solo la posición en el mapa (x/y/ancho/alto/estadoActivo). */
  async actualizar(id: string, dto: ActualizarPuestoDto, actor: UsuarioJwt) {
    await this.eventoPolicy.porPuesto(id);
    const puesto = await this.prisma.puesto.findUnique({ where: { id } });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');
    if (actor.rol === 'UsuarioNegocio' && puesto.negocioId !== actor.id) {
      throw new ForbiddenException('Ese puesto no es tuyo');
    }
    await this.prisma.puesto.update({
      where: { id },
      data: {
        x: dto.x,
        y: dto.y,
        ancho: dto.ancho,
        alto: dto.alto,
        estadoActivo: dto.estadoActivo,
      },
    });
    const actualizado = await this.prisma.puesto.findUniqueOrThrow({
      where: { id },
      include: INCLUDE_CATALOGO,
    });
    return mapearPuesto(actualizado);
  }

  /**
   * Desactiva un puesto de un evento. Si ya registró ventas no se borra (solo
   * queda inactivo en el mapa); si no, se elimina junto con su catálogo local.
   */
  async desactivar(id: string, actor: UsuarioJwt) {
    await this.eventoPolicy.porPuesto(id);
    const puesto = await this.prisma.puesto.findUnique({
      where: { id },
      include: { _count: { select: { ventas: true } } },
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');
    if (actor.rol === 'UsuarioNegocio' && puesto.negocioId !== actor.id) {
      throw new ForbiddenException('Ese puesto no es tuyo');
    }
    if (puesto._count.ventas > 0) {
      await this.prisma.puesto.update({
        where: { id },
        data: { estadoActivo: false },
      });
      return { desactivado: true, borrado: false };
    }
    await this.prisma.puesto.delete({ where: { id } });
    return { desactivado: true, borrado: true };
  }
}
