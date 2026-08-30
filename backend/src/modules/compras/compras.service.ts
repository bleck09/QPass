/* ============================================================================
 * src/modules/compras/compras.service.ts
 *
 * Una orden de compra de entradas (titular + N invitados). El pago es manual:
 * el comprador sube comprobante y eso RESERVA el cupo de forma atómica
 * (UPDATE ... WHERE cantidadVendida + N <= cantidad, ver C4 y el comentario de
 * CategoriaTicket.cantidadVendida en schema.prisma). Admin confirma o rechaza.
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SinCupoDisponibleException } from '../../common/excepciones/dominio.excepciones';
import {
  CorregirEntradasDto,
  CrearCompraDto,
} from './dto/compras.dto';

const generarPassword = () => randomBytes(6).toString('base64url');

@Injectable()
export class ComprasService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearCompraDto, compradorId: number) {
    const titularesEnLote = dto.entradas.filter((e) => e.isTitular).length;
    if (titularesEnLote > 1) {
      throw new BadRequestException(
        'Solo puede haber una entrada tuya (titular) por compra',
      );
    }
    if (titularesEnLote === 1) {
      const yaTiene = await this.prisma.entrada.findFirst({
        where: {
          eventoId: dto.eventoId,
          usuarioId: compradorId,
          isTitular: true,
          compra: { estado: { not: 'rechazado' } },
        },
      });
      if (yaTiene) {
        throw new ConflictException(
          'Ya tienes una entrada para este evento; las demás deben ser para invitados',
        );
      }
    }

    const categorias = await this.prisma.categoriaTicket.findMany({
      where: { id: { in: dto.entradas.map((e) => e.categoriaTicketId) } },
    });
    const precioDe = (categoriaTicketId: string) =>
      categorias.find((c) => c.id === categoriaTicketId)?.precio ?? 0;
    const montoTotal = dto.entradas.reduce(
      (suma, e) => suma + Number(precioDe(e.categoriaTicketId)),
      0,
    );

    const cantidadPorCategoria = new Map<string, number>();
    dto.entradas.forEach((e) =>
      cantidadPorCategoria.set(
        e.categoriaTicketId,
        (cantidadPorCategoria.get(e.categoriaTicketId) || 0) + 1,
      ),
    );

    return this.prisma.$transaction(async (tx) => {
      for (const [categoriaTicketId, cantidad] of cantidadPorCategoria) {
        // UPDATE atómico condicional: reserva cupo solo si todavía alcanza.
        const filasActualizadas = await tx.$executeRaw`
          UPDATE categorias_ticket
          SET "cantidadVendida" = "cantidadVendida" + ${cantidad}
          WHERE id = ${categoriaTicketId} AND "cantidadVendida" + ${cantidad} <= cantidad
        `;
        if (filasActualizadas === 0) {
          const cat = categorias.find((c) => c.id === categoriaTicketId);
          throw new SinCupoDisponibleException(
            `No queda stock suficiente de "${cat?.nombre || categoriaTicketId}"`,
          );
        }
      }

      return tx.compra.create({
        data: {
          eventoId: dto.eventoId,
          compradorId,
          montoTotal,
          comprobanteUrl: dto.comprobanteUrl,
          comprobanteNombreArchivo: dto.comprobanteNombreArchivo,
          entradas: {
            create: dto.entradas.map((e) => ({
              eventoId: dto.eventoId,
              categoriaTicketId: e.categoriaTicketId,
              isTitular: !!e.isTitular,
              nombre: e.nombre,
              correo: e.correo,
              celular: e.celular,
              usuarioId: e.isTitular ? compradorId : undefined,
            })),
          },
        },
        include: { entradas: true },
      });
    });
  }

  async mias(compradorId: number) {
    const compras = await this.prisma.compra.findMany({
      where: { compradorId },
      include: {
        entradas: {
          include: {
            categoriaTicket: true,
            codigosQr: { where: { anulado: false } },
          },
        },
        evento: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return compras.map((compra) => ({
      ...compra,
      entradas: compra.entradas.map(({ codigosQr, ...e }) => ({
        ...e,
        codigoQrVinculado: codigosQr[0] || null,
      })),
    }));
  }

  async listar(eventoId?: string) {
    return this.prisma.compra.findMany({
      where: eventoId ? { eventoId } : undefined,
      include: {
        entradas: { include: { categoriaTicket: true } },
        comprador: { select: { id: true, nombre: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async corregirEntradas(id: string, dto: CorregirEntradasDto, actorId: number) {
    const compra = await this.prisma.compra.findUnique({ where: { id } });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    if (compra.compradorId !== actorId) {
      throw new ForbiddenException('No autorizado');
    }
    if (compra.estado !== 'pendiente') {
      throw new ConflictException(
        'La compra ya fue resuelta; usa un reporte de datos',
      );
    }

    await this.prisma.$transaction(
      dto.entradas.map((e) =>
        this.prisma.entrada.update({
          where: { id: e.id },
          data: { nombre: e.nombre, correo: e.correo, celular: e.celular },
        }),
      ),
    );

    return this.prisma.compra.findUnique({
      where: { id },
      include: { entradas: true },
    });
  }

  /**
   * Crea (o vincula, si el correo ya tiene cuenta) un Usuario por cada entrada
   * sin cuenta. Las contraseñas generadas se devuelven SOLO en esta respuesta
   * (no hay servicio de correo para enviarlas).
   */
  async aprobar(id: string, adminId: number) {
    const compra = await this.prisma.compra.findUnique({
      where: { id },
      include: { entradas: true },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    if (compra.estado !== 'pendiente') {
      throw new ConflictException('Esta compra ya fue resuelta');
    }

    const passwordsGeneradas: Record<string, string> = {};

    await this.prisma.$transaction(async (tx) => {
      for (const entrada of compra.entradas) {
        if (entrada.usuarioId) continue; // titular: ya llega con cuenta

        let usuario = await tx.usuario.findUnique({
          where: { email: entrada.correo },
        });
        if (!usuario) {
          const password = generarPassword();
          const passwordHash = await bcrypt.hash(password, 10);
          usuario = await tx.usuario.create({
            data: {
              nombre: entrada.nombre,
              email: entrada.correo,
              celular: entrada.celular,
              passwordHash,
              rol: 'UsuarioNormal',
            },
          });
          passwordsGeneradas[entrada.id] = password;
        }
        await tx.entrada.update({
          where: { id: entrada.id },
          data: { usuarioId: usuario.id },
        });
      }

      await tx.compra.update({
        where: { id: compra.id },
        data: {
          estado: 'confirmado',
          resueltoPorId: adminId,
          resueltoEn: new Date(),
        },
      });
    });

    const actualizada = await this.prisma.compra.findUnique({
      where: { id: compra.id },
      include: {
        entradas: { include: { categoriaTicket: true } },
        comprador: { select: { id: true, nombre: true, email: true } },
      },
    });
    return { ...actualizada, passwordsGeneradas };
  }

  /** Libera el cupo reservado de cada categoría. */
  async rechazar(id: string, motivoRechazo: string | undefined, adminId: number) {
    const compra = await this.prisma.compra.findUnique({
      where: { id },
      include: { entradas: true },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    if (compra.estado !== 'pendiente') {
      throw new ConflictException('Esta compra ya fue resuelta');
    }

    const cantidadPorCategoria = new Map<string, number>();
    compra.entradas.forEach((e) => {
      if (!e.categoriaTicketId) return;
      cantidadPorCategoria.set(
        e.categoriaTicketId,
        (cantidadPorCategoria.get(e.categoriaTicketId) || 0) + 1,
      );
    });

    const operaciones: Prisma.PrismaPromise<unknown>[] = [
      ...[...cantidadPorCategoria.entries()].map(([categoriaTicketId, cantidad]) =>
        this.prisma.categoriaTicket.update({
          where: { id: categoriaTicketId },
          data: { cantidadVendida: { decrement: cantidad } },
        }),
      ),
      this.prisma.compra.update({
        where: { id: compra.id },
        data: {
          estado: 'rechazado',
          motivoRechazo,
          resueltoPorId: adminId,
          resueltoEn: new Date(),
        },
      }),
    ];
    await this.prisma.$transaction(operaciones);

    return this.prisma.compra.findUnique({
      where: { id: compra.id },
      include: {
        entradas: { include: { categoriaTicket: true } },
        comprador: { select: { id: true, nombre: true, email: true } },
      },
    });
  }
}
