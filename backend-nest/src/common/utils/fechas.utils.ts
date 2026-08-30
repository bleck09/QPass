/** Convierte a Date sólo si viene un valor; si no, devuelve undefined. */
export function aFecha(valor?: string | Date | null): Date | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  return valor instanceof Date ? valor : new Date(valor);
}

/** aFecha con respaldo: usa `valor`, y si no hay, `respaldo`. */
export function aFechaCon(
  valor: string | Date | null | undefined,
  respaldo: string | Date,
): Date {
  return aFecha(valor) ?? new Date(respaldo);
}
