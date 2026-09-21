import { useEffect, useState } from 'react';
import { FaArrowRight, FaTicketAlt } from 'react-icons/fa';
import './EventoBarraCompra.css';

/**
 * Barra de compra fija abajo. Aparece cuando el hero (y su botón de compra)
 * ya quedó atrás, y se esconde mientras la sección de entradas está en
 * pantalla: ahí ya están los botones de cada categoría y sería redundante.
 */
export default function EventoBarraCompra({ nombre, precioDesde, idEntradas = 'entradas' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let pendiente = false;
    const medir = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        const vh = window.innerHeight;
        const r = document.getElementById(idEntradas)?.getBoundingClientRect();
        const entradasEnPantalla = r ? r.top < vh * 0.85 && r.bottom > vh * 0.15 : false;
        setVisible(window.scrollY > vh * 0.8 && !entradasEnPantalla);
      });
    };
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir, { passive: true });
    medir();
    return () => {
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, [idEntradas]);

  const irAEntradas = () => document.getElementById(idEntradas)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className={`ev-barra${visible ? ' es-visible' : ''}`} aria-hidden={!visible}>
      <span className="ev-barra__info">
        <FaTicketAlt aria-hidden="true" />
        <span>
          <strong>{nombre}</strong>
          {precioDesde != null && <small>Entradas desde Bs {precioDesde}</small>}
        </span>
      </span>
      <button type="button" className="ev-barra__cta" onClick={irAEntradas} tabIndex={visible ? 0 : -1}>
        Comprar <FaArrowRight aria-hidden="true" />
      </button>
    </div>
  );
}
