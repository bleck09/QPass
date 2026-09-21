import { useEffect, useRef } from 'react';

/**
 * Barra fina arriba de todo que marca cuánto de la página se leyó. El avance
 * se escribe directo en el DOM (variable CSS) para no re-renderizar en cada
 * frame de scroll. Estilos en EfectosEvento.css (.ev-progreso).
 */
export default function EventoProgreso() {
  const ref = useRef(null);

  useEffect(() => {
    let pendiente = false;
    const medir = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        const alto = document.documentElement.scrollHeight - window.innerHeight;
        ref.current?.style.setProperty('--progreso', alto > 0 ? (window.scrollY / alto).toFixed(4) : '0');
      });
    };
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir, { passive: true });
    medir();
    return () => {
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, []);

  return <div ref={ref} className="ev-progreso" aria-hidden="true" />;
}
