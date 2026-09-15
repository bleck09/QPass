import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Revela un bloque cuando entra en pantalla (fade + subida + escala).
 * Devuelve [ref, visible]:
 *
 *   const [ref, visible] = useRevelar();
 *   <section ref={ref} className={`qp-revelar${visible ? ' es-visible' : ''}`}>
 *
 * Se revela UNA sola vez por defecto: volver a ocultar al scrollear para
 * arriba marea y no aporta nada.
 *
 * DOS DETALLES QUE IMPORTAN (los dos costaron contenido invisible):
 *
 * 1. `umbral` va en 0. Con un umbral > 0 el navegador exige que ese
 *    porcentaje del AREA DEL ELEMENTO este dentro del viewport, y una
 *    seccion mas alta que la pantalla nunca llega a ese ratio: se quedaba
 *    en opacity 0 para siempre. Con 0 alcanza que asome un pixel.
 *
 * 2. El CSS solo oculta lo que tenga data-revelar="armado", y ese atributo
 *    lo pone este hook antes del primer pintado. Si el observador no corre
 *    (navegador viejo, error de JS, el elemento nunca entra por el
 *    rootMargin), el contenido queda VISIBLE en vez de desaparecer.
 *    Regla: un efecto decorativo nunca puede esconder contenido real.
 */
export function useRevelar({ margen = '0px 0px -10% 0px', umbral = 0, unaVez = true } = {}) {
  const ref = useRef(null);

  // Los casos "sin animación" se resuelven ya en el estado inicial: así el
  // contenido nace visible en vez de aparecer tras un render extra.
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined'
      && (!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        || typeof IntersectionObserver === 'undefined'),
  );

  // Antes del primer pintado, para que no haya un parpadeo de visible→oculto.
  useLayoutEffect(() => {
    const nodo = ref.current;
    if (!nodo || visible) return;
    nodo.dataset.revelar = 'armado';
  }, [visible]);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          if (unaVez) observador.disconnect();
        } else if (!unaVez) {
          setVisible(false);
        }
      },
      { rootMargin: margen, threshold: umbral },
    );

    observador.observe(nodo);
    return () => observador.disconnect();
  }, [margen, umbral, unaVez]);

  return [ref, visible];
}
