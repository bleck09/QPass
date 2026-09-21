import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaUserPlus, FaMobileAlt, FaQrcode, FaWallet,
  FaHistory, FaUndoAlt, FaUserFriends, FaLock, FaBolt, FaArrowRight,
} from 'react-icons/fa';
import './InfoSecciones.css';

const PASOS = [
  {
    icono: FaCalendarAlt,
    titulo: 'Elegí tu evento',
    texto: 'Buscalo en la cartelera y mirá fecha, lugar, actividades y precios.',
  },
  {
    icono: FaUserPlus,
    titulo: 'Sumá tus entradas',
    texto: 'Elegí la categoría y cuántas querés: también para tus amigos, con sus datos.',
  },
  {
    icono: FaMobileAlt,
    titulo: 'Pagá con QR',
    texto: 'Escaneá el QR desde tu app del banco y subí la foto del comprobante.',
  },
  {
    icono: FaQrcode,
    titulo: 'Recibí tu manilla',
    texto: 'Aprobado el pago, te llega tu manilla digital con QR. Si no tenías cuenta, te la creamos.',
  },
];

const FACILIDADES = [
  { icono: FaBolt, titulo: 'Entrás en segundos', texto: 'Mostrás tu QR en puerta y listo. Sin papel ni filas eternas.' },
  { icono: FaWallet, titulo: 'Sin efectivo adentro', texto: 'Recargás saldo y pagás comida y bebida con tu manilla.' },
  { icono: FaHistory, titulo: 'Todo a la vista', texto: 'Tu saldo por evento y cada compra y recarga en tu historial.' },
  { icono: FaUndoAlt, titulo: 'Te devolvemos lo que sobra', texto: 'El saldo que no usaste se devuelve al final del evento.' },
  { icono: FaUserFriends, titulo: 'Entradas para tu grupo', texto: 'Comprás para todos en una sola operación.' },
  { icono: FaLock, titulo: 'Manilla protegida', texto: 'Si alguien copia tu QR, la bloqueamos y verificamos quién es el dueño.' },
];

/**
 * Sección "Para asistentes" de la landing: cómo se compra una entrada y qué
 * facilidades tiene el usuario normal dentro del evento.
 */
export default function AsistentesSection() {
  const navigate = useNavigate();

  return (
    <>
      <div className="section-header qp-info__header">
        <span className="qp-info__eyebrow">Para asistentes</span>
        <h2>Tu entrada en 4 pasos</h2>
        <p>Comprás desde el celular y en el evento solo necesitás tu manilla.</p>
      </div>

      <ol className="qp-info__pasos">
        {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} className="qp-info__paso glass-morphism">
            <span className="qp-info__paso-top">
              <span className="qp-info__num" aria-hidden="true">{i + 1}</span>
              <Icono className="qp-info__paso-ic" aria-hidden="true" />
            </span>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </li>
        ))}
      </ol>

      <ul className="qp-info__facilidades">
        {FACILIDADES.map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo}>
            <span className="icon-circle" aria-hidden="true"><Icono /></span>
            <span>
              <strong>{titulo}</strong>
              <span>{texto}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="qp-info__cta-fila">
        <a href="#cartelera" className="qp-info__cta">
          Ver cartelera <FaArrowRight aria-hidden="true" />
        </a>
        <button type="button" className="qp-info__cta qp-info__cta--sec" onClick={() => navigate('/Registrar')}>
          Crear mi cuenta
        </button>
      </div>
    </>
  );
}
