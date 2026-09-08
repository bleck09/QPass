/* ============================================================================
 * src/modules/billeteras-evento/billeteras-evento.service.ts
 * Lectura de las billeteras cashless por evento (el ledger las escribe en
 * TransaccionesService). Solo consultas.
 * ========================================================================= */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BilleterasEventoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Billeteras del usuario actual, una por evento donde tiene (o tuvo) saldo,
   * con el desglose recargado / gastado / devuelto (del ledger de ese usuario
   * en ese evento).
   */
  async mias(usuarioId: number) {
    const [filas, porTipo] = await Promise.all([
      this.prisma.billeteraEvento.findMany({
        where: { usuarioId },
        include: {
          evento: {
            select: {
              id: true,
              nombre: true,
              fecha: true,
              fechaFin: true,
              estado: true,
              archivadoEn: true,
            },
          },
        },
        orderBy: { evento: { fecha: 'desc' } },
      }),
      this.prisma.transaccion.groupBy({
        by: ['eventoId', 'tipo'],
        where: { usuarioId },
        _sum: { monto: true },
      }),
    ]);

    // eventoId -> { recarga, ajuste, consumo, reverso_consumo, devolucion, ... }
    const sumas = new Map<string, Record<string, number>>();
    for (const g of porTipo) {
      const m = sumas.get(g.eventoId) ?? {};
      m[g.tipo] = Number(g._sum.monto ?? 0);
      sumas.set(g.eventoId, m);
    }

    return filas.map((f) => {
      const s = sumas.get(f.eventoId) ?? {};
      const recargado = (s.recarga ?? 0) + (s.ajuste ?? 0);
      const gastado = (s.consumo ?? 0) - (s.reverso_consumo ?? 0);
      const devuelto = s.devolucion ?? 0;
      return {
        eventoId: f.eventoId,
        eventoNombre: f.evento.nombre,
        fecha: f.evento.fecha,
        fechaFin: f.evento.fechaFin,
        estado: f.evento.estado,
        archivadoEn: f.evento.archivadoEn,
        saldo: Number(f.saldo),
        expiraEn: f.expiraEn,
        recargado,
        gastado,
        devuelto,
      };
    });
  }

  /** Billeteras de un evento con datos del titular (para Devolución / Admin). */
  async porEvento(eventoId?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    const filas = await this.prisma.billeteraEvento.findMany({
      where: { eventoId },
      include: { usuario: { select: { id: true, nombre: true, rol: true } } },
      orderBy: { saldo: 'desc' },
    });
    return filas.map((f) => ({
      usuarioId: f.usuarioId,
      nombre: f.usuario.nombre,
      rol: f.usuario.rol,
      saldo: Number(f.saldo),
      expiraEn: f.expiraEn,
    }));
  }
}
