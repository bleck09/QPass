import { FaCalendarAlt } from 'react-icons/fa';
import Campo from './Campo.jsx';
import Insignia from './Insignia.jsx';
import './SelectorEvento.css';

/*
  Selector "¿de qué evento?" de las pantallas de Admin (PLAN §2.10). El mismo
  bloque estaba copiado en Configurar página, Crear QR, Crear tickets y Mapa:
  si el evento viene fijo (embebido en el detalle de un evento, o llegando
  desde Gestión de Eventos) se muestra su nombre como Insignia; si no, un
  <select> dentro del .input-group global.

    <SelectorEvento
      id="qr-evento"
      eventos={eventosDisponibles}
      valor={eventoId}
      onCambio={cambiarEvento}
      bloqueado={eventoBloqueado}
      nombre={eventoActual?.nombre}
    />

  onCambio recibe el id nuevo. Cada pantalla hace lo suyo además de cambiarlo
  (resetear la página, salir del modo diseño, confirmar si hay cambios sin
  guardar...), por eso no lo resuelve este componente.
*/
export default function SelectorEvento({
  id = 'selector-evento',
  eventos = [],
  valor,
  onCambio,
  bloqueado = false,
  nombre,
  etiqueta = 'Evento',
}) {
  if (bloqueado) {
    return <Insignia tono="marca" icono={FaCalendarAlt}>{nombre || 'Evento'}</Insignia>;
  }

  return (
    <Campo id={id} etiqueta={etiqueta} className="qp-selector-evento">
      <select id={id} value={valor ?? ''} onChange={(e) => onCambio(e.target.value)}>
        {eventos.map((ev) => (
          <option key={ev.id} value={ev.id}>{ev.nombre}</option>
        ))}
      </select>
    </Campo>
  );
}
