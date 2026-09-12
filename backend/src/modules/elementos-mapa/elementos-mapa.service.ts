/* ============================================================================
 * src/modules/elementos-mapa/elementos-mapa.service.ts
 *
 * ElementoMapa es un cuadro del plano que NO es un negocio (entrada, baños,
 * escenario, recargador, supervisor, otro) — ver Puesto para los que sí lo
 * son. Lo crea/edita/borra directamente el Admin desde Mapa.jsx; no hay
 * catálogo ni ventas detrás, así que a diferencia de Puesto sí se elimina de
 * verdad en vez de solo ocultarse.
 * ========================================================================= */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { CrearElementoMapaDto } from './dto/crear-elemento-mapa.dto';
import { ActualizarElementoMapaDto } from './dto/actualizar-elemento-mapa.dto';

@Injectable()
export class ElementosMapaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  async listar(eventoId: string) {
    return this.prisma.elementoMapa.findMany({
      where: { eventoId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async crear(dto: CrearElementoMapaDto) {
    await this.eventoPolicy.porEvento(dto.eventoId);
    return this.prisma.elementoMapa.create({
      data: { eventoId: dto.eventoId, tipo: dto.tipo, nombre: dto.nombre },
    });
  }

  async actualizar(id: string, dto: ActualizarElementoMapaDto) {
    await this.eventoPolicy.porElementoMapa(id);
    const existe = await this.prisma.elementoMapa.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Elemento no encontrado');
    return this.prisma.elementoMapa.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo,
        x: dto.x,
        y: dto.y,
        ancho: dto.ancho,
        alto: dto.alto,
      },
    });
  }

  async eliminar(id: string) {
    await this.eventoPolicy.porElementoMapa(id);
    const existe = await this.prisma.elementoMapa.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Elemento no encontrado');
    await this.prisma.elementoMapa.delete({ where: { id } });
    return { eliminado: true };
  }
}
