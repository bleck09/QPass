/* ============================================================================
 * src/modules/incidencias-recarga/incidencias-recarga.service.ts
 *
 * Reporte de un Recargador cuando la recarga entregada no coincidió con lo
 * pedido. Solo Admin la resuelve: aplica un ajuste al saldo (vía
 * TransaccionesService.ajustar, C7) y cierra el caso — todo en un $transaction.
 * ========================================================================= */

import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoCaso, Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { TransaccionesService } from '../transacciones/transacciones.service';
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

    return this.prisma.incidenciaRecarga.create({
      data: {
        eventoId: entrada.eventoId,
        entradaId: dto.entradaId,
        montoEntregado: dto.montoEntregado,
        montoSolicitado: dto.montoSolicitado,
        nota: dto.nota,
        recargadorId,
      },
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

    const valor = dto.ajusteAplicado;

    return this.prisma.$transaction(async (tx) => {
      if (valor > 0) {
        const entrada = await tx.entrada.findUniqueOrThrow({
          where: { id: incidencia.entradaId },
        });
        if (entrada.usuarioId) {
          await this.transacciones.ajustar(tx, {
            eventoId: incidencia.eventoId,
            usuarioId: entrada.usuarioId,
            entradaId: entrada.id,
            monto: valor,
            operadorId: adminId,
          });
        }
      }
      return tx.incidenciaRecarga.update({
        where: { id: incidencia.id },
        data: {
          estado: 'resuelto',
          ajusteAplicado: valor,
          resueltoPorId: adminId,
          resueltoEn: new Date(),
        },
      });
    });
  }
}
