/* ============================================================================
 * src/modules/transacciones/transacciones.service.ts
 *
 * EL LEDGER. El ÚNICO lugar del proyecto que escribe Usuario.saldo (C7).
 * Todo movimiento pasa por un UPDATE atómico — condicional cuando puede dejar
 * el saldo negativo (consumo/venta/devolución) — dentro de una transacción
 * de Postgres (C4). Ningún otro service toca `saldo`: lo llaman a este.
 *
 * Métodos con `tx?`: si el caller ya abrió un $transaction (VentasService,
 * IncidenciasRecargaService), lo reutilizan para no romper la atomicidad.
 * ========================================================================= */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { SaldoInsuficienteException } from '../../common/excepciones/dominio.excepciones';

type PrismaTx = Prisma.TransactionClient;

interface FiltrosTransaccion {
  usuarioId?: number;
  entradaId?: string;
  eventoId?: string;
  tipo?: string;
}

@Injectable()
export class TransaccionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  async listar(filtros: FiltrosTransaccion) {
    if (!filtros.usuarioId && !filtros.entradaId && !filtros.eventoId) {
      throw new BadRequestException(
        'usuarioId, entradaId o eventoId es requerido',
      );
    }
    return this.prisma.transaccion.findMany({
      where: {
        usuarioId: filtros.usuarioId,
        entradaId: filtros.entradaId,
        eventoId: filtros.eventoId,
        tipo: (filtros.tipo as Prisma.EnumTipoTransaccionFilter) || undefined,
      },
      include: {
        operador: { select: { id: true, nombre: true } },
        entrada: { select: { id: true, nombre: true, documento: true, foto: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Recarga: acredita saldo a la billetera personal del dueño de la Entrada
   * escaneada. Es un crédito, nunca deja negativo -> UPDATE con increment.
   */
  async recargar(params: { entradaId: string; monto: number; operadorId: number }) {
    await this.eventoPolicy.porEntrada(params.entradaId);
    return this.prisma.$transaction(async (tx) => {
      const entrada = await tx.entrada.findUnique({
        where: { id: params.entradaId },
      });
      if (!entrada) throw new NotFoundException('Entrada no encontrada');
      if (!entrada.usuarioId) {
        throw new BadRequestException(
          'Esta entrada todavía no tiene una cuenta vinculada',
        );
      }

      const usuario = await tx.usuario.update({
        where: { id: entrada.usuarioId },
        data: { saldo: { increment: params.monto } },
        select: { id: true, nombre: true, email: true, rol: true, saldo: true },
      });

      const transaccion = await tx.transaccion.create({
        data: {
          eventoId: entrada.eventoId,
          tipo: 'recarga',
          monto: params.monto,
          saldoResultante: usuario.saldo, // valor real post-update, no calculado aparte
          usuarioId: usuario.id,
          entradaId: params.entradaId,
          operadorId: params.operadorId,
        },
      });

      return { usuario, transaccion };
    });
  }

  /**
   * Devolución: retira saldo de la billetera personal de un Usuario. Debita ->
   * UPDATE condicional: si no alcanza, count = 0 y aborta sin dejar negativo.
   */
  async devolver(params: {
    usuarioId: number;
    entradaId?: string;
    monto: number;
    fotoCarnetUrl: string;
    eventoId: string;
    operadorId: number;
  }) {
    await this.eventoPolicy.porEvento(params.eventoId);
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id: params.usuarioId },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      const debito = await tx.usuario.updateMany({
        where: { id: params.usuarioId, saldo: { gte: params.monto } },
        data: { saldo: { decrement: params.monto } },
      });
      if (debito.count === 0) {
        throw new SaldoInsuficienteException('Saldo insuficiente para el retiro');
      }

      const actualizado = await tx.usuario.findUniqueOrThrow({
        where: { id: params.usuarioId },
        select: { saldo: true },
      });

      return tx.transaccion.create({
        data: {
          eventoId: params.eventoId,
          tipo: 'devolucion',
          monto: params.monto,
          saldoResultante: actualizado.saldo,
          fotoCarnetUrl: params.fotoCarnetUrl,
          usuarioId: params.usuarioId,
          entradaId: params.entradaId,
          operadorId: params.operadorId,
        },
      });
    });
  }

  /**
   * Venta: SIEMPRE dos Transaccion con el mismo ventaId (consumo al dueño de la
   * Entrada + venta acreditada al negocio). Debe correr dentro del mismo
   * $transaction que crea la Venta -> recibe `tx` de VentasService.
   */
  async registrarVenta(
    tx: PrismaTx,
    params: {
      eventoId: string;
      ventaId: string;
      entradaId: string;
      duenoEntradaId: number;
      duenoNegocioId: number;
      monto: number;
      operadorId: number;
    },
  ) {
    const debito = await tx.usuario.updateMany({
      where: { id: params.duenoEntradaId, saldo: { gte: params.monto } },
      data: { saldo: { decrement: params.monto } },
    });
    if (debito.count === 0) {
      throw new SaldoInsuficienteException('Saldo insuficiente para esta venta');
    }

    const comprador = await tx.usuario.findUniqueOrThrow({
      where: { id: params.duenoEntradaId },
      select: { saldo: true },
    });
    const negocio = await tx.usuario.update({
      where: { id: params.duenoNegocioId },
      data: { saldo: { increment: params.monto } },
      select: { saldo: true },
    });

    await tx.transaccion.createMany({
      data: [
        {
          eventoId: params.eventoId,
          tipo: 'consumo',
          monto: params.monto,
          saldoResultante: comprador.saldo,
          usuarioId: params.duenoEntradaId,
          entradaId: params.entradaId,
          ventaId: params.ventaId,
          operadorId: params.operadorId,
        },
        {
          eventoId: params.eventoId,
          tipo: 'venta',
          monto: params.monto,
          saldoResultante: negocio.saldo,
          usuarioId: params.duenoNegocioId,
          entradaId: params.entradaId,
          ventaId: params.ventaId,
          operadorId: params.operadorId,
        },
      ],
    });
  }

  /**
   * Ajuste manual (ej. al resolver una IncidenciaRecarga). Crédito -> increment.
   * Recibe `tx` para correr dentro de la misma transacción que cierra el caso.
   */
  async ajustar(
    tx: PrismaTx,
    params: {
      eventoId: string;
      usuarioId: number;
      entradaId?: string;
      monto: number;
      operadorId: number;
    },
  ) {
    const usuario = await tx.usuario.update({
      where: { id: params.usuarioId },
      data: { saldo: { increment: params.monto } },
      select: { saldo: true },
    });

    return tx.transaccion.create({
      data: {
        eventoId: params.eventoId,
        tipo: 'ajuste',
        monto: params.monto,
        saldoResultante: usuario.saldo,
        usuarioId: params.usuarioId,
        entradaId: params.entradaId,
        operadorId: params.operadorId,
      },
    });
  }
}
