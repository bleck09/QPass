import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Guarda "qué detalle está abierto" en la URL (`?<clave>=<id>`) en vez de en
 * estado interno. Así el botón "Atrás" del navegador cierra el detalle y vuelve
 * a la lista, en vez de salir de la página; además el enlace es compartible y
 * sobrevive un refresco.
 *
 *   const [eventoId, abrirEvento, cerrarEvento] = useDetalleUrl('evento');
 *
 * `abrirEvento(id)` añade una entrada al historial; `cerrarEvento()` la quita.
 * Otros parámetros de la query (filtros, etc.) se conservan.
 *
 * @param {string} clave  nombre del query param (por defecto 'evento')
 * @returns {[string|null, (id: string) => void, () => void]}
 */
export function useDetalleUrl(clave = 'evento') {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get(clave) || null;

  const abrir = useCallback((nuevoId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(clave, String(nuevoId));
      return next;
    });
  }, [clave, setSearchParams]);

  const cerrar = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(clave);
      return next;
    });
  }, [clave, setSearchParams]);

  return [id, abrir, cerrar];
}
