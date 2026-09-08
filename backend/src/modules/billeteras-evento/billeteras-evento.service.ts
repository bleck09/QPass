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

  /** Billeteras del usuario actual, una por evento donde tiene (o tuvo) saldo. */
  async mias(usuarioId: number) {
    const filas = await this.prisma.billeteraEvento.findMany({
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
    });
    return filas.map((f) => ({
      eventoId: f.eventoId,
      eventoNombre: f.evento.nombre,
      fecha: f.evento.fecha,
      fechaFin: f.evento.fechaFin,
      estado: f.evento.estado,
      archivadoEn: f.evento.archivadoEn,
      saldo: Number(f.saldo),
      expiraEn: f.expiraEn,
    }));
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
