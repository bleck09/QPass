import { FaArrowLeft } from 'react-icons/fa';
import './BotonVolver.css';

// Enlace de "volver" con estilo consistente (flecha + texto). El onClick decide
// a dónde: normalmente navigate(-1) o una ruta con state.
export default function BotonVolver({ onClick, children = 'Volver' }) {
  return (
    <button type="button" className="pi-boton-volver" onClick={onClick}>
      <FaArrowLeft aria-hidden="true" /> {children}
    </button>
  );
}
