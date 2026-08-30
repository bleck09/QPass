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
