import { Prisma } from '@prisma/client';

/**
 * Helpers de dinero. El schema usa Decimal(10,2); acá se normaliza a un
 * Prisma.Decimal con 2 decimales para no arrastrar floats.
 */
export type Numerico = number | string | Prisma.Decimal;

export function aDecimal(valor: Numerico): Prisma.Decimal {
  return new Prisma.Decimal(valor);
}

/** Redondea a 2 decimales (centavos). */
export function redondearCentavos(valor: Numerico): Prisma.Decimal {
  return new Prisma.Decimal(valor).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function esPositivo(valor: Numerico): boolean {
  return new Prisma.Decimal(valor).greaterThan(0);
}
