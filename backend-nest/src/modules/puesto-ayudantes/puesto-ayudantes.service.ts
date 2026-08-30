/* ============================================================================
 * src/modules/puesto-ayudantes/puesto-ayudantes.service.ts
 * Un Ayudante puede trabajar en varios Puesto, pero SIEMPRE del mismo Usuario
 * Negocio (Usuario.negocioAsignadoId) — nunca de dos negocios distintos.
 * ========================================================================= */

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { CrearPuestoAyudanteDto } from './dto/crear-puesto-ayudante.dto';

@Injectable()
export class PuestoAyudantesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(puestoId?: string, ayudanteId?: number) {
    return this.prisma.puestoAyudante.findMany({
      where: { puestoId, ayudanteId },
      include: {
        ayudante: { select: { id: true, nombre: true, email: true, foto: true } },
        puesto: true,
      },
    });
  }

  async asignar(dto: CrearPuestoAyudanteDto, actor: UsuarioJwt) {
    const puesto = await this.prisma.puesto.findUnique({
      where: { id: dto.puestoId },
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');
    if (actor.rol === 'UsuarioNegocio' && puesto.negocioId !== actor.id) {
      throw new ForbiddenException('Ese puesto no es tuyo');
    }

    const ayudante = await this.prisma.usuario.findUnique({
      where: { id: dto.ayudanteId },
    });
    if (!ayudante) throw new NotFoundException('Ayudante no encontrado');
    if (
      ayudante.negocioAsignadoId &&
      ayudante.negocioAsignadoId !== puesto.negocioId
    ) {
      throw new ConflictException('Este ayudante ya pertenece a otro negocio');
    }

    const turno = dto.turno || 'Día';
    const [asignacion] = await this.prisma.$transaction([
      this.prisma.puestoAyudante.upsert({
        where: {
          puestoId_ayudanteId: {
            puestoId: dto.puestoId,
            ayudanteId: dto.ayudanteId,
          },
        },
        update: { turno },
        create: {
          puestoId: dto.puestoId,
          ayudanteId: dto.ayudanteId,
          turno,
          creadoPorId: puesto.negocioId,
        },
      }),
      ...(ayudante.negocioAsignadoId
        ? []
        : [
            this.prisma.usuario.update({
              where: { id: ayudante.id },
              data: { negocioAsignadoId: puesto.negocioId },
            }),
          ]),
    ]);

    return asignacion;
  }

  async quitar(id: string) {
    await this.prisma.puestoAyudante.delete({ where: { id } });
  }
}
