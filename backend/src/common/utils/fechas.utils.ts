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

// Bolivia no tiene horario de verano: siempre UTC-4.
const OFFSET_BOLIVIA_MS = 4 * 60 * 60 * 1000;

/** Inicio (00:00) del día de Bolivia que contiene `fecha`, como instante UTC real. */
export function inicioDiaBolivia(fecha: Date): Date {
  const bo = new Date(fecha.getTime() - OFFSET_BOLIVIA_MS);
  bo.setUTCHours(0, 0, 0, 0);
  return new Date(bo.getTime() + OFFSET_BOLIVIA_MS);
}

/** Fin (23:59:59.999) del día de Bolivia que contiene `fecha`, como instante UTC real. */
export function finDiaBolivia(fecha: Date): Date {
  const bo = new Date(fecha.getTime() - OFFSET_BOLIVIA_MS);
  bo.setUTCHours(23, 59, 59, 999);
  return new Date(bo.getTime() + OFFSET_BOLIVIA_MS);
}

/** 'YYYY-MM-DD' del día de Bolivia que contiene `fecha`. */
export function diaBoliviaISO(fecha: Date): string {
  return new Date(fecha.getTime() - OFFSET_BOLIVIA_MS).toISOString().slice(0, 10);
}

/** Lista de 'YYYY-MM-DD' (Bolivia) desde `gte` hasta `lte`, ambos inclusive. */
export function diasEntreBolivia(gte: Date, lte: Date): string[] {
  const DIA = 24 * 60 * 60 * 1000;
  const out: string[] = [];
  let cur = inicioDiaBolivia(gte).getTime();
  const fin = lte.getTime();
  while (cur <= fin && out.length < 400) {
    out.push(diaBoliviaISO(new Date(cur)));
    cur += DIA;
  }
  return out;
}

/**
 * Rango para filtrar `createdAt`. `desde`/`hasta` son ISO (o undefined).
 * - Si NO viene ninguno y `diasPorDefecto` es null -> devuelve undefined (sin filtro).
 * - Si NO viene ninguno y `diasPorDefecto` es un número -> últimos N días.
 * - `desde`/`hasta` se anclan al inicio/fin del día en horario de Bolivia.
 */
export function rangoFechas(
  desde?: string,
  hasta?: string,
  diasPorDefecto: number | null = 30,
): { gte: Date; lte: Date } | undefined {
  const d = aFecha(desde);
  const h = aFecha(hasta);
  if (!d && !h) {
    if (diasPorDefecto == null) return undefined;
    const lte = finDiaBolivia(new Date());
    const gte = inicioDiaBolivia(
      new Date(lte.getTime() - diasPorDefecto * 24 * 60 * 60 * 1000),
    );
    return { gte, lte };
  }
  const lte = finDiaBolivia(h ?? new Date());
  const gte = inicioDiaBolivia(d ?? new Date(lte.getTime() - 30 * 24 * 60 * 60 * 1000));
  return { gte, lte };
}
