/* ============================================================================
 * src/modules/landing-config/landing-config.service.ts
 * Configuración publicada de la landing pública de un evento (una por evento).
 * ========================================================================= */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GuardarLandingConfigDto } from './dto/guardar-landing-config.dto';

@Injectable()
export class LandingConfigService {
  constructor(private readonly prisma: PrismaService) {}

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
    };
    return this.prisma.landingConfig.upsert({
      where: { eventoId },
      update: data,
      create: { eventoId, ...data },
    });
  }
}
