/* ============================================================================
 * src/modules/asignaciones/asignaciones.service.ts
 * Rol que cumple un usuario DENTRO de un evento (además de su rol global).
 * ========================================================================= */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearAsignacionDto } from './dto/crear-asignacion.dto';

@Injectable()
export class AsignacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(eventoId?: string) {
    return this.prisma.asignacion.findMany({
      where: eventoId ? { eventoId } : undefined,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, foto: true } },
      },
    });
  }

  /** Upsert: si el usuario ya está asignado a ese evento, actualiza el rol. */
  async asignar(dto: CrearAsignacionDto) {
    return this.prisma.asignacion.upsert({
      where: {
        eventoId_usuarioId: { eventoId: dto.eventoId, usuarioId: dto.usuarioId },
      },
      update: { rol: dto.rol },
      create: { eventoId: dto.eventoId, usuarioId: dto.usuarioId, rol: dto.rol },
    });
  }

  async quitar(id: string) {
    await this.prisma.asignacion.delete({ where: { id } });
  }
}
