import { useState } from 'react';

/**
 * Paginación en cliente para una lista ya filtrada.
 * Si `porPagina` es 0 (o la lista es más corta), no pagina: devuelve todo.
 *
 * La página se "clampa" en el render (no con un efecto), así que si un filtro
 * reduce la lista y la página actual queda fuera de rango, se ajusta sola sin parpadeo.
 *
 * @param {any[]}  items      lista completa (ya filtrada/ordenada por la vista)
 * @param {number} porPagina  elementos por página (0 = sin paginar)
 * @returns {{ pagina:number, setPagina:Function, paginaActual:number,
 *            totalPaginas:number, paginado:boolean, slice:any[], total:number }}
 */
export function usePaginacion(items, porPagina = 10) {
  const total = items.length;
  const paginado = porPagina > 0 && total > porPagina;
  const totalPaginas = paginado ? Math.ceil(total / porPagina) : 1;

  const [pagina, setPagina] = useState(0);
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const desde = paginaActual * porPagina;

  const slice = paginado ? items.slice(desde, desde + porPagina) : items;

  return { pagina, setPagina, paginaActual, totalPaginas, paginado, slice, total };
}
