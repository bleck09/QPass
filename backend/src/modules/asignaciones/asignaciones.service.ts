/* ============================================================================
 * src/modules/asignaciones/asignaciones.service.ts
 * Rol que cumple un usuario DENTRO de un evento (además de su rol global).
 * ========================================================================= */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Rol } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { CodigosRetiroNegocioService } from '../codigos-retiro-negocio/codigos-retiro-negocio.service';
import { CrearAsignacionDto } from './dto/crear-asignacion.dto';

// Roles que SÍ trabajan un evento concreto (los demás no se asignan).
const ROLES_ASIGNABLES: Rol[] = [
  'Cliente',
  'Supervisor',
  'UsuarioNegocio',
  'Recargador',
  'Devolucion',
];

@Injectable()
export class AsignacionesService {
  private readonly logger = new Logger('AsignacionesService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
    private readonly codigosRetiroNegocio: CodigosRetiroNegocioService,
  ) {}

  async listar(eventoId?: string, usuarioId?: number, rol?: Rol) {
    const where: Prisma.AsignacionWhereInput = {};
    if (eventoId) where.eventoId = eventoId;
    if (usuarioId != null) where.usuarioId = usuarioId;
    if (rol && (Object.values(Rol) as string[]).includes(rol)) where.rol = rol;

    return this.prisma.asignacion.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, foto: true } },
      },
    });
  }

  /**
   * Upsert de la membresía de un usuario a un evento. El rol EN el evento es
   * siempre el rol de la cuenta (Usuario.rol) — no se elige aparte, así no puede
   * quedar una asignación "Supervisor" sobre una cuenta Recargador (que dejaría
   * a esa persona sin ver el evento en su panel).
   */
  async asignar(dto: CrearAsignacionDto) {
    await this.eventoPolicy.porEvento(dto.eventoId);
    const [evento, usuario] = await Promise.all([
      this.prisma.evento.findUnique({ where: { id: dto.eventoId } }),
      this.prisma.usuario.findUnique({ where: { id: dto.usuarioId } }),
    ]);
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (!ROLES_ASIGNABLES.includes(usuario.rol)) {
      throw new BadRequestException(
        `Una cuenta ${usuario.rol} no se asigna a eventos`,
      );
    }

    const asignacion = await this.prisma.asignacion.upsert({
      where: {
        eventoId_usuarioId: { eventoId: dto.eventoId, usuarioId: dto.usuarioId },
      },
      update: { rol: usuario.rol },
      create: {
        eventoId: dto.eventoId,
        usuarioId: dto.usuarioId,
        rol: usuario.rol,
      },
    });

    // Asignar a alguien como Cliente = es el organizador del evento. Se refleja
    // en Evento.clienteId (lo que mira el dashboard del cliente, §5.1); la
    // Asignacion sola no alcanza.
    if (usuario.rol === 'Cliente' && evento.clienteId !== dto.usuarioId) {
      await this.prisma.evento.update({
        where: { id: dto.eventoId },
        data: { clienteId: dto.usuarioId },
      });
    }

    // Un Usuario Negocio necesita su código de retiro para el evento; se crea
    // acá (fire-and-forget: si falla, no rompe la asignación).
    if (usuario.rol === 'UsuarioNegocio') {
      this.codigosRetiroNegocio
        .asegurar(dto.eventoId, dto.usuarioId)
        .catch((e) =>
          this.logger.warn(`No se pudo crear el código de retiro: ${e}`),
        );
    }

    return asignacion;
  }

  async quitar(id: string) {
    await this.eventoPolicy.porAsignacion(id);
    const asignacion = await this.prisma.asignacion.findUnique({ where: { id } });
    await this.prisma.asignacion.delete({ where: { id } });

    // Si se quita al Cliente organizador, se desvincula del evento.
    if (asignacion?.rol === 'Cliente') {
      await this.prisma.evento.updateMany({
        where: { id: asignacion.eventoId, clienteId: asignacion.usuarioId },
        data: { clienteId: null },
      });
    }
  }
}
