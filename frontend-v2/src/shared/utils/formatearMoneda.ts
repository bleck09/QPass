import type { Decimalish } from '@/shared/types/common.types';

const FORMATO = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un monto a bolivianos. Devuelve "Bs 0,00" si es null/undefined. */
export function formatearMoneda(valor: Decimalish | null | undefined): string {
  const numero = valor == null ? 0 : Number(valor);
  return `Bs ${FORMATO.format(Number.isFinite(numero) ? numero : 0)}`;
}
