/* ============================================================================
 * src/modules/codigos-qr/codigos-qr.service.ts
 * Pool de pulseras/tarjetas físicas con QR de un evento.
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { GenerarCodigosQrDto } from './dto/generar-codigos-qr.dto';

// Una manilla vinculada produce hasta dos movimientos de historial: la entrega
// (asignadoPor/asignadoEn) y la baja (anuladoPor/anuladoEn + motivo). No hay
// tabla aparte: sale de la propia CodigoQr.
const SELECT_HISTORIAL = {
  entrada: { select: { id: true, nombre: true, numero: true } },
  evento: { select: { id: true, nombre: true } },
  asignadoPor: { select: { id: true, nombre: true, rol: true } },
  anuladoPor: { select: { id: true, nombre: true, rol: true } },
} satisfies Prisma.CodigoQrInclude;

type CodigoConHistorial = Prisma.CodigoQrGetPayload<{
  include: typeof SELECT_HISTORIAL;
}>;

const aMovimientos = (codigos: CodigoConHistorial[]) =>
  codigos
    .flatMap((c) => {
      const comun = {
        manilla: { id: c.id, codigo: c.codigo, numero: c.numero, estado: c.estado },
        entrada: c.entrada,
        evento: c.evento,
      };
      const filas = [];
      if (c.asignadoEn) {
        filas.push({
          id: `${c.id}-entrega`,
          tipo: 'entrega' as const,
          fecha: c.asignadoEn,
          actor: c.asignadoPor,
          motivo: null as string | null,
          ...comun,
        });
      }
      if (c.anuladoEn) {
        filas.push({
          // La copia de un duplicado se distingue de una baja normal
          // (perdida/dañada/reemplazo) para que se lea de un vistazo.
          id: `${c.id}-baja`,
          tipo: c.estado === 'en_alerta' ? ('duplicado' as const) : ('baja' as const),
          fecha: c.anuladoEn,
          actor: c.anuladoPor,
          motivo: c.motivoAnulacion,
          ...comun,
        });
      }
      return filas;
    })
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

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
      where: {
        eventoId,
        entradaId: disponibles === 'true' ? null : undefined,
      },
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
   * Historial de entrega/cambio de manillas del evento (Gestión de Entrega,
   * panel de Admin y del Cliente organizador). Solo lectura: Supervisor ve los
   * eventos que tiene asignados y Cliente los que organiza (EventoPolicy).
   */
  async historial(eventoId: string | undefined, actor: UsuarioJwt) {
    if (!eventoId) throw new BadRequestException('eventoId es requerido');
    await this.eventoPolicy.asegurarAcceso(actor, eventoId);
    const codigos = await this.prisma.codigoQr.findMany({
      where: { eventoId, entradaId: { not: null } },
      include: SELECT_HISTORIAL,
    });
    return aMovimientos(codigos);
  }

  /**
   * "Mis manillas": los cambios de manilla de las entradas del usuario logueado,
   * de todos sus eventos. Mismo formato que el historial por evento.
   */
  async historialDelUsuario(usuarioId: number) {
    const codigos = await this.prisma.codigoQr.findMany({
      where: { entrada: { usuarioId } },
      include: SELECT_HISTORIAL,
    });
    return aMovimientos(codigos);
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
          data: {
            eventoId: dto.eventoId,
            numero,
            codigo,
          },
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

  /**
   * Eventos de manilla DIGITAL: genera un código YA VINCULADO a la entrada,
   * sin pasar por el pool ni por Supervisor. Se llama al aprobar la compra
   * (ComprasService.aprobar), dentro de esa misma transacción — de ahí que
   * reciba `tx` en vez de usar `this.prisma`.
   */
  async crearYVincularAutomatico(
    tx: Prisma.TransactionClient,
    params: {
      eventoId: string;
      entradaId: string;
      diaEventoId: string | null;
      actorId: number;
    },
  ) {
    const ultimo = await tx.codigoQr.findFirst({
      where: { eventoId: params.eventoId },
      orderBy: { numero: 'desc' },
    });
    let numero = (ultimo?.numero ?? 0) + 1;
    const MAX_INTENTOS = 20;
    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
      const codigo = `QP-${generarParteAleatoria()}`;
      try {
        return await tx.codigoQr.create({
          data: {
            eventoId: params.eventoId,
            numero,
            codigo,
            entradaId: params.entradaId,
            diaEventoId: params.diaEventoId,
            asignadoPorId: params.actorId,
            asignadoEn: new Date(),
          },
        });
      } catch (err) {
        // Choque de código o de número (concurrencia): se reintenta con otros.
        if (
          !(err instanceof Prisma.PrismaClientKnownRequestError) ||
          err.code !== 'P2002'
        ) {
          throw err;
        }
        numero += 1;
      }
    }
    throw new ConflictException(
      'No se pudo generar un código QR único para esta entrada.',
    );
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
