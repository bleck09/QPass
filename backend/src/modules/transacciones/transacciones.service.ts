/* ============================================================================
 * src/modules/transacciones/transacciones.service.ts
 *
 * EL LEDGER. El ÚNICO lugar del proyecto que escribe BilleteraEvento.saldo (C7).
 * El saldo cashless es POR EVENTO: cada movimiento toca la fila
 * billeteras_evento (usuarioId, eventoId). Todo pasa por acá; ningún otro
 * service toca el saldo. Los débitos que pueden dejar negativo
 * (consumo/venta/devolución) usan una sola sentencia guardada
 * (UPDATE ... WHERE saldo >= m RETURNING saldo). Los créditos hacen un upsert
 * atómico (la billetera puede no existir todavía).
 *
 * Métodos con `tx`: corren dentro del $transaction que abrió el caller
 * (VentasService, IncidenciasRecargaService) para no romper la atomicidad.
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MotivoDevolucion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { SaldoInsuficienteException } from '../../common/excepciones/dominio.excepciones';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CasosDuplicadoService } from '../casos-duplicado/casos-duplicado.service';
import { AjusteManualDto } from './dto/transacciones.dto';

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
    private readonly casosDuplicado: CasosDuplicadoService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /**
   * Crédito a la billetera del evento (crea la fila si no existe). Devuelve el
   * saldo posterior.
   */
  private async acreditar(
    tx: PrismaTx,
    usuarioId: number,
    eventoId: string,
    monto: number,
  ): Promise<Prisma.Decimal> {
    const fila = await tx.billeteraEvento.upsert({
      where: { usuarioId_eventoId: { usuarioId, eventoId } },
      create: { usuarioId, eventoId, saldo: monto },
      update: { saldo: { increment: monto } },
      select: { saldo: true },
    });
    return fila.saldo;
  }

  /**
   * §5.10 — débito atómico con guarda en UNA sola sentencia sobre la billetera
   * del evento. Devuelve el saldo posterior, o `null` si no alcanzó (o la
   * billetera todavía no existe = saldo 0).
   */
  private async debitarConGuarda(
    tx: PrismaTx,
    usuarioId: number,
    eventoId: string,
    monto: number,
  ): Promise<string | null> {
    // §5.10 — se guarda contra el saldo DISPONIBLE (saldo - saldoBloqueado): la
    // parte retenida por una IncidenciaRecarga pendiente no se puede gastar.
    const filas = await tx.$queryRaw<Array<{ saldo: string }>>(Prisma.sql`
      UPDATE "billeteras_evento"
      SET "saldo" = "saldo" - ${monto}
      WHERE "usuarioId" = ${usuarioId}
        AND "eventoId" = ${eventoId}
        AND "saldo" - "saldoBloqueado" >= ${monto}
      RETURNING "saldo"
    `);
    return filas.length ? String(filas[0].saldo) : null;
  }

  /**
   * §5.10 — retiene parte del saldo por una IncidenciaRecarga pendiente. Solo
   * bloquea lo que hay DISPONIBLE (si ya lo gastó, se bloquea lo que quede).
   * Debe correr dentro del $transaction del que la llama. Devuelve lo bloqueado.
   */
  async bloquearSaldo(
    tx: PrismaTx,
    usuarioId: number,
    eventoId: string,
    monto: number,
  ): Promise<number> {
    if (monto <= 0) return 0;
    const fila = await tx.billeteraEvento.findUnique({
      where: { usuarioId_eventoId: { usuarioId, eventoId } },
      select: { saldo: true, saldoBloqueado: true },
    });
    if (!fila) return 0;
    const disponible = Number(fila.saldo) - Number(fila.saldoBloqueado);
    const aBloquear = Math.max(0, Math.min(monto, disponible));
    if (aBloquear === 0) return 0;
    await tx.billeteraEvento.update({
      where: { usuarioId_eventoId: { usuarioId, eventoId } },
      data: { saldoBloqueado: { increment: aBloquear } },
    });
    return aBloquear;
  }

  /** Libera saldo retenido (al resolver la incidencia). */
  async liberarSaldo(
    tx: PrismaTx,
    usuarioId: number,
    eventoId: string,
    monto: number,
  ): Promise<void> {
    if (monto <= 0) return;
    await tx.$executeRaw(Prisma.sql`
      UPDATE "billeteras_evento"
      SET "saldoBloqueado" = GREATEST("saldoBloqueado" - ${monto}, 0),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "usuarioId" = ${usuarioId} AND "eventoId" = ${eventoId}
    `);
  }

  /**
   * §5.2 — la caja de efectivo abierta del operador para ese evento. El
   * Recargador/Devolución tiene que abrir su arqueo antes de mover efectivo, así
   * cada recarga/devolución queda estampada con su `corteCajaId` y el cierre
   * cuadra sumando por ahí. El Admin queda exento (correcciones, sin turno).
   */
  private async cajaObligatoria(
    tx: PrismaTx,
    operador: { id: number; rol: string },
    eventoId: string,
    accion: string,
  ): Promise<string | null> {
    if (operador.rol === 'Admin') return null;
    const caja = await tx.corteCaja.findFirst({
      where: { operadorId: operador.id, eventoId, estado: 'abierta' },
      select: { id: true },
    });
    if (!caja) {
      throw new ConflictException(
        `Abrí tu caja para este evento antes de ${accion}.`,
      );
    }
    return caja.id;
  }

  /**
   * §5.2 — el efectivo físico de una caja de Devolución es finito: no se
   * puede devolver más de lo que entró como `montoInicial` menos lo que ya
   * se devolvió con ESA misma caja. Si se agota, hay que cerrarla (arqueo) y
   * abrir una nueva con más fondo — no seguir pagando de una caja vacía.
   * El Admin nunca llega hasta acá (cajaObligatoria le devuelve `null` antes).
   */
  private async verificarEfectivoDisponible(
    tx: PrismaTx,
    corteCajaId: string,
    monto: number,
  ) {
    const caja = await tx.corteCaja.findUniqueOrThrow({
      where: { id: corteCajaId },
      select: { montoInicial: true },
    });
    const agg = await tx.transaccion.aggregate({
      _sum: { monto: true },
      where: { corteCajaId, tipo: 'devolucion' },
    });
    const yaDevuelto = Number(agg._sum.monto ?? 0);
    const disponible = Number(caja.montoInicial) - yaDevuelto;
    if (monto > disponible) {
      throw new ConflictException(
        `Tu caja no tiene suficiente efectivo: quedan Bs. ${disponible.toFixed(2)} disponibles. ` +
          'Cerrala y abrí una nueva con más fondo para seguir devolviendo.',
      );
    }
  }

  async listar(filtros: FiltrosTransaccion) {
    if (!filtros.usuarioId && !filtros.entradaId && !filtros.eventoId) {
      throw new BadRequestException(
        'usuarioId, entradaId o eventoId es requerido',
      );
    }
    const filas = await this.prisma.transaccion.findMany({
      where: {
        usuarioId: filtros.usuarioId,
        entradaId: filtros.entradaId,
        eventoId: filtros.eventoId,
        tipo: (filtros.tipo as Prisma.EnumTipoTransaccionFilter) || undefined,
      },
      include: {
        operador: { select: { id: true, nombre: true } },
        entrada: {
          select: {
            id: true, nombre: true, foto: true,
            usuario: { select: { ci: true } },
          },
        },
        evento: { select: { id: true, nombre: true } },
        // Detalle de la compra (consumo / reverso_consumo): puesto y productos,
        // para que "Mi historial" muestre en qué se gastó y no solo el monto.
        venta: {
          select: {
            id: true,
            montoTotal: true,
            anuladaEn: true,
            motivoAnulacion: true,
            puesto: { select: { id: true, base: { select: { nombre: true } } } },
            items: {
              select: {
                cantidad: true,
                nombreProducto: true,
                precioUnitario: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // El nombre del puesto vive en PuestoBase; se aplana para el front.
    return filas.map((f) =>
      f.venta
        ? {
            ...f,
            venta: {
              id: f.venta.id,
              montoTotal: f.venta.montoTotal,
              anuladaEn: f.venta.anuladaEn,
              motivoAnulacion: f.venta.motivoAnulacion,
              items: f.venta.items,
              puesto: f.venta.puesto
                ? { id: f.venta.puesto.id, nombre: f.venta.puesto.base.nombre }
                : null,
            },
          }
        : f,
    );
  }

  /**
   * Recarga: acredita a la billetera del dueño de la Entrada PARA EL EVENTO de
   * esa entrada. Crédito -> upsert, nunca deja negativo.
   */
  async recargar(params: {
    entradaId: string;
    eventoId?: string;
    monto: number;
    operador: { id: number; rol: string };
    codigoQr?: string;
  }) {
    await this.casosDuplicado.asegurarManillaUsable(params.codigoQr, {
      actor: params.operador as UsuarioJwt,
      contexto: 'recarga',
    });
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
      // La manilla tiene que ser del evento donde está el recargador.
      if (params.eventoId && params.eventoId !== entrada.eventoId) {
        throw new ConflictException(
          'Esta manilla pertenece a otro evento: no se puede recargar desde este puesto.',
        );
      }

      const corteCajaId = await this.cajaObligatoria(
        tx,
        params.operador,
        entrada.eventoId,
        'recargar',
      );

      const usuario = await tx.usuario.findUniqueOrThrow({
        where: { id: entrada.usuarioId },
        select: { id: true, nombre: true, email: true, rol: true },
      });
      const saldo = await this.acreditar(
        tx,
        entrada.usuarioId,
        entrada.eventoId,
        params.monto,
      );

      const transaccion = await tx.transaccion.create({
        data: {
          eventoId: entrada.eventoId,
          tipo: 'recarga',
          monto: params.monto,
          saldoResultante: saldo,
          usuarioId: usuario.id,
          entradaId: params.entradaId,
          operadorId: params.operador.id,
          corteCajaId,
        },
      });

      return { usuario: { ...usuario, saldo }, transaccion };
    });
  }

  /**
   * Devolución: retira saldo de la billetera del Usuario PARA ESE EVENTO. Débito
   * guardado: si no alcanza, aborta sin dejar negativo.
   */
  async devolver(params: {
    usuarioId: number;
    entradaId?: string;
    monto: number;
    fotoCarnetUrl: string;
    fotoRostroUrl?: string;
    eventoId: string;
    operador: { id: number; rol: string };
    motivoDevolucion?: MotivoDevolucion;
    nota?: string;
    codigoQr?: string;
  }) {
    await this.casosDuplicado.asegurarManillaUsable(params.codigoQr, {
      actor: params.operador as UsuarioJwt,
      contexto: 'devolucion',
    });
    await this.eventoPolicy.porEvento(params.eventoId);
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id: params.usuarioId },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      // La manilla escaneada tiene que ser del evento donde está el operador.
      if (params.entradaId) {
        const entrada = await tx.entrada.findUnique({
          where: { id: params.entradaId },
          select: { eventoId: true },
        });
        if (entrada && entrada.eventoId !== params.eventoId) {
          throw new ConflictException(
            'Esta manilla pertenece a otro evento: no se puede hacer la devolución desde este puesto.',
          );
        }
      }

      const corteCajaId = await this.cajaObligatoria(
        tx,
        params.operador,
        params.eventoId,
        'registrar devoluciones',
      );
      if (corteCajaId) {
        await this.verificarEfectivoDisponible(tx, corteCajaId, params.monto);
      }

      // §T&C — el saldo de un evento se puede retirar hasta expiraEn (fijado por
      // el cron: fechaFin + Evento.diasParaRetiro). Pasado ese plazo, no.
      const billetera = await tx.billeteraEvento.findUnique({
        where: {
          usuarioId_eventoId: {
            usuarioId: params.usuarioId,
            eventoId: params.eventoId,
          },
        },
        select: { expiraEn: true },
      });
      if (billetera?.expiraEn && new Date() > billetera.expiraEn) {
        throw new ConflictException(
          `El plazo para retirar el saldo de este evento venció el ${billetera.expiraEn.toLocaleDateString('es-BO')}.`,
        );
      }

      const saldoPost = await this.debitarConGuarda(
        tx,
        params.usuarioId,
        params.eventoId,
        params.monto,
      );
      if (saldoPost === null) {
        throw new SaldoInsuficienteException('Saldo insuficiente para el retiro');
      }

      return tx.transaccion.create({
        data: {
          eventoId: params.eventoId,
          tipo: 'devolucion',
          monto: params.monto,
          saldoResultante: saldoPost,
          fotoCarnetUrl: params.fotoCarnetUrl,
          fotoRostroUrl: params.fotoRostroUrl,
          motivoDevolucion: params.motivoDevolucion,
          nota: params.nota,
          usuarioId: params.usuarioId,
          entradaId: params.entradaId,
          operadorId: params.operador.id,
          corteCajaId,
        },
      });
    });
  }

  /**
   * Venta: SIEMPRE dos Transaccion con el mismo ventaId (consumo al dueño de la
   * Entrada + venta acreditada al negocio), ambas en la billetera del evento.
   * Corre dentro del $transaction que crea la Venta.
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
    const saldoComprador = await this.debitarConGuarda(
      tx,
      params.duenoEntradaId,
      params.eventoId,
      params.monto,
    );
    if (saldoComprador === null) {
      throw new SaldoInsuficienteException('Saldo insuficiente para esta venta');
    }

    const saldoNegocio = await this.acreditar(
      tx,
      params.duenoNegocioId,
      params.eventoId,
      params.monto,
    );

    await tx.transaccion.createMany({
      data: [
        {
          eventoId: params.eventoId,
          tipo: 'consumo',
          monto: params.monto,
          saldoResultante: saldoComprador,
          usuarioId: params.duenoEntradaId,
          entradaId: params.entradaId,
          ventaId: params.ventaId,
          operadorId: params.operadorId,
        },
        {
          eventoId: params.eventoId,
          tipo: 'venta',
          monto: params.monto,
          saldoResultante: saldoNegocio,
          usuarioId: params.duenoNegocioId,
          entradaId: params.entradaId,
          ventaId: params.ventaId,
          operadorId: params.operadorId,
        },
      ],
    });
  }

  /**
   * Ajuste manual (ej. al resolver una IncidenciaRecarga). Crédito a la
   * billetera del evento. Recibe `tx` para correr dentro de la misma transacción
   * que cierra el caso.
   */
  async ajustar(
    tx: PrismaTx,
    params: {
      eventoId: string;
      usuarioId: number;
      entradaId?: string;
      monto: number;
      operadorId: number;
      nota?: string;
    },
  ) {
    const saldo = await this.acreditar(
      tx,
      params.usuarioId,
      params.eventoId,
      params.monto,
    );

    return tx.transaccion.create({
      data: {
        eventoId: params.eventoId,
        tipo: 'ajuste',
        monto: params.monto,
        saldoResultante: saldo,
        usuarioId: params.usuarioId,
        entradaId: params.entradaId,
        operadorId: params.operadorId,
        nota: params.nota,
      },
    });
  }

  /**
   * Ajuste MANUAL de Admin (tipo=ajuste_manual): crédito a la billetera del
   * dueño de la Entrada en su evento. Caso típico: el organizador decide
   * reponer lo que consumió el falso de un CasoDuplicado. Es una fila NUEVA del
   * ledger; las ventas/consumos originales quedan como estaban.
   */
  async ajusteManual(dto: AjusteManualDto, adminId: number) {
    await this.eventoPolicy.porEntrada(dto.entradaId);
    return this.prisma.$transaction(async (tx) => {
      const entrada = await tx.entrada.findUnique({
        where: { id: dto.entradaId },
      });
      if (!entrada) throw new NotFoundException('Entrada no encontrada');
      if (!entrada.usuarioId) {
        throw new BadRequestException(
          'Esta entrada todavía no tiene una cuenta vinculada',
        );
      }
      if (dto.casoDuplicadoId) {
        const caso = await tx.casoDuplicado.findUnique({
          where: { id: dto.casoDuplicadoId },
          select: { entradaId: true },
        });
        if (!caso || caso.entradaId !== dto.entradaId) {
          throw new BadRequestException('Ese caso de duplicado no es de esta entrada');
        }
      }

      const saldo = await this.acreditar(
        tx,
        entrada.usuarioId,
        entrada.eventoId,
        dto.monto,
      );
      const nota = dto.casoDuplicadoId
        ? `[Caso duplicado ${dto.casoDuplicadoId}] ${dto.nota.trim()}`
        : dto.nota.trim();
      const transaccion = await tx.transaccion.create({
        data: {
          eventoId: entrada.eventoId,
          tipo: 'ajuste_manual',
          monto: dto.monto,
          saldoResultante: saldo,
          usuarioId: entrada.usuarioId,
          entradaId: dto.entradaId,
          operadorId: adminId,
          nota,
        },
      });
      await this.auditoria.registrar(tx, {
        actorId: adminId,
        entidad: 'transaccion',
        entidadId: transaccion.id,
        accion: 'ajuste_manual',
        despues: transaccion,
      });
      return { transaccion, saldo };
    });
  }

  /**
   * Revierte las 2 filas de una Venta anulada (§5.3), espejo de registrarVenta:
   * le quita el saldo al negocio (guardado) y se lo reintegra al comprador, todo
   * en la billetera del evento. Deja 2 filas nuevas (reverso_venta /
   * reverso_consumo) con el mismo ventaId.
   */
  async anularVenta(
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
    const saldoNegocio = await this.debitarConGuarda(
      tx,
      params.duenoNegocioId,
      params.eventoId,
      params.monto,
    );
    if (saldoNegocio === null) {
      throw new ConflictException(
        'El negocio ya retiró ese saldo; no se puede revertir automáticamente, hacé un ajuste manual.',
      );
    }

    const saldoComprador = await this.acreditar(
      tx,
      params.duenoEntradaId,
      params.eventoId,
      params.monto,
    );

    await tx.transaccion.createMany({
      data: [
        {
          eventoId: params.eventoId,
          tipo: 'reverso_venta',
          monto: params.monto,
          saldoResultante: saldoNegocio,
          usuarioId: params.duenoNegocioId,
          entradaId: params.entradaId,
          ventaId: params.ventaId,
          operadorId: params.operadorId,
          nota: 'anulación de venta',
        },
        {
          eventoId: params.eventoId,
          tipo: 'reverso_consumo',
          monto: params.monto,
          saldoResultante: saldoComprador,
          usuarioId: params.duenoEntradaId,
          entradaId: params.entradaId,
          ventaId: params.ventaId,
          operadorId: params.operadorId,
          nota: 'anulación de venta',
        },
      ],
    });
  }
}
