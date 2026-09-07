/* ============================================================================
 * src/modules/auditoria/auditoria.service.ts
 *
 * Registro de auditoría (§5.8). `registrar()` es fire-and-forget: si falla, se
 * loguea pero NUNCA rompe la operación de negocio que lo llamó.
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { rangoFechas } from '../../common/utils/fechas.utils';

const PAGINA_TAM = 50;

interface DatosAuditoria {
  actorId: number;
  entidad: string;
  entidadId: string;
  accion: string;
  antes?: unknown;
  despues?: unknown;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger('AuditoriaService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Anota una escritura sensible. Pasar `tx` cuando se llama dentro de un
   * $transaction (para que quede junto con el cambio auditado); si no, null.
   */
  async registrar(
    tx: Prisma.TransactionClient | null,
    datos: DatosAuditoria,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    try {
      await db.registroAuditoria.create({
        data: {
          actorId: datos.actorId,
          entidad: datos.entidad,
          entidadId: datos.entidadId,
          accion: datos.accion,
          antes: this.aJson(datos.antes),
          despues: this.aJson(datos.despues),
        },
      });
    } catch (e) {
      this.logger.warn(
        `No se pudo registrar auditoría ${datos.entidad}/${datos.accion} (${datos.entidadId}): ${e}`,
      );
    }
  }

  private aJson(valor: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (valor === undefined || valor === null) return Prisma.JsonNull;
    // Serializa Dates -> ISO y descarta undefined; evita ciclos y BigInt.
    return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
  }

  /** Listado paginado para la vista de Admin. */
  async listar(filtros: {
    entidad?: string;
    actorId?: number;
    desde?: string;
    hasta?: string;
    pagina?: number;
  }) {
    const pagina = Math.max(0, filtros.pagina ?? 0);
    const rango = rangoFechas(filtros.desde, filtros.hasta, null);
    const where: Prisma.RegistroAuditoriaWhereInput = {
      entidad: filtros.entidad || undefined,
      actorId: filtros.actorId || undefined,
      createdAt: rango ? { gte: rango.gte, lte: rango.lte } : undefined,
    };

    const [total, registros] = await Promise.all([
      this.prisma.registroAuditoria.count({ where }),
      this.prisma.registroAuditoria.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagina * PAGINA_TAM,
        take: PAGINA_TAM,
        include: { actor: { select: { id: true, nombre: true } } },
      }),
    ]);

    return { total, pagina, porPagina: PAGINA_TAM, registros };
  }
}
