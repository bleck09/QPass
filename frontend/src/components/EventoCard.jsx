import { FaMapMarkerAlt, FaCalendarAlt, FaArrowRight } from 'react-icons/fa';
import { formatearFecha } from '../utils/eventos.js';
import BadgeEstadoEvento from './BadgeEstadoEvento.jsx';
import './EventoCard.css';

/**
 * Tarjeta de evento unificada (Manual: "una card, un componente").
 * Imagen del evento de fondo + scrim oscuro para que el texto se lea,
 * título grande, chips de meta (lugar / fecha / extras) y un CTA oscuro.
 * La imagen hace un leve zoom al pasar el cursor.
 *
 * Toda la tarjeta es el botón: `onClick` se dispara al pulsarla.
 *
 * @param {object}   evento    { nombre, lugar, fecha, imagen }
 * @param {Function} onClick   acción al pulsar la tarjeta
 * @param {boolean}  disabled  deshabilita la tarjeta
 * @param {boolean}  estado    muestra el badge de estado del evento (Próximo/En curso/…) — on por defecto.
 *                             Se autooculta si el `evento` no trae fechas (ej. tarjetas de puesto).
 * @param {ReactNode} badges   badges extra en la esquina superior (publicación…), junto al de estado
 * @param {ReactNode[]|ReactNode} meta  chips extra debajo de lugar/fecha
 * @param {string}   cta       texto del botón (por defecto "Abrir")
 * @param {string}   className clases extra
 */
export default function EventoCard({
  evento,
  onClick,
  disabled = false,
  estado = true,
  badges = null,
  meta = null,
  cta = 'Abrir',
  className = '',
}) {
  const fecha = evento?.fecha ? formatearFecha(evento.fecha) : null;
  const extras = Array.isArray(meta) ? meta : meta != null ? [meta] : [];
  // Solo tiene sentido el badge de estado si el evento trae datos temporales
  // (las tarjetas de puesto reusan esta card con un objeto {nombre, imagen}).
  const tieneEstado =
    estado && !!(evento?.fecha || evento?.fechaFin || evento?.estado || evento?.archivadoEn);
  const badgeEstado = tieneEstado ? <BadgeEstadoEvento evento={evento} /> : null;

  return (
    <button
      type="button"
      className={`qp-evento-card ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className="qp-evento-card__img"
        aria-hidden="true"
        style={evento?.imagen ? { backgroundImage: `url(${evento.imagen})` } : undefined}
      />
      <span className="qp-evento-card__scrim" aria-hidden="true" />

      {(badgeEstado || badges) && (
        <span className="qp-evento-card__top">
          <span className="qp-evento-card__badges">
            {badgeEstado}
            {badges}
          </span>
        </span>
      )}

      <span className="qp-evento-card__body">
        <span className="qp-evento-card__title">{evento?.nombre}</span>

        <span className="qp-evento-card__meta">
          {evento?.lugar && (
            <span className="qp-evento-card__chip">
              <FaMapMarkerAlt aria-hidden="true" /> {evento.lugar}
            </span>
          )}
          {fecha && (
            <span className="qp-evento-card__chip">
              <FaCalendarAlt aria-hidden="true" /> {fecha}
            </span>
          )}
          {extras.map((m, i) => (
            <span key={i} className="qp-evento-card__chip">{m}</span>
          ))}
        </span>

        <span className="qp-evento-card__cta">
          {cta} <FaArrowRight aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
