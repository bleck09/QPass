/* ============================================================================
 * src/common/utils/choque-eventos.utils.ts
 *
 * Regla de negocio actual: en todo el sistema SOLO PUEDE HABER UN EVENTO A LA
 * VEZ — dos eventos no pueden tener fechas que se crucen, sin importar el
 * lugar. Uno puede terminar y al día siguiente empezar otro, pero no se
 * superponen.
 *
 * Escalabilidad a futuro: si algún día se quiere permitir eventos simultáneos
 * en sedes distintas, este es el ÚNICO lugar a tocar — agregar acá un filtro
 * por lugar/sede a la query (hoy `Evento.lugar` es texto libre, no hay un id
 * de sede real con el que agrupar de forma confiable).
 *
 * Se llama desde cualquier operación que cambie Evento.fecha/fechaFin:
 * EventosService.crear/actualizar y DiasEventoService (las jornadas
 * resincronizan esas fechas al min/max de sus rangos).
 * ========================================================================= */

import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Acepta tanto el PrismaService normal como un `tx` de $transaction — ambos
// exponen `.evento.findFirst`, pero son tipos distintos de Prisma.
type ClientePrisma = PrismaService | Prisma.TransactionClient;

export async function verificarSinChoqueDeFechas(
  prisma: ClientePrisma,
  params: { inicio: Date; fin: Date; excluirEventoId?: string },
): Promise<void> {
  const choque = await prisma.evento.findFirst({
    where: {
      id: params.excluirEventoId ? { not: params.excluirEventoId } : undefined,
      archivadoEn: null, // un evento archivado ya no cuenta: quedó de solo lectura
      fecha: { lt: params.fin },
      fechaFin: { gt: params.inicio },
    },
    select: { id: true, nombre: true, fecha: true, fechaFin: true },
  });
  if (choque) {
    const fmt = (d: Date) => d.toLocaleDateString('es-BO');
    throw new ConflictException(
      `Estas fechas se cruzan con "${choque.nombre}" (${fmt(choque.fecha)} – ${fmt(choque.fechaFin)}). ` +
        'Por ahora solo puede haber un evento a la vez: ajustá las fechas para que no se superpongan.',
    );
  }
}
