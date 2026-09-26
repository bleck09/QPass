/* ============================================================================
 * src/common/utils/ajuste-imagen.utils.ts
 *
 * Ajuste de la imagen del encabezado de la página de un evento: punto focal,
 * zoom, oscurecido y desenfoque. Lo guardan LandingConfig (editor de Admin) y
 * SolicitudEvento (propuesta del cliente, que se copia a LandingConfig al aprobar).
 * ========================================================================= */

// Rangos del ajuste (mismos que ofrece el editor del frontend).
const RANGOS_AJUSTE = {
  x: [0, 100],
  y: [0, 100],
  zoom: [100, 200],
  oscurecer: [0, 80],
  desenfoque: [0, 8],
} as const;

/**
 * Deja el ajuste de imagen solo con claves conocidas y números dentro de
 * rango (el campo es JSON libre en la BD). `null` = sin ajuste.
 */
export function normalizarAjusteImagen(ajuste: unknown) {
  if (!ajuste || typeof ajuste !== 'object') return null;
  const entrada = ajuste as Record<string, unknown>;
  const limpio: Record<string, number> = {};
  for (const [clave, [min, max]] of Object.entries(RANGOS_AJUSTE)) {
    const valor = Number(entrada[clave]);
    if (Number.isFinite(valor)) limpio[clave] = Math.min(max, Math.max(min, valor));
  }
  return Object.keys(limpio).length ? limpio : null;
}
