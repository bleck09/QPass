/* ============================================================================
 * src/modules/codigos-qr/codigos-qr.service.ts
 * Pool de pulseras/tarjetas físicas con QR de un evento.
 * ========================================================================= */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { GenerarCodigosQrDto } from './dto/generar-codigos-qr.dto';

// Sin 0/O/1/I para no confundir al leer un código a mano.
const CARACTERES_ALEATORIOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO_ALEATORIO = 12;

const generarParteAleatoria = () => {
  let parte = '';
  for (let i = 0; i < LARGO_ALEATORIO; i++) {
    parte +=
      CARACTERES_ALEATORIOS[
        Math.floor(Math.random() * CARACTERES_ALEATORIOS.length)
      ];
  }
  return parte;
};

@Injectable()
export class CodigosQrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  async listar(eventoId?: string, disponibles?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    return this.prisma.codigoQr.findMany({
      where: { eventoId, entradaId: disponibles === 'true' ? null : undefined },
      orderBy: { numero: 'asc' },
    });
  }

  async buscarPorCodigo(codigo: string) {
    const codigoQr = await this.prisma.codigoQr.findUnique({ where: { codigo } });
    if (!codigoQr) {
      throw new NotFoundException('Ese código no existe en el sistema');
    }
    return codigoQr;
  }

  /**
   * Genera `cantidad` códigos únicos nuevos para el evento (se suman a los ya
   * generados). prefijo: 1 a 3 letras del Admin; el resto es aleatorio y no se
   * repite (codigo es @unique en la BD).
   */
  async generar(dto: GenerarCodigosQrDto) {
    await this.eventoPolicy.porEvento(dto.eventoId);
    const prefijoNormalizado =
      String(dto.prefijo || 'QP')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 3) || 'QP';

    const ultimo = await this.prisma.codigoQr.findFirst({
      where: { eventoId: dto.eventoId },
      orderBy: { numero: 'desc' },
    });

    const creados = [];
    let numero = (ultimo?.numero ?? 0) + 1;
    const MAX_INTENTOS = dto.cantidad * 5 + 20;
    for (
      let intento = 0;
      creados.length < dto.cantidad && intento < MAX_INTENTOS;
      intento++
    ) {
      const codigo = `${prefijoNormalizado}-${generarParteAleatoria()}`;
      try {
        const creado = await this.prisma.codigoQr.create({
          data: { eventoId: dto.eventoId, numero, codigo },
        });
        creados.push(creado);
        numero += 1;
      } catch (err) {
        // Choque de código único: se reintenta con otro aleatorio.
        if (
          !(err instanceof Prisma.PrismaClientKnownRequestError) ||
          err.code !== 'P2002'
        ) {
          throw err;
        }
      }
    }

    return creados;
  }

  /** Borra solo los códigos aún sin vincular (no reinicia la numeración). */
  async eliminarNoVinculados(eventoId?: string) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    await this.eventoPolicy.porEvento(eventoId);
    await this.prisma.codigoQr.deleteMany({
      where: { eventoId, entradaId: null },
    });
  }
}
