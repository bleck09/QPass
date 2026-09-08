/* ============================================================================
 * src/modules/codigos-retiro-negocio/codigos-retiro-negocio.service.ts
 *
 * Token QR de un Usuario Negocio para un evento: lo presenta en Devoluciones y
 * el operador le paga las ganancias del evento (saldo de su BilleteraEvento).
 * Uno por (evento, negocio); se auto-crea al asignar el negocio al evento.
 * ========================================================================= */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';

// Sin 0/O/1/I para que se pueda leer/dictar a mano (igual que CodigoQr).
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const parteAleatoria = (largo = 10) =>
  Array.from(
    { length: largo },
    () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)],
  ).join('');

@Injectable()
export class CodigosRetiroNegocioService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get-or-create del código de (evento, negocio). Reintenta si choca el único. */
  async asegurar(eventoId: string, negocioId: number) {
    const existente = await this.prisma.codigoRetiroNegocio.findUnique({
      where: { eventoId_negocioId: { eventoId, negocioId } },
    });
    if (existente) return existente;

    for (let intento = 0; intento < 6; intento++) {
      try {
        return await this.prisma.codigoRetiroNegocio.create({
          data: { eventoId, negocioId, codigo: `NG-${parteAleatoria()}` },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // Choque de `codigo` -> otro aleatorio. Choque de (evento,negocio) ->
          // lo creó otra request en paralelo: devolver el que quedó.
          const yaEsta = await this.prisma.codigoRetiroNegocio.findUnique({
            where: { eventoId_negocioId: { eventoId, negocioId } },
          });
          if (yaEsta) return yaEsta;
          continue;
        }
        throw err;
      }
    }
    throw new BadRequestException('No se pudo generar el código de retiro');
  }

  /** El código del negocio actual para un evento (lo crea si no existe). */
  async mio(actor: UsuarioJwt, eventoId?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    const asignado = await this.prisma.asignacion.findUnique({
      where: {
        eventoId_usuarioId: { eventoId, usuarioId: actor.id },
      },
    });
    if (!asignado || asignado.rol !== 'UsuarioNegocio') {
      throw new ForbiddenException('No estás asignado a este evento como negocio');
    }
    const fila = await this.asegurar(eventoId, actor.id);
    return { codigo: fila.codigo, eventoId };
  }

  /** Resuelve un código escaneado en Devoluciones -> negocio + saldo del evento. */
  async buscar(codigo: string) {
    const fila = await this.prisma.codigoRetiroNegocio.findUnique({
      where: { codigo },
      include: {
        negocio: { select: { id: true, nombre: true } },
        evento: { select: { id: true, nombre: true } },
      },
    });
    if (!fila) {
      throw new NotFoundException('Código de retiro no reconocido');
    }
    const billetera = await this.prisma.billeteraEvento.findUnique({
      where: {
        usuarioId_eventoId: {
          usuarioId: fila.negocioId,
          eventoId: fila.eventoId,
        },
      },
      select: { saldo: true, expiraEn: true },
    });
    return {
      negocioId: fila.negocioId,
      negocioNombre: fila.negocio.nombre,
      eventoId: fila.eventoId,
      eventoNombre: fila.evento.nombre,
      saldo: Number(billetera?.saldo ?? 0),
      expiraEn: billetera?.expiraEn ?? null,
    };
  }
}
