/* ============================================================================
 * src/modules/corte-caja/corte-caja.service.ts
 *
 * Arqueo de caja de un operador con efectivo (Recargador / Devolucion), §5.2.
 * El "monto de sistema" sale de sumar las transacciones del operador en ese
 * evento dentro de la ventana [abiertaEn, ahora); la diferencia contra lo que
 * el operador declara al cerrar es el descuadre.
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { AbrirCajaDto, CerrarCajaDto } from './dto/corte-caja.dto';

@Injectable()
export class CorteCajaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Recargador recibe efectivo (tipo=recarga); Devolucion entrega efectivo (tipo=devolucion).
  private tipoDe(rol: Rol): 'recarga' | 'devolucion' {
    return rol === 'Devolucion' ? 'devolucion' : 'recarga';
  }

  private esperado(rol: Rol, montoInicial: number, montoSistema: number) {
    return rol === 'Devolucion'
      ? montoInicial - montoSistema
      : montoInicial + montoSistema;
  }

  private async sumaSistema(
    operadorId: number,
    eventoId: string,
    rol: Rol,
    desde: Date,
  ) {
    const agg = await this.prisma.transaccion.aggregate({
      _sum: { monto: true },
      where: {
        operadorId,
        eventoId,
        tipo: this.tipoDe(rol),
        createdAt: { gte: desde },
      },
    });
    return Number(agg._sum.monto ?? 0);
  }

  async abrir(actor: UsuarioJwt, dto: AbrirCajaDto) {
    await this.eventoPolicy.porEvento(dto.eventoId);

    if (actor.rol !== 'Admin') {
      const asignado = await this.prisma.asignacion.findUnique({
        where: {
          eventoId_usuarioId: {
            eventoId: dto.eventoId,
            usuarioId: actor.id,
          },
        },
      });
      if (!asignado) {
        throw new ForbiddenException('No estás asignado a este evento');
      }
    }

    const abierta = await this.prisma.corteCaja.findFirst({
      where: { operadorId: actor.id, eventoId: dto.eventoId, estado: 'abierta' },
    });
    if (abierta) return abierta; // idempotente para la UI

    return this.prisma.corteCaja.create({
      data: {
        eventoId: dto.eventoId,
        operadorId: actor.id,
        rol: actor.rol as Rol,
        montoInicial: dto.montoInicial ?? 0,
      },
    });
  }

  async actual(actor: UsuarioJwt, eventoId?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    const caja = await this.prisma.corteCaja.findFirst({
      where: { operadorId: actor.id, eventoId, estado: 'abierta' },
    });
    if (!caja) return null;
    const montoSistemaParcial = await this.sumaSistema(
      actor.id,
      eventoId,
      caja.rol,
      caja.abiertaEn,
    );
    return {
      ...caja,
      montoSistemaParcial,
      montoEsperadoParcial: this.esperado(
        caja.rol,
        Number(caja.montoInicial),
        montoSistemaParcial,
      ),
    };
  }

  async cerrar(actor: UsuarioJwt, id: string, dto: CerrarCajaDto) {
    const caja = await this.prisma.corteCaja.findUnique({ where: { id } });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    if (caja.estado !== 'abierta') {
      throw new ConflictException('Esta caja ya está cerrada');
    }
    if (caja.operadorId !== actor.id && actor.rol !== 'Admin') {
      throw new ForbiddenException('Esta caja no es tuya');
    }

    const montoSistema = await this.sumaSistema(
      caja.operadorId,
      caja.eventoId,
      caja.rol,
      caja.abiertaEn,
    );
    const montoEsperado = this.esperado(
      caja.rol,
      Number(caja.montoInicial),
      montoSistema,
    );

    const cerrada = await this.prisma.corteCaja.update({
      where: { id },
      data: {
        estado: 'cerrada',
        cerradaEn: new Date(),
        montoSistema,
        montoEsperado,
        montoDeclarado: dto.montoDeclarado,
        diferencia: dto.montoDeclarado - montoEsperado,
        observacion: dto.observacion,
        cerradaPorId: actor.id,
      },
    });
    await this.auditoria.registrar(null, {
      actorId: actor.id,
      entidad: 'corte_caja',
      entidadId: id,
      accion: 'cerrar',
      antes: { estado: caja.estado, montoInicial: caja.montoInicial },
      despues: {
        montoSistema: cerrada.montoSistema,
        montoEsperado: cerrada.montoEsperado,
        montoDeclarado: cerrada.montoDeclarado,
        diferencia: cerrada.diferencia,
      },
    });
    return cerrada;
  }

  async listar(actor: UsuarioJwt, eventoId?: string) {
    return this.prisma.corteCaja.findMany({
      where: {
        eventoId: eventoId || undefined,
        operadorId: actor.rol === 'Admin' ? undefined : actor.id,
      },
      orderBy: { abiertaEn: 'desc' },
      include: { operador: { select: { nombre: true } } },
    });
  }
}
