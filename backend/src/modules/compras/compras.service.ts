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
import { MailService } from '../../mail/mail.service';
import { SinCupoDisponibleException } from '../../common/excepciones/dominio.excepciones';
import {
  CorregirEntradasDto,
  CrearCompraDto,
} from './dto/compras.dto';

const generarPassword = () => randomBytes(6).toString('base64url');

// Tope de entradas por orden de compra (debe coincidir con MAX_ENTRADAS del frontend).
const MAX_ENTRADAS_POR_COMPRA = 6;

@Injectable()
export class ComprasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async crear(dto: CrearCompraDto, compradorId: number) {
    if (dto.entradas.length > MAX_ENTRADAS_POR_COMPRA) {
      throw new BadRequestException(
        `Máximo ${MAX_ENTRADAS_POR_COMPRA} entradas por compra`,
      );
    }

    const evento = await this.prisma.evento.findUnique({
      where: { id: dto.eventoId },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.estado === 'finalizado') {
      throw new ConflictException(
        'Este evento ya finalizó; no se pueden comprar entradas',
      );
    }

    const correos = dto.entradas.map((e) => e.correo.trim().toLowerCase());
    if (new Set(correos).size !== correos.length) {
      throw new BadRequestException('Cada entrada necesita un correo distinto');
    }

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

    const idsCategoriaPedidos = [
      ...new Set(dto.entradas.map((e) => e.categoriaTicketId)),
    ];
    const categorias = await this.prisma.categoriaTicket.findMany({
      where: { id: { in: idsCategoriaPedidos } },
    });
    const categoriaInvalida = idsCategoriaPedidos.find((id) => {
      const cat = categorias.find((c) => c.id === id);
      return !cat || cat.eventoId !== dto.eventoId;
    });
    if (categoriaInvalida) {
      throw new BadRequestException(
        'Alguna categoría de entrada no pertenece a este evento',
      );
    }
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
   * sin cuenta y le asigna su número correlativo de entrada dentro del evento.
   * Avisa por correo a cada persona (MailService; hoy es stub) y además devuelve
   * las contraseñas generadas en esta respuesta para relevo manual.
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

    // bcrypt.hash es lento (~100ms): se calcula ANTES de abrir la transacción,
    // una credencial por cada entrada de invitado (las que todavía no tienen cuenta).
    const credencialPorEntrada = new Map<
      string,
      { password: string; passwordHash: string }
    >();
    for (const entrada of compra.entradas) {
      if (entrada.usuarioId) continue;
      const password = generarPassword();
      credencialPorEntrada.set(entrada.id, {
        password,
        passwordHash: await bcrypt.hash(password, 10),
      });
    }

    const passwordsGeneradas: Record<string, string> = {};

    await this.prisma.$transaction(async (tx) => {
      // Correlativo por evento: se numera cada entrada de la compra que aún no lo tenga.
      const ultima = await tx.entrada.findFirst({
        where: { eventoId: compra.eventoId, numero: { not: null } },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      });
      let siguienteNumero = (ultima?.numero ?? 0) + 1;

      for (const entrada of compra.entradas) {
        const datos: Prisma.EntradaUncheckedUpdateInput = {};

        if (entrada.numero == null) {
          datos.numero = siguienteNumero;
          siguienteNumero += 1;
        }

        if (!entrada.usuarioId) {
          let usuario = await tx.usuario.findUnique({
            where: { email: entrada.correo },
          });
          if (!usuario) {
            const cred = credencialPorEntrada.get(entrada.id)!;
            usuario = await tx.usuario.create({
              data: {
                nombre: entrada.nombre,
                email: entrada.correo,
                celular: entrada.celular,
                passwordHash: cred.passwordHash,
                rol: 'UsuarioNormal',
              },
            });
            passwordsGeneradas[entrada.id] = cred.password;
          }
          datos.usuarioId = usuario.id;
        }

        if (Object.keys(datos).length > 0) {
          await tx.entrada.update({ where: { id: entrada.id }, data: datos });
        }
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
        evento: { select: { nombre: true } },
        entradas: { include: { categoriaTicket: true } },
        comprador: { select: { id: true, nombre: true, email: true } },
      },
    });

    // Aviso a cada persona de la compra (titular + invitados). Con MailService en
    // modo stub esto solo se loguea; cuando haya SMTP real, se envía de verdad.
    const nombreEvento = actualizada?.evento?.nombre ?? 'el evento';
    await Promise.allSettled(
      (actualizada?.entradas ?? []).map((entrada) => {
        const password = passwordsGeneradas[entrada.id];
        const cuerpo = password
          ? `Tu entrada para "${nombreEvento}" fue aprobada (entrada N.º ${entrada.numero}). ` +
            `Se creó una cuenta con tu correo ${entrada.correo} y contraseña temporal: ${password}. ` +
            `Inicia sesión y cámbiala.`
          : `Tu entrada para "${nombreEvento}" fue aprobada (entrada N.º ${entrada.numero}). ` +
            `Ya puedes verla iniciando sesión con tu correo ${entrada.correo}.`;
        return this.mail.enviar({
          para: entrada.correo,
          asunto: `Entrada aprobada — ${nombreEvento}`,
          cuerpo,
        });
      }),
    );

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

    const actualizada = await this.prisma.compra.findUnique({
      where: { id: compra.id },
      include: {
        evento: { select: { nombre: true } },
        entradas: { include: { categoriaTicket: true } },
        comprador: { select: { id: true, nombre: true, email: true } },
      },
    });

    // Aviso al comprador de que su solicitud fue rechazada (stub hasta tener SMTP).
    if (actualizada?.comprador?.email) {
      await this.mail
        .enviar({
          para: actualizada.comprador.email,
          asunto: `Solicitud de compra rechazada — ${actualizada.evento?.nombre ?? 'evento'}`,
          cuerpo:
            `Tu solicitud de compra para "${actualizada.evento?.nombre ?? 'el evento'}" fue rechazada.` +
            (motivoRechazo ? ` Motivo: ${motivoRechazo}` : ''),
        })
        .catch(() => undefined);
    }

    return actualizada;
  }
}
