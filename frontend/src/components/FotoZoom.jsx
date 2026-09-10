import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './FotoZoom.css';

/**
 * Miniatura de una foto que, al hacer clic, se abre ampliada en un overlay a
 * pantalla completa. Clic en cualquier lado (o Esc) la cierra. Para verificación
 * de identidad: carnet, foto de la cara, foto de perfil…
 *
 * @param {string} src
 * @param {string} alt
 * @param {string} className  clases para la miniatura (conserva el look de cada página)
 * @param {number|string} width  ancho de la miniatura (opcional)
 * @param {number|string} height alto de la miniatura (opcional)
 */
export default function FotoZoom({ src, alt = '', className = '', width, height }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto]);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`qp-foto-zoom ${className}`.trim()}
        onClick={() => setAbierto(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierto(true); }
        }}
        role="button"
        tabIndex={0}
        title="Ampliar"
      />
      {abierto && createPortal(
        <div
          className="qp-foto-zoom-overlay"
          onClick={() => setAbierto(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt || 'Foto ampliada'}
        >
          <img src={src} alt={alt} className="qp-foto-zoom-grande" />
          <button type="button" className="qp-foto-zoom-cerrar" aria-label="Cerrar">✕</button>
        </div>,
        document.body,
      )}
    </>
  );
}
