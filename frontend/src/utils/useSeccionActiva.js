import { useEffect, useState } from 'react';

/**
 * Devuelve el id de la sección que está cruzando el centro de la pantalla
 * ("scrollspy"), para resaltar su link en la navbar.
 *
 *   const activa = useSeccionActiva(['cartelera', 'asistentes', 'contacto']);
 *
 * El rootMargin deja una franja fina a mitad de pantalla: la sección que la
 * atraviesa es la activa. Así nunca hay dos activas a la vez y una sección
 * más alta que la pantalla sigue activa mientras se lee.
 *
 * Los ids se pasan como string separado por comas en la dependencia para que
 * un array nuevo en cada render no reinicie el observador. `version` fuerza a
 * volver a buscar los nodos cuando una sección se reemplaza (p. ej. la
 * cartelera pasa de "cargando" a la real y su <section> es otro nodo).
 */
export function useSeccionActiva(ids, version) {
  const [activa, setActiva] = useState(null);
  const clave = ids.join(',');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const nodos = clave.split(',').map((id) => document.getElementById(id)).filter(Boolean);
    if (nodos.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => { if (e.isIntersecting) setActiva(e.target.id); });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    nodos.forEach((n) => observador.observe(n));
    return () => observador.disconnect();
  }, [clave, version]);

  return activa;
}
