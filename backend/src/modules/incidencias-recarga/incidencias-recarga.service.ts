/* ============================================================================
 * src/modules/incidencias-recarga/incidencias-recarga.service.ts
 *
 * Reporte de un Recargador cuando la recarga entregada no coincidió con lo
 * pedido. Solo Admin la resuelve: aplica un ajuste al saldo (vía
 * TransaccionesService.ajustar, C7) y cierra el caso — todo en un $transaction.
 * ========================================================================= */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCaso, Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { TransaccionesService } from '../transacciones/transacciones.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import {
  CrearIncidenciaRecargaDto,
  ResolverIncidenciaRecargaDto,
} from './dto/incidencias-recarga.dto';

@Injectable()
export class IncidenciasRecargaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
    private readonly transacciones: TransaccionesService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(
    actor: UsuarioJwt,
    filtros: { estado?: EstadoCaso; eventoId?: string },
  ) {
    const where =
      actor.rol === ('Recargador' as Rol) ? { recargadorId: actor.id } : {};
    return this.prisma.incidenciaRecarga.findMany({
      where: {
        ...where,
        estado: filtros.estado,
        eventoId: filtros.eventoId,
      },
      include: {
        entrada: { select: { nombre: true, documento: true, foto: true } },
        evento: { select: { nombre: true } },
        recargador: { select: { nombre: true } },
        resueltoPor: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async crear(dto: CrearIncidenciaRecargaDto, recargadorId: number) {
    await this.eventoPolicy.porEntrada(dto.entradaId);
    const entrada = await this.prisma.entrada.findUnique({
      where: { id: dto.entradaId },
    });
    if (!entrada) throw new NotFoundException('Entrada no encontrada');

    // Si se le cargó de MÁS (entregado > pagado), se retiene la diferencia del
    // saldo del titular hasta que Admin resuelva: así no la puede gastar y que
    // después no alcance para descontarla (§5.10).
    const sobrecarga =
      dto.montoSolicitado != null
        ? Math.max(0, dto.montoEntregado - dto.montoSolicitado)
        : 0;

    return this.prisma.$transaction(async (tx) => {
      let montoBloqueado = 0;
      if (sobrecarga > 0 && entrada.usuarioId) {
        montoBloqueado = await this.transacciones.bloquearSaldo(
          tx,
          entrada.usuarioId,
          entrada.eventoId,
          sobrecarga,
        );
      }
      return tx.incidenciaRecarga.create({
        data: {
          eventoId: entrada.eventoId,
          entradaId: dto.entradaId,
          montoEntregado: dto.montoEntregado,
          montoSolicitado: dto.montoSolicitado,
          montoBloqueado,
          nota: dto.nota,
          recargadorId,
        },
      });
    });
  }

  async resolver(
    id: string,
    dto: ResolverIncidenciaRecargaDto,
    adminId: number,
  ) {
    const incidencia = await this.prisma.incidenciaRecarga.findUnique({
      where: { id },
    });
    if (!incidencia) throw new NotFoundException('Incidencia no encontrada');
    await this.eventoPolicy.porEvento(incidencia.eventoId);

    if (incidencia.estado === 'resuelto') {
      throw new ConflictException('Esta incidencia ya está resuelta');
    }
    const valor = dto.ajusteAplicado;

    return this.prisma.$transaction(async (tx) => {
      const entrada = await tx.entrada.findUniqueOrThrow({
        where: { id: incidencia.entradaId },
      });

      // 1) Liberar lo que se había retenido al abrir la incidencia.
      if (entrada.usuarioId && Number(incidencia.montoBloqueado) > 0) {
        await this.transacciones.liberarSaldo(
          tx,
          entrada.usuarioId,
          incidencia.eventoId,
          Number(incidencia.montoBloqueado),
        );
      }

      // 2) Aplicar el ajuste firmado (>0 acredita, <0 descuenta, 0 nada).
      if (valor !== 0 && entrada.usuarioId) {
        await this.transacciones.ajustar(tx, {
          eventoId: incidencia.eventoId,
          usuarioId: entrada.usuarioId,
          entradaId: entrada.id,
          monto: valor,
          operadorId: adminId,
        });
      }
      const resuelta = await tx.incidenciaRecarga.update({
        where: { id: incidencia.id },
        data: {
          estado: 'resuelto',
          ajusteAplicado: valor,
          resueltoPorId: adminId,
          resueltoEn: new Date(),
        },
      });
      await this.auditoria.registrar(tx, {
        actorId: adminId,
        entidad: 'incidencia_recarga',
        entidadId: incidencia.id,
        accion: 'resolver',
        antes: { estado: incidencia.estado, montoEntregado: incidencia.montoEntregado },
        despues: { estado: 'resuelto', ajusteAplicado: valor },
      });
      return resuelta;
    });
  }
}
