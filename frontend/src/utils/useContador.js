import { useEffect, useState } from 'react';

const sinMovimiento = () =>
  typeof window !== 'undefined'
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Cuenta de 0 a `objetivo` cuando `activo` pasa a true (efecto "count-up" de
 * las cifras de la landing). Con movimiento reducido devuelve el objetivo
 * directo: el número real nunca depende de la animación.
 */
export function useContador(objetivo, activo, duracion = 1400) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!activo || sinMovimiento()) return;
    let marco;
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      // ease-out cúbico: arranca rápido y frena al llegar.
      setValor(Math.round(objetivo * (1 - (1 - t) ** 3)));
      if (t < 1) marco = requestAnimationFrame(paso);
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [objetivo, activo, duracion]);

  return sinMovimiento() ? objetivo : valor;
}
