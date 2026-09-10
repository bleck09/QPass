// Regla de negocio: por debajo de este stock un producto se considera "bajo".
// Mismo umbral en el backend (avisos-stock.service.ts).
export const UMBRAL_STOCK_BAJO = 5;

/**
 * Estado de stock de un producto del menú de un puesto (para un evento):
 *   'inactivo'  -> el negocio lo deshabilitó a mano (estado.activo === false)
 *   'sin_stock' -> stock controlado y llegó a 0
 *   'bajo'      -> stock controlado y <= UMBRAL_STOCK_BAJO
 *   'ok'        -> disponible (sin control de stock, o con stock suficiente)
 *
 * @param {{ activo?: boolean, stock?: number|null }} p
 */
export function estadoStockProducto(p) {
  if (p?.activo === false) return 'inactivo';
  if (p?.stock === 0) return 'sin_stock';
  if (p?.stock != null && p.stock <= UMBRAL_STOCK_BAJO) return 'bajo';
  return 'ok';
}

/** No se puede vender: deshabilitado o sin stock. */
export const noVendible = (p) => {
  const e = estadoStockProducto(p);
  return e === 'inactivo' || e === 'sin_stock';
};
