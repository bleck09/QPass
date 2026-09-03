/* ============================================================================
 * src/modules/puestos/puestos.service.ts
 * Puesto/stand de un Usuario Negocio dentro de un evento.
 * ========================================================================= */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { CrearPuestoDto } from './dto/crear-puesto.dto';
import { ActualizarPuestoDto } from './dto/actualizar-puesto.dto';

@Injectable()
export class PuestosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  async listar(eventoId?: string, negocioId?: number) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    return this.prisma.puesto.findMany({
      where: { eventoId, negocioId },
      include: { productos: true, ayudantes: { include: { ayudante: true } } },
    });
  }

  async crear(dto: CrearPuestoDto, actor: UsuarioJwt) {
    await this.eventoPolicy.porEvento(dto.eventoId);
    const negocioId =
      actor.rol === 'UsuarioNegocio' ? actor.id : (dto.negocioId as number);
    return this.prisma.puesto.create({
      data: {
        eventoId: dto.eventoId,
        negocioId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        logo: dto.logo,
      },
    });
  }

  async actualizar(id: string, dto: ActualizarPuestoDto) {
    await this.eventoPolicy.porPuesto(id);
    return this.prisma.puesto.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        logo: dto.logo,
        categoria: dto.categoria,
        x: dto.x,
        y: dto.y,
        ancho: dto.ancho,
        alto: dto.alto,
        estadoActivo: dto.estadoActivo,
      },
    });
  }
}
