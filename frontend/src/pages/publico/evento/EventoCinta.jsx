import {
  FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaQrcode, FaMobileAlt, FaWallet, FaUndoAlt,
} from 'react-icons/fa';
import './EventoCinta.css';

/**
 * Cinta que corre sin fin bajo el hero con los datos clave del evento
 * (cuándo, dónde, desde cuánto, tipo de acceso). Misma técnica que la cinta
 * de la landing: la lista va dos veces y la animación corre la mitad del
 * ancho, así el salto no se nota. La copia es decorativa (aria-hidden).
 */
export default function EventoCinta({ nombre, cuando, lugar, precioDesde, digital }) {
  const items = [
    { icono: FaTicketAlt, texto: nombre },
    cuando && { icono: FaCalendarAlt, texto: cuando },
    lugar && { icono: FaMapMarkerAlt, texto: lugar },
    precioDesde != null && { icono: FaTicketAlt, texto: `Entradas desde Bs ${precioDesde}` },
    { icono: digital ? FaMobileAlt : FaQrcode, texto: digital ? 'Tu QR en el celular' : 'Manilla QR' },
    { icono: FaWallet, texto: 'Pagos sin efectivo' },
    { icono: FaUndoAlt, texto: 'Te devolvemos el saldo que sobra' },
  ].filter(Boolean);

  const lista = (copia) => (
    <ul className="ev-cinta__lista" aria-hidden={copia || undefined}>
      {items.map(({ icono: Icono, texto }) => (
        <li key={texto}><Icono aria-hidden="true" /> {texto}</li>
      ))}
    </ul>
  );

  return (
    <div className="ev-cinta">
      <div className="ev-cinta__pista">
        {lista(false)}
        {lista(true)}
      </div>
    </div>
  );
}
