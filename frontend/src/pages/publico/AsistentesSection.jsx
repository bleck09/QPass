import { useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaWallet, FaArrowRight, FaTimes, FaCheck, FaChevronDown, FaCheckCircle,
} from 'react-icons/fa';
import DemoCompra from './DemoCompra.jsx';
import { IMAGENES_LANDING } from '../../constants/imagenesLanding.js';
import { useRevelar } from '../../utils/useRevelar.js';
import './InfoSecciones.css';
import Boton from '../../components/Boton.jsx';

// "Evento tradicional" vs "Con QPass": lo didáctico es ver el cambio, no una
// lista de ventajas sueltas.
const COMPARACION = [
  { tema: 'Entrada', antes: 'Impresa o en una foto que se puede copiar', con: 'Manilla digital con QR único y verificado' },
  { tema: 'Ingreso', antes: 'Filas largas y control a mano', con: 'Escaneo en segundos en la puerta' },
  { tema: 'Pagos adentro', antes: 'Efectivo, vuelto y filas en cada caja', con: 'Pagas con tu manilla, sin efectivo' },
  { tema: 'Tus gastos', antes: 'No sabes cuánto gastaste', con: 'Saldo e historial de compras y recargas' },
  { tema: 'Lo que sobra', antes: 'Fichas o tickets que no se devuelven', con: 'Te devolvemos el saldo que no usaste' },
  { tema: 'Si te copian', antes: 'Entra quien llegue primero', con: 'Bloqueamos la copia y verificamos al dueño' },
];

const PREGUNTAS = [
  {
    p: '¿Necesito crear una cuenta para comprar?',
    r: 'No es obligatorio. Si no tienes cuenta, la creamos cuando se aprueba tu compra y te enviamos el acceso por correo. La primera vez que entras cambias la contraseña y cargas tu CI.',
  },
  {
    p: '¿Cómo pago mis entradas?',
    r: 'Con el QR de pago que aparece al comprar: lo escaneas desde la app de tu banco, haces la transferencia y subes la foto del comprobante. Un administrador lo revisa y aprueba la compra.',
  },
  {
    p: '¿Puedo comprar entradas para otras personas?',
    r: 'Sí. En una misma compra agregas varias entradas y cargas el nombre, correo y celular de cada invitado. Cada uno recibe su propia manilla.',
  },
  {
    p: '¿Cómo cargo saldo para consumir adentro?',
    r: 'En los puntos de recarga del evento. El saldo queda en tu manilla y con ella pagas en cualquier puesto. Tu saldo y tus movimientos los ves en tu cuenta.',
  },
  {
    p: '¿Qué pasa con el saldo que no gasté?',
    r: 'Te lo devolvemos en las cajas de devolución del evento. No pierdes nada de lo que cargaste.',
  },
  {
    p: '¿Y si alguien copia el QR de mi manilla?',
    r: 'El sistema detecta la copia apenas se escanea, la bloquea y avisa al personal del evento, que verifica quién es el dueño real.',
  },
];

/**
 * Sección "Para asistentes" de la landing: cómo se compra (demo interactiva),
 * qué cambia respecto de un evento tradicional y preguntas frecuentes.
 */
export default function AsistentesSection() {
  const navigate = useNavigate();
  const [refComp, compVisible] = useRevelar();

  return (
    <>
      <div className="qp-info__intro">
        <div className="pi-home-section-header qp-info__header">
          <span className="qp-info__eyebrow">Para asistentes</span>
          <h2>Compras desde el celular. <span className="qp-info__resalte">Adentro solo necesitas tu manilla.</span></h2>
          <p>
            Sin entradas impresas, sin efectivo y sin filas eternas. Así funciona
            QPass para ti, paso a paso.
          </p>
        </div>

        <div className="qp-info__foto" aria-hidden="true">
          <img src={IMAGENES_LANDING.celularConcierto} alt="" width="900" height="600" loading="lazy" />
          <span className="qp-info__flotante qp-info__flotante--a">
            <FaQrcode /> <span><b>Acceso validado</b><small>Manilla General</small></span>
          </span>
          <span className="qp-info__flotante qp-info__flotante--b">
            <FaWallet /> <span><b>Bs 45 pagado</b><small>con tu manilla</small></span>
          </span>
        </div>
      </div>

      <h3 className="qp-info__subtitulo">Tu entrada en 4 pasos</h3>
      <DemoCompra />

      <h3 className="qp-info__subtitulo">¿Qué cambia con QPass?</h3>
      <div
        ref={refComp}
        className={`qp-info__comparacion qp-escalonado${compVisible ? ' es-visible' : ''}`}
        role="table"
        aria-label="Evento tradicional comparado con QPass"
      >
        <div className="qp-info__comp-cabecera" role="row" style={{ '--i': 0 }}>
          <span role="columnheader" className="qp-info__comp-tema">&nbsp;</span>
          <span role="columnheader">Evento tradicional</span>
          <span role="columnheader" className="qp-info__comp-qpass">Con QPass</span>
        </div>
        {COMPARACION.map((c, i) => (
          <div key={c.tema} className="qp-info__comp-fila" role="row" style={{ '--i': i + 1 }}>
            <span role="rowheader" className="qp-info__comp-tema">{c.tema}</span>
            <span role="cell" className="qp-info__comp-antes"><FaTimes aria-hidden="true" /> {c.antes}</span>
            <span role="cell" className="qp-info__comp-con"><FaCheck aria-hidden="true" /> {c.con}</span>
          </div>
        ))}
      </div>

      <h3 className="qp-info__subtitulo">Preguntas frecuentes</h3>
      <div className="qp-info__faq">
        {PREGUNTAS.map(({ p, r }) => (
          <details key={p} className="qp-info__faq-item">
            <summary>
              {p}
              <FaChevronDown className="qp-info__faq-flecha" aria-hidden="true" />
            </summary>
            <p>{r}</p>
          </details>
        ))}
      </div>

      <div className="qp-info__banda" style={{ '--foto': `url(${IMAGENES_LANDING.confeti})` }}>
        <div className="qp-info__banda-texto">
          <h3>Tu próximo evento te está esperando</h3>
          <p>
            <FaCheckCircle aria-hidden="true" /> Compra online
            <FaCheckCircle aria-hidden="true" /> Entradas para tu grupo
            <FaCheckCircle aria-hidden="true" /> Saldo devuelto
          </p>
        </div>
        <div className="qp-info__cta-fila">
          <Boton como="a" href="#cartelera" variante="acento" pildora iconoDerecha={FaArrowRight}>
            Ver cartelera
          </Boton>
          <Boton variante="translucido" pildora onClick={() => navigate('/Registrar')}>
            Crear mi cuenta
          </Boton>
        </div>
      </div>
    </>
  );
}
