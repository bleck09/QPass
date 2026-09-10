import { ESTADO_EVENTO, estadoEvento } from '../utils/eventos.js';
import './BadgeEstadoEvento.css';

// Píldora de estado de un evento (Próximo / En curso / Finalizado / Archivado).
// El estado se deriva de fechas + flags — ver utils/eventos.js.
export default function BadgeEstadoEvento({ evento, className = '' }) {
  // Sin datos temporales (ej. tarjetas de puesto que reusan <EventoCard>) no hay estado que mostrar.
  if (!evento || (!evento.fecha && !evento.fechaFin && !evento.estado && !evento.archivadoEn)) {
    return null;
  }
  const info = ESTADO_EVENTO[estadoEvento(evento)];
  if (!info) return null;
  return (
    <span className={`pi-badge-estado-evento ${info.clase} ${className}`}>
      {info.label}
    </span>
  );
}
