import { BadRequestException, ConflictException } from '@nestjs/common';

/* --------------------------------------------------------------------------
 * Excepciones propias del dominio. Extienden las de Nest para que el filtro
 * global (C9) las trate igual que cualquier 400/409, sin lógica especial.
 * ----------------------------------------------------------------------- */

export class SaldoInsuficienteException extends BadRequestException {
  constructor(mensaje = 'Saldo insuficiente.') {
    super(mensaje);
  }
}

export class SinCupoDisponibleException extends ConflictException {
  constructor(mensaje = 'No queda stock suficiente.') {
    super(mensaje);
  }
}

/**
 * Se escaneó la COPIA de una manilla duplicada (CodigoQr.estado=en_alerta). No se
 * deja hacer nada con ella: el front reconoce `codigo` y muestra `detalle` (la foto
 * del falso) en vez del error plano. El filtro global (C9) reenvía ambos campos.
 */
export class ManillaFalsaException extends ConflictException {
  constructor(detalle: Record<string, unknown>) {
    super({
      message:
        'MANILLA FALSA: esta manilla es una copia. No se puede usar para nada — retené a la persona y avisá a seguridad.',
      codigo: 'MANILLA_FALSA',
      detalle,
    });
  }
}
