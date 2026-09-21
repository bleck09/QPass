import {
  FaTicketAlt, FaQrcode, FaWallet, FaBolt, FaUndoAlt, FaStore, FaChartLine, FaShieldAlt,
} from 'react-icons/fa';
import './CintaBeneficios.css';

const ITEMS = [
  { icono: FaTicketAlt, texto: 'Entradas online' },
  { icono: FaQrcode, texto: 'Manilla QR única' },
  { icono: FaBolt, texto: 'Acceso en segundos' },
  { icono: FaWallet, texto: 'Pagos sin efectivo' },
  { icono: FaStore, texto: 'Puestos conectados' },
  { icono: FaUndoAlt, texto: 'Devolución de saldo' },
  { icono: FaChartLine, texto: 'Métricas en tiempo real' },
  { icono: FaShieldAlt, texto: 'Anti-copias' },
];

/**
 * Cinta que se desplaza sin fin bajo el hero. La lista va dos veces seguidas
 * y la animación corre exactamente la mitad del ancho: cuando termina, la
 * segunda copia está donde empezó la primera y el salto no se nota.
 * La copia es decorativa (aria-hidden); los lectores leen la lista una vez.
 */
export default function CintaBeneficios() {
  const lista = (copia) => (
    <ul className="qp-cinta__lista" aria-hidden={copia || undefined}>
      {ITEMS.map(({ icono: Icono, texto }) => (
        <li key={texto}>
          <Icono aria-hidden="true" /> {texto}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="qp-cinta">
      <div className="qp-cinta__pista">
        {lista(false)}
        {lista(true)}
      </div>
    </div>
  );
}
