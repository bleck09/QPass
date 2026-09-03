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
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
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

    return this.prisma.asignacion.upsert({
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
  }

  async quitar(id: string) {
    await this.eventoPolicy.porAsignacion(id);
    await this.prisma.asignacion.delete({ where: { id } });
  }
}
