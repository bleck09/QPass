import { ESTADO_EVENTO, estadoEvento } from '../utils/eventos.js';
import Insignia from './Insignia.jsx';

// Insignia de estado de un evento (Próximo / En curso / Finalizado / Archivado).
// El estado se deriva de fechas + flags — ver utils/eventos.js. Usa la
// Insignia única: el tono sale de ESTADO_EVENTO[...].tono.
export default function BadgeEstadoEvento({ evento, className = '', solida = false }) {
  // Sin datos temporales (ej. tarjetas de puesto que reusan <EventoCard>) no hay estado que mostrar.
  if (!evento || (!evento.fecha && !evento.fechaFin && !evento.estado && !evento.archivadoEn)) {
    return null;
  }
  const estado = estadoEvento(evento);
  const info = ESTADO_EVENTO[estado];
  if (!info) return null;
  return (
    <Insignia tono={info.tono} punto latido={estado === 'en_curso'} solida={solida} className={className}>
      {info.label}
    </Insignia>
  );
}
