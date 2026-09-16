import { useEffect, useRef } from 'react';
import { useFocoModal } from './useFocoModal.js';
import { bloquearScroll } from './bloqueoScroll.js';

/*
  Comportamiento de un modal accesible, sin imponer NADA visual — Manual 8.6.
  Junta las tres cosas que cada modal de la app repetía a mano:
    1. foco atrapado que vuelve al disparador  (useFocoModal)
    2. Escape cierra  (listener global mientras está abierto)
    3. el fondo no scrollea mientras está abierto

  Lo usa <Modal> (el shell genérico) y también los modales con look propio
  (la tarjeta del QR, las vistas previa de landing...), que conservan su markup
  pero dejan de duplicar este comportamiento.

  Uso:
    const ref = useModal(!!tarjetaQR, cerrarTarjeta);
    ...
    {tarjetaQR && (
      <div className="overlay" onClick={cerrarTarjeta}>
        <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true"
             onClick={(e) => e.stopPropagation()}>
          ...
*/
export function useModal(abierto, onCerrar) {
  const ref = useRef(null);

  useFocoModal(ref, abierto);

  useEffect(() => {
    if (!abierto) return undefined;

    const alTecla = (e) => {
      if (e.key === 'Escape') onCerrar?.();
    };
    window.addEventListener('keydown', alTecla);

    const liberarScroll = bloquearScroll();

    return () => {
      window.removeEventListener('keydown', alTecla);
      liberarScroll();
    };
  }, [abierto, onCerrar]);

  return ref;
}
