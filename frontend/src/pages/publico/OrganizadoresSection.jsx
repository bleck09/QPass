import {
  FaTicketAlt, FaQrcode, FaWallet, FaStore, FaUsersCog, FaShieldAlt,
  FaChartLine, FaCheckCircle, FaArrowRight, FaCashRegister, FaBoxOpen,
  FaUserFriends, FaMapMarkedAlt,
} from 'react-icons/fa';
import './InfoSecciones.css';

// Lo que QPass resuelve por el organizador. Cada ítem corresponde a un módulo
// que ya existe en el sistema: no prometer acá nada que la app no haga.
const SERVICIOS = [
  {
    icono: FaTicketAlt,
    titulo: 'Venta de entradas online',
    texto: 'Tu evento con página propia: colores, actividades, cronograma y categorías de entrada con sus cupos y precios.',
  },
  {
    icono: FaQrcode,
    titulo: 'Manillas con QR único',
    texto: 'Cada asistente recibe su manilla QR. El acceso se valida en segundos y las copias se detectan y bloquean al instante.',
  },
  {
    icono: FaWallet,
    titulo: 'Cashless de punta a punta',
    texto: 'Puntos de recarga, pagos con la manilla en cada puesto y devolución del saldo que no se usó. Sin efectivo circulando.',
  },
  {
    icono: FaMapMarkedAlt,
    titulo: 'Mapa del recinto y puestos',
    texto: 'Diseñamos la distribución del lugar y ubicamos cada puesto de comida, bebida o merchandising.',
  },
  {
    icono: FaUsersCog,
    titulo: 'Personal operativo',
    texto: 'Recargadores, supervisores y cajas de devolución con su propia cuenta, cada uno con su corte de caja.',
  },
  {
    icono: FaShieldAlt,
    titulo: 'Control y auditoría',
    texto: 'Cada venta, recarga y devolución queda registrada. Sabés quién hizo qué, dónde y cuándo.',
  },
];

const DATOS_PANEL = [
  'Entradas vendidas por categoría y cupos restantes',
  'Ingresos de la venta de entradas en tiempo real',
  'Recargas y consumos durante la noche del evento',
  'Ranking de puestos y productos más vendidos',
  'Alertas de manillas duplicadas',
  'Informe de cierre descargable en PDF',
];

const PASOS = [
  { titulo: 'Nos contactás', texto: 'Contanos fecha, lugar y cuánta gente esperás.' },
  { titulo: 'Armamos tu evento', texto: 'Página, entradas, manillas QR y mapa de puestos.' },
  { titulo: 'Publicamos y vendés', texto: 'Tu evento sale en la cartelera y empieza la venta.' },
  { titulo: 'El día del evento', texto: 'Acceso con QR, recargas y consumos sin filas.' },
  { titulo: 'Cierre', texto: 'Cortes de caja, devoluciones e informe final.' },
];

const BENEFICIOS_NEGOCIO = [
  { icono: FaBoxOpen, texto: 'Tu propio catálogo de productos y precios' },
  { icono: FaCashRegister, texto: 'Cobrás con la manilla: sin efectivo ni vuelto' },
  { icono: FaUserFriends, texto: 'Cuentas para tus ayudantes en el puesto' },
  { icono: FaChartLine, texto: 'Ventas y stock de tu puesto al momento' },
];

/**
 * Sección "Para organizadores" de la landing: qué gestiona QPass, qué datos
 * ve el organizador y cómo es el proceso. Incluye un bloque para negocios que
 * quieren vender dentro de los eventos.
 *
 * `onContactar(tipo)`: lleva al formulario con el motivo preseleccionado
 * ('organizar' | 'negocio', claves de MOTIVOS_CONTACTO).
 */
export default function OrganizadoresSection({ onContactar }) {
  return (
    <>
      <div className="section-header qp-info__header">
        <span className="qp-info__eyebrow">Para organizadores</span>
        <h2>Vos ponés el show, nosotros todo lo demás</h2>
        <p>
          Gestionamos tu evento completo: desde la primera entrada vendida hasta el
          informe de cierre.
        </p>
      </div>

      <ul className="qp-info__servicios">
        {SERVICIOS.map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo} className="qp-info__servicio glass-morphism">
            <span className="icon-circle" aria-hidden="true"><Icono /></span>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </li>
        ))}
      </ul>

      <div className="qp-info__dos-col">
        <div className="qp-info__panel glass-morphism">
          <h3><FaChartLine aria-hidden="true" /> Lo que vas a ver en tu panel</h3>
          <ul className="qp-info__checks">
            {DATOS_PANEL.map((d) => (
              <li key={d}><FaCheckCircle aria-hidden="true" /> {d}</li>
            ))}
          </ul>
        </div>

        <div className="qp-info__panel glass-morphism">
          <h3>Cómo trabajamos</h3>
          <ol className="qp-info__pasos-lista">
            {PASOS.map((p, i) => (
              <li key={p.titulo}>
                <span className="qp-info__num" aria-hidden="true">{i + 1}</span>
                <span>
                  <strong>{p.titulo}</strong>
                  <span>{p.texto}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="qp-info__cta-fila">
        <button type="button" className="qp-info__cta" onClick={() => onContactar('organizar')}>
          Quiero organizar mi evento <FaArrowRight aria-hidden="true" />
        </button>
      </div>

      <aside className="qp-info__negocio glass-morphism" aria-labelledby="qp-info-negocio-titulo">
        <div className="qp-info__negocio-texto">
          <span className="qp-info__ic-alt" aria-hidden="true"><FaStore /></span>
          <div>
            <h3 id="qp-info-negocio-titulo">¿Tenés un negocio? Vendé dentro de los eventos</h3>
            <p>Comida, bebidas o merchandising: te damos un puesto en el mapa y todo para cobrar sin efectivo.</p>
          </div>
        </div>
        <ul className="qp-info__negocio-lista">
          {BENEFICIOS_NEGOCIO.map(({ icono: Icono, texto }) => (
            <li key={texto}><Icono aria-hidden="true" /> {texto}</li>
          ))}
        </ul>
        <button
          type="button"
          className="qp-info__cta qp-info__cta--sec"
          onClick={() => onContactar('negocio')}
        >
          Quiero vender en un evento <FaArrowRight aria-hidden="true" />
        </button>
      </aside>
    </>
  );
}
