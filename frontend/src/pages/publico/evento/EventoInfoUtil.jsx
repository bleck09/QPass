import {
  FaTicketAlt, FaMobileAlt, FaQrcode, FaWallet, FaUndoAlt, FaIdCard, FaLock, FaGlassCheers,
} from 'react-icons/fa';
import { useRevelar } from '../../../utils/useRevelar.js';
import './EventoInfoUtil.css';

/**
 * "Antes de ir": cómo se compra y qué tener en cuenta para ESTE evento. Los
 * textos cambian según el tipo de manilla y el plazo de devolución que
 * configuró Admin (Evento.tipoManilla / Evento.diasParaRetiro).
 */
export default function EventoInfoUtil({ evento, diasParaRetiro }) {
  const digital = evento?.tipoManilla === 'digital';
  const [refPasos, pasosVisibles] = useRevelar();
  const [refCartas, cartasVisibles] = useRevelar();

  const pasos = [
    { icono: FaTicketAlt, titulo: 'Elegí tu entrada', texto: 'Categoría y cantidad. Podés sumar entradas para tus amigos.' },
    { icono: FaMobileAlt, titulo: 'Pagá con QR', texto: 'Transferí desde tu banco y subí la foto del comprobante.' },
    {
      icono: FaQrcode,
      titulo: digital ? 'Recibí tu QR' : 'Retirá tu manilla',
      texto: digital
        ? 'Aprobado el pago, tu QR aparece en tu cuenta.'
        : 'Aprobado el pago, retirás tu manilla en el punto de entrega del evento.',
    },
    { icono: FaGlassCheers, titulo: 'Disfrutá sin efectivo', texto: 'Entrás con tu QR y pagás todo con tu manilla.' },
  ];

  const cartas = [
    {
      icono: digital ? FaMobileAlt : FaQrcode,
      titulo: digital ? 'Acceso con tu celular' : 'Acceso con manilla física',
      texto: digital
        ? 'Tu entrada es un QR en tu cuenta. Mostralo en la puerta con el brillo alto y entrás en segundos.'
        : 'Retirás la manilla en el evento y te la vinculan a tu entrada. Esa manilla es tu acceso y tu billetera.',
    },
    { icono: FaWallet, titulo: 'Adentro no se usa efectivo', texto: 'Recargás saldo en los puntos de recarga y pagás en cualquier puesto con tu manilla.' },
    { icono: FaUndoAlt, titulo: 'Tu saldo no se pierde', texto: `Lo que no gastes se devuelve. Tenés hasta ${diasParaRetiro} días después del evento para retirarlo.` },
    { icono: FaIdCard, titulo: 'Entradas personales', texto: 'Cada entrada lleva el nombre de su titular y no es transferible salvo autorización.' },
    { icono: FaLock, titulo: 'QR protegido', texto: 'Si alguien copia tu QR, se bloquea y el personal verifica quién es el dueño real.' },
  ];

  return (
    <>
      <ol
        ref={refPasos}
        className={`ev-info__pasos qp-escalonado${pasosVisibles ? ' es-visible' : ''}`}
      >
        {pasos.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} style={{ '--i': i }}>
            <span className="ev-info__paso-ic" aria-hidden="true">
              <Icono />
              <em>{i + 1}</em>
            </span>
            <strong>{titulo}</strong>
            <span>{texto}</span>
          </li>
        ))}
      </ol>

      <ul
        ref={refCartas}
        className={`ev-info__cartas qp-escalonado${cartasVisibles ? ' es-visible' : ''}`}
      >
        {cartas.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} style={{ '--i': i }}>
            <span className="ev-info__carta-ic" aria-hidden="true"><Icono /></span>
            <span>
              <strong>{titulo}</strong>
              <span>{texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
