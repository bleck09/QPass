import { FaCashRegister } from 'react-icons/fa';
import Boton from './Boton.jsx';
import { EstadoVacio } from './EstadosAsync.jsx';

/**
 * Se muestra cuando un operador con efectivo (Recargador / Devolución) NO
 * tiene un arqueo de caja abierto para el evento: no puede operar hasta
 * abrirlo. Es el <EstadoVacio> global con su acción (sin estilos propios).
 *
 * @param {string}   descripcion  qué no puede hacer sin caja
 * @param {Function} onAbrir      ir a la pestaña de arqueo de caja
 */
export default function AvisoSinCaja({ descripcion, onAbrir }) {
  return (
    <div role="alert">
      <EstadoVacio
        icono={FaCashRegister}
        titulo="Primero abrí tu caja"
        mensaje={descripcion}
        accion={<Boton icono={FaCashRegister} onClick={onAbrir}>Abrir arqueo de caja</Boton>}
      />
    </div>
  );
}
