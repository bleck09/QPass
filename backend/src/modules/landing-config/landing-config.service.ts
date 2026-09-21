/* ============================================================================
 * src/modules/landing-config/landing-config.service.ts
 * Configuración publicada de la landing pública de un evento (una por evento).
 * ========================================================================= */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { GuardarLandingConfigDto } from './dto/guardar-landing-config.dto';

// Rangos del ajuste de la imagen del encabezado (mismos que ofrece el editor).
const RANGOS_AJUSTE = {
  x: [0, 100],
  y: [0, 100],
  zoom: [100, 200],
  oscurecer: [0, 80],
  desenfoque: [0, 8],
} as const;

/**
 * Deja el ajuste de imagen solo con claves conocidas y números dentro de
 * rango (el campo es JSON libre en la BD). `null` = sin ajuste.
 */
function normalizarAjusteImagen(ajuste: unknown) {
  if (!ajuste || typeof ajuste !== 'object') return null;
  const entrada = ajuste as Record<string, unknown>;
  const limpio: Record<string, number> = {};
  for (const [clave, [min, max]] of Object.entries(RANGOS_AJUSTE)) {
    const valor = Number(entrada[clave]);
    if (Number.isFinite(valor)) limpio[clave] = Math.min(max, Math.max(min, valor));
  }
  return Object.keys(limpio).length ? limpio : null;
}

@Injectable()
export class LandingConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  async obtener(eventoId: string) {
    const config = await this.prisma.landingConfig.findUnique({
      where: { eventoId },
    });
    if (!config) {
      throw new NotFoundException('Este evento no tiene landing configurada');
    }
    return config;
  }

  async guardar(eventoId: string, dto: GuardarLandingConfigDto) {
    await this.eventoPolicy.porEvento(eventoId);
    const data = {
      titulo: dto.titulo,
      informacion: dto.informacion,
      imagen: dto.imagen,
      colorPrimario: dto.colorPrimario,
      colorBoton: dto.colorBoton,
      colorFondo: dto.colorFondo,
      colorTextoTitulo: dto.colorTextoTitulo,
      colorTextoP: dto.colorTextoP,
      actividades: dto.actividades,
      cronograma: dto.cronograma,
      // undefined = no se mandó (se deja como estaba); null = sin ajuste.
      ...(dto.imagenAjuste !== undefined && {
        imagenAjuste: normalizarAjusteImagen(dto.imagenAjuste) ?? Prisma.DbNull,
      }),
    };
    return this.prisma.landingConfig.upsert({
      where: { eventoId },
      update: data,
      create: { eventoId, ...data },
    });
  }
}
