/* ============================================================================
 * src/modules/dias-evento/dias-evento.service.ts
 *
 * Jornadas de un evento (DiaEvento). Cada evento tiene al menos una (se
 * auto-crea con el evento). `Evento.fecha`/`fechaFin` se resincronizan al
 * min(inicio)/max(fin) de las jornadas para no romper el resto del código que
 * lee esas fechas (landing, listados, validación de ingreso legacy, etc.).
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { verificarSinChoqueDeFechas } from '../../common/utils/choque-eventos.utils';
import {
  ActualizarDiaEventoDto,
  CrearDiaEventoDto,
} from './dto/dia-evento.dto';

@Injectable()
export class DiasEventoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  async listar(eventoId?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    return this.prisma.diaEvento.findMany({
      where: { eventoId },
      orderBy: { orden: 'asc' },
    });
  }

  /**
   * Recalcula Evento.fecha/fechaFin a partir de sus jornadas — y de paso
   * revalida que el evento siga sin cruzarse con ningún otro (§ un evento a
   * la vez): agregar/editar/borrar una jornada puede correr el rango entero.
   */
  private async resincronizarEvento(
    tx: Prisma.TransactionClient,
    eventoId: string,
  ) {
    const rango = await tx.diaEvento.aggregate({
      where: { eventoId },
      _min: { inicio: true },
      _max: { fin: true },
    });
    if (rango._min.inicio && rango._max.fin) {
      await verificarSinChoqueDeFechas(tx, {
        inicio: rango._min.inicio,
        fin: rango._max.fin,
        excluirEventoId: eventoId,
      });
      await tx.evento.update({
        where: { id: eventoId },
        data: { fecha: rango._min.inicio, fechaFin: rango._max.fin },
      });
    }
  }

  async crear(dto: CrearDiaEventoDto) {
    await this.eventoPolicy.porEvento(dto.eventoId);
    const inicio = new Date(dto.inicio);
    const fin = new Date(dto.fin);
    if (inicio >= fin) {
      throw new BadRequestException('La jornada debe empezar antes de terminar');
    }
    return this.prisma.$transaction(async (tx) => {
      const ultimo = await tx.diaEvento.findFirst({
        where: { eventoId: dto.eventoId },
        orderBy: { orden: 'desc' },
        select: { orden: true },
      });
      const dia = await tx.diaEvento.create({
        data: {
          eventoId: dto.eventoId,
          nombre: dto.nombre?.trim() || null,
          inicio,
          fin,
          orden: (ultimo?.orden ?? 0) + 1,
          aforoMaximo: dto.aforoMaximo ?? null,
        },
      });
      await this.resincronizarEvento(tx, dto.eventoId);
      return dia;
    });
  }

  async actualizar(id: string, dto: ActualizarDiaEventoDto) {
    const dia = await this.prisma.diaEvento.findUnique({ where: { id } });
    if (!dia) throw new NotFoundException('Jornada no encontrada');
    await this.eventoPolicy.porEvento(dia.eventoId);

    const inicio = dto.inicio ? new Date(dto.inicio) : dia.inicio;
    const fin = dto.fin ? new Date(dto.fin) : dia.fin;
    if (inicio >= fin) {
      throw new BadRequestException('La jornada debe empezar antes de terminar');
    }
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.diaEvento.update({
        where: { id },
        data: {
          nombre:
            dto.nombre === undefined ? undefined : dto.nombre.trim() || null,
          inicio: dto.inicio ? inicio : undefined,
          fin: dto.fin ? fin : undefined,
          aforoMaximo: dto.aforoMaximo,
        },
      });
      await this.resincronizarEvento(tx, dia.eventoId);
      return actualizado;
    });
  }

  async eliminar(id: string) {
    const dia = await this.prisma.diaEvento.findUnique({
      where: { id },
      include: { _count: { select: { categorias: true } } },
    });
    if (!dia) throw new NotFoundException('Jornada no encontrada');
    await this.eventoPolicy.porEvento(dia.eventoId);

    const total = await this.prisma.diaEvento.count({
      where: { eventoId: dia.eventoId },
    });
    if (total <= 1) {
      throw new ConflictException(
        'El evento necesita al menos una jornada; no se puede borrar la última',
      );
    }
    if (dia._count.categorias > 0) {
      throw new ConflictException(
        'Esta jornada ya tiene categorías de ticket: quitalas antes de borrarla',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.diaEvento.delete({ where: { id } });
      await this.resincronizarEvento(tx, dia.eventoId);
    });
  }
}
