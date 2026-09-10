import { FaCashRegister } from 'react-icons/fa';
import './AvisoSinCaja.css';

/**
 * Bloque prominente que se muestra cuando un operador con efectivo (Recargador /
 * Devolución) NO tiene un arqueo de caja abierto para el evento: no puede operar
 * hasta abrirlo. Reemplaza el aviso chico e inline que costaba entender.
 *
 * @param {string}   descripcion  qué no puede hacer sin caja
 * @param {Function} onAbrir      ir a la pestaña de arqueo de caja
 */
export default function AvisoSinCaja({ descripcion, onAbrir }) {
  return (
    <div className="qp-sin-caja" role="alert">
      <FaCashRegister className="qp-sin-caja__icon" aria-hidden="true" />
      <h3 className="qp-sin-caja__titulo">Primero abrí tu caja</h3>
      <p className="qp-sin-caja__texto">{descripcion}</p>
      <button type="button" className="qp-sin-caja__btn" onClick={onAbrir}>
        <FaCashRegister aria-hidden="true" /> Abrir arqueo de caja
      </button>
    </div>
  );
}
