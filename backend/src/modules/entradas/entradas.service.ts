/* ============================================================================
 * src/modules/entradas/entradas.service.ts
 *
 * Cada boleto/persona dentro de una Compra + su historial de control de acceso
 * (RegistroIngreso) y la pulsera/QR físico vinculado. El saldo NO vive acá:
 * vive en Usuario.saldo (dueño vía Entrada.usuarioId).
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoRegistroIngreso } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const CODIGO_ACTIVO = {
  codigosQr: { where: { anulado: false }, take: 1 },
} satisfies Prisma.EntradaInclude;

// El saldo vive en Usuario; se incluye así para que las pantallas de escaneo
// lo muestren sin una segunda llamada.
const CON_SALDO = {
  usuario: { select: { id: true, saldo: true, foto: true } },
} satisfies Prisma.EntradaInclude;

// Una compra pendiente o rechazada no es un asistente real todavía.
const SOLO_CONFIRMADAS = {
  compra: { estado: 'confirmado' },
} satisfies Prisma.EntradaWhereInput;

// Ventana de control de acceso en puerta (ver README → "Reglas de negocio"):
// se puede registrar INGRESO desde estas horas antes de evento.fecha y hasta
// evento.fechaFin. La SALIDA no tiene ventana: siempre se puede sacar a quien
// esté adentro, incluso con el evento ya finalizado.
const MARGEN_INGRESO_ANTICIPADO_HORAS = 3;

@Injectable()
export class EntradasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(eventoId?: string, estadoIngreso?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    const entradas = await this.prisma.entrada.findMany({
      where: {
        eventoId,
        estadoIngreso: (estadoIngreso as Prisma.EnumEstadoIngresoFilter) || undefined,
        ...SOLO_CONFIRMADAS,
      },
      include: {
        categoriaTicket: true,
        ...CODIGO_ACTIVO,
        ...CON_SALDO,
        registrosIngreso: { select: { tipo: true } },
      },
    });
    return entradas.map(({ codigosQr, registrosIngreso, ...e }) => ({
      ...e,
      codigoQrVinculado: codigosQr[0] || null,
      vecesIngreso: registrosIngreso.filter((r) => r.tipo === 'ingreso').length,
      vecesSalida: registrosIngreso.filter((r) => r.tipo === 'salida').length,
    }));
  }

  /**
   * Entradas a nombre del usuario logueado (titular O invitado): se buscan por
   * Entrada.usuarioId, no por comprador. Esto es lo que ve un invitado al que
   * otra persona le compró la entrada — su cuenta nunca fue "comprador".
   * Solo entradas de compras ya confirmadas.
   */
  async mias(usuarioId: number) {
    const entradas = await this.prisma.entrada.findMany({
      where: { usuarioId, compra: { estado: 'confirmado' } },
      include: {
        evento: true,
        categoriaTicket: true,
        compra: { select: { id: true, compradorId: true } },
        ...CODIGO_ACTIVO,
      },
      orderBy: { createdAt: 'desc' },
    });
    return entradas.map(({ codigosQr, ...e }) => ({
      ...e,
      codigoQrVinculado: codigosQr[0] || null,
    }));
  }

  /** Resuelve la Entrada dueña de una pulsera/QR físico escaneado. */
  async buscarPorCodigoQr(codigo: string) {
    const codigoQr = await this.prisma.codigoQr.findUnique({
      where: { codigo },
      include: {
        entrada: {
          include: {
            categoriaTicket: true,
            compra: { select: { estado: true } },
            ...CON_SALDO,
          },
        },
      },
    });
    if (
      !codigoQr ||
      codigoQr.anulado ||
      !codigoQr.entrada ||
      codigoQr.entrada.compra?.estado !== 'confirmado'
    ) {
      throw new NotFoundException(
        'Código no vinculado a ninguna entrada activa',
      );
    }
    const { compra, ...entrada } = codigoQr.entrada;
    return {
      ...entrada,
      codigoQrVinculado: { id: codigoQr.id, codigo: codigoQr.codigo },
    };
  }

  async obtenerPorId(id: string) {
    const entrada = await this.prisma.entrada.findUnique({
      where: { id },
      include: { categoriaTicket: true, ...CODIGO_ACTIVO, ...CON_SALDO },
    });
    if (!entrada) throw new NotFoundException('Entrada no encontrada');
    const { codigosQr, ...resto } = entrada;
    return { ...resto, codigoQrVinculado: codigosQr[0] || null };
  }

  async registros(id: string) {
    return this.prisma.registroIngreso.findMany({
      where: { entradaId: id },
      include: { registradoPor: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Vincula una pulsera/QR del pool a esta entrada. Si ya tenía otro código
   * activo, se anula primero — nunca dos códigos activos por persona (además
   * está el índice único parcial de C4).
   */
  async vincularQr(id: string, codigoQrId: string, actorId: number) {
    const entradaActual = await this.prisma.entrada.findUnique({
      where: { id },
      include: { compra: true },
    });
    if (!entradaActual) throw new NotFoundException('Entrada no encontrada');
    if (entradaActual.compra?.estado !== 'confirmado') {
      throw new ConflictException('Esta compra todavía no está aprobada');
    }

    const codigoQr = await this.prisma.codigoQr.findUnique({
      where: { id: codigoQrId },
    });
    if (!codigoQr) throw new NotFoundException('Código no encontrado');
    if (codigoQr.entradaId) {
      throw new ConflictException('Ese código ya está vinculado a otra entrada');
    }

    const anteriorActivo = await this.prisma.codigoQr.findFirst({
      where: { entradaId: id, anulado: false },
    });

    await this.prisma.$transaction([
      ...(anteriorActivo
        ? [
            this.prisma.codigoQr.update({
              where: { id: anteriorActivo.id },
              data: {
                anulado: true,
                motivoAnulacion: 'Reemplazada al vincular una nueva',
                anuladoPorId: actorId,
                anuladoEn: new Date(),
              },
            }),
          ]
        : []),
      this.prisma.codigoQr.update({
        where: { id: codigoQrId },
        data: { entradaId: id, asignadoPorId: actorId, asignadoEn: new Date() },
      }),
    ]);

    return this.obtenerPorId(id);
  }

  /** Manilla perdida/dañada: anula el código activo (el saldo no se mueve). */
  async anularQr(id: string, motivo: string | undefined, actorId: number) {
    const activo = await this.prisma.codigoQr.findFirst({
      where: { entradaId: id, anulado: false },
    });
    if (!activo) {
      throw new NotFoundException('Esta entrada no tiene un código vinculado');
    }
    await this.prisma.codigoQr.update({
      where: { id: activo.id },
      data: {
        anulado: true,
        motivoAnulacion: motivo || null,
        anuladoPorId: actorId,
        anuladoEn: new Date(),
      },
    });
  }

  /**
   * Control de acceso (Supervisor). La foto es UNA sola por Entrada, en
   * Entrada.foto; obligatoria solo si esa entrada todavía no tiene una.
   */
  async registrarMovimiento(
    id: string,
    tipo: TipoRegistroIngreso,
    foto: string | undefined,
    actorId: number,
  ) {
    const entradaActual = await this.prisma.entrada.findUnique({
      where: { id },
      include: {
        evento: {
          select: { nombre: true, fecha: true, fechaFin: true, estado: true },
        },
      },
    });
    if (!entradaActual) throw new NotFoundException('Entrada no encontrada');

    if (tipo === 'ingreso') {
      const { evento } = entradaActual;
      const ahora = new Date();
      const aperturaPuerta = new Date(
        evento.fecha.getTime() -
          MARGEN_INGRESO_ANTICIPADO_HORAS * 60 * 60 * 1000,
      );
      if (evento.estado === 'finalizado' || ahora > evento.fechaFin) {
        throw new ConflictException(
          `"${evento.nombre}" ya finalizó — no se registran más ingresos`,
        );
      }
      if (ahora < aperturaPuerta) {
        throw new ConflictException(
          `Todavía no es horario de ingreso para "${evento.nombre}": se habilita ` +
            `${MARGEN_INGRESO_ANTICIPADO_HORAS} h antes del inicio del evento`,
        );
      }
    }

    if (tipo === 'salida' && entradaActual.estadoIngreso !== 'ingresado') {
      throw new ConflictException(
        'Esta entrada no está adentro — no se puede registrar una salida',
      );
    }
    if (tipo === 'ingreso' && entradaActual.estadoIngreso === 'ingresado') {
      throw new ConflictException(
        'Esta entrada ya está registrada como ingresada',
      );
    }
    if (!entradaActual.foto && !foto) {
      throw new BadRequestException(
        'Foto de seguridad obligatoria — esta entrada todavía no tiene una foto registrada',
      );
    }

    const [, entrada] = await this.prisma.$transaction([
      this.prisma.registroIngreso.create({
        data: {
          entradaId: id,
          tipo,
          foto: foto || undefined,
          registradoPorId: actorId,
        },
      }),
      this.prisma.entrada.update({
        where: { id },
        data: {
          estadoIngreso: tipo === 'ingreso' ? 'ingresado' : 'salio',
          foto: foto || undefined,
        },
        include: { categoriaTicket: true, ...CODIGO_ACTIVO, ...CON_SALDO },
      }),
    ]);
    const { codigosQr, ...resto } = entrada;
    return { ...resto, codigoQrVinculado: codigosQr[0] || null };
  }
}
