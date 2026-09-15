import { useEffect, useRef } from 'react';

/**
 * Parallax por scroll: desplaza el elemento a una fracción de lo que se
 * desplaza la página, así queda "más atrás" (velocidad < 0) o "más adelante"
 * (velocidad > 0) que el resto y aparece sensación de profundidad.
 *
 *   const refImagen = useParallax(0.18);
 *   <div ref={refImagen}>…</div>
 *
 * Notas de implementación:
 *
 * - Escribe el transform directo en el DOM dentro de un requestAnimationFrame;
 *   NO usa estado, para no re-renderizar el árbol en cada píxel de scroll.
 * - Solo trabaja mientras el elemento está cerca del viewport: fuera de ahí
 *   el desplazamiento no se ve y sería cálculo tirado.
 * - `limite` acota el recorrido en px para que el elemento no se despegue de
 *   su lugar en páginas largas.
 * - Con movimiento reducido no hace nada: ni listener ni transform.
 * - El transform va en el ELEMENTO CONTENEDOR, no en uno que ya tenga una
 *   animación propia de transform (se pisarían).
 */
export function useParallax(velocidad = 0.15, limite = 120) {
  const ref = useRef(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let pendiente = false;

    const actualizar = () => {
      pendiente = false;
      const caja = nodo.getBoundingClientRect();
      const alto = window.innerHeight || 0;

      // Fuera de pantalla (con un margen) no se toca nada.
      if (caja.bottom < -alto || caja.top > alto * 2) return;

      // Progreso del elemento cruzando la pantalla: 0 cuando su centro está
      // abajo del todo, 1 cuando ya salió por arriba.
      const centro = caja.top + caja.height / 2;
      const avance = 1 - centro / alto;

      const desplazamiento = Math.max(
        -limite,
        Math.min(limite, avance * velocidad * alto),
      );
      nodo.style.transform = `translate3d(0, ${desplazamiento.toFixed(1)}px, 0)`;
    };

    const alScrollear = () => {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(actualizar);
    };

    nodo.style.willChange = 'transform';
    window.addEventListener('scroll', alScrollear, { passive: true });
    window.addEventListener('resize', alScrollear, { passive: true });
    actualizar();

    return () => {
      window.removeEventListener('scroll', alScrollear);
      window.removeEventListener('resize', alScrollear);
      nodo.style.transform = '';
      nodo.style.willChange = '';
    };
  }, [velocidad, limite]);

  return ref;
}
