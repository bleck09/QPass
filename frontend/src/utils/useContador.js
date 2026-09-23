import { useEffect, useRef, useState } from 'react';

const sinMovimiento = () =>
  typeof window !== 'undefined'
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Cuenta hasta `objetivo` cuando `activo` es true (efecto "count-up" de las
 * cifras de la landing y de StatCard). La primera vez arranca de 0; si
 * `objetivo` cambia después, anima DESDE el valor que ya se mostraba (un
 * panel en vivo no vuelve a 0 en cada actualización). Con movimiento
 * reducido devuelve el objetivo directo: el número real nunca depende de la
 * animación.
 */
export function useContador(objetivo, activo, duracion = 1400) {
  const [valor, setValor] = useState(0);
  const mostrado = useRef(0);

  useEffect(() => {
    if (!activo || sinMovimiento()) return;
    let marco;
    const desde = mostrado.current;
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      // ease-out cúbico: arranca rápido y frena al llegar.
      const v = Math.round(desde + (objetivo - desde) * (1 - (1 - t) ** 3));
      mostrado.current = v;
      setValor(v);
      if (t < 1) marco = requestAnimationFrame(paso);
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [objetivo, activo, duracion]);

  return sinMovimiento() ? objetivo : valor;
}
