import { useEffect, useRef, useState } from 'react';
import { FaShareAlt, FaCalendarPlus, FaGoogle, FaDownload, FaCheck } from 'react-icons/fa';
import { urlGoogleCalendar, descargarIcs } from '../../../utils/calendario.js';
import './EventoAcciones.css';

/**
 * Acciones secundarias del hero del evento: compartir el link y agendarlo.
 * Compartir usa el menú nativo del celular (Web Share API) y, si el navegador
 * no lo tiene, copia el link y lo avisa.
 */
export default function EventoAcciones({ evento }) {
  const [copiado, setCopiado] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);
  const url = window.location.href;

  // Cierra el menú de calendario con clic afuera o Escape.
  useEffect(() => {
    if (!menuAbierto) return;
    const fuera = (e) => { if (!menuRef.current?.contains(e.target)) setMenuAbierto(false); };
    const escape = (e) => { if (e.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [menuAbierto]);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2200);
    return () => clearTimeout(t);
  }, [copiado]);

  const compartir = async () => {
    const datos = { title: evento.nombre, text: `${evento.nombre} · ${evento.lugar}`, url };
    if (navigator.share) {
      try { await navigator.share(datos); } catch { /* el usuario cerró el menú: nada que hacer */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch { /* sin permiso de portapapeles: el link sigue en la barra del navegador */ }
  };

  return (
    <div className="ev-acc">
      <button type="button" className="ev-acc__btn" onClick={compartir}>
        {copiado ? <FaCheck aria-hidden="true" /> : <FaShareAlt aria-hidden="true" />}
        {copiado ? '¡Link copiado!' : 'Compartir'}
      </button>

      <div className="ev-acc__menu-wrap" ref={menuRef}>
        <button
          type="button"
          className="ev-acc__btn"
          aria-expanded={menuAbierto}
          aria-haspopup="true"
          onClick={() => setMenuAbierto((a) => !a)}
        >
          <FaCalendarPlus aria-hidden="true" /> Agendar
        </button>
        {menuAbierto && (
          <div className="ev-acc__menu">
            <a
              href={urlGoogleCalendar(evento, url)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuAbierto(false)}
            >
              <FaGoogle aria-hidden="true" /> Google Calendar
            </a>
            <button type="button" onClick={() => { descargarIcs(evento, url); setMenuAbierto(false); }}>
              <FaDownload aria-hidden="true" /> Apple / Outlook (.ics)
            </button>
          </div>
        )}
      </div>

      {/* Aviso para lectores de pantalla cuando se copia el link. */}
      <span className="sr-only" role="status" aria-live="polite">{copiado ? 'Link copiado al portapapeles' : ''}</span>
    </div>
  );
}
