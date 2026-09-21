import { useRef, useState } from 'react';
import {
  FaTicketAlt, FaQrcode, FaWallet, FaStore, FaUsersCog, FaShieldAlt,
  FaChartLine, FaArrowRight, FaCashRegister, FaBoxOpen, FaUserFriends,
  FaMapMarkedAlt, FaCalendarCheck, FaHandPointer, FaCheckCircle, FaReceipt,
} from 'react-icons/fa';
import PanelEjemplo from './PanelEjemplo.jsx';
import { IMAGENES_LANDING } from '../../constants/imagenesLanding.js';
import { useRevelar } from '../../utils/useRevelar.js';
import './InfoSecciones.css';
import Boton from '../../components/Boton.jsx';

// Lo que QPass resuelve por el organizador. Cada ítem corresponde a un módulo
// que ya existe en el sistema: no prometer acá nada que la app no haga.
const SERVICIOS = [
  { icono: FaTicketAlt, titulo: 'Venta de entradas online', texto: 'Tu evento con página propia: colores, actividades, cronograma y categorías de entrada con cupos y precios.' },
  { icono: FaQrcode, titulo: 'Manillas con QR único', texto: 'Cada asistente recibe su manilla QR. El acceso se valida en segundos y las copias se bloquean al instante.' },
  { icono: FaWallet, titulo: 'Cashless de punta a punta', texto: 'Puntos de recarga, pagos con la manilla en cada puesto y devolución del saldo que no se usó.' },
  { icono: FaMapMarkedAlt, titulo: 'Mapa del recinto y puestos', texto: 'Diseñamos la distribución del lugar y ubicamos cada puesto de comida, bebida o merchandising.' },
  { icono: FaUsersCog, titulo: 'Personal operativo', texto: 'Recargadores, supervisores y cajas de devolución con su propia cuenta y su corte de caja.' },
  { icono: FaShieldAlt, titulo: 'Control y auditoría', texto: 'Cada venta, recarga y devolución queda registrada: quién, dónde y cuándo.' },
];

// Explicación de las marcas 1-2-3 de la maqueta del panel.
const EXPLICA_PANEL = [
  { titulo: 'Tus números clave', texto: 'Entradas vendidas contra el cupo, ingresos, recargas y consumos, actualizados al momento.' },
  { titulo: 'Cómo avanza la venta', texto: 'Mirá semana a semana cómo se venden las entradas y decidí cuándo empujar la difusión.' },
  { titulo: 'Qué funciona en el evento', texto: 'Ranking de puestos y productos más vendidos, más las alertas de manillas duplicadas.' },
];

const PASOS = [
  { titulo: 'Nos contactás', vos: 'Fecha, lugar y cuánta gente esperás.', nosotros: 'Te asesoramos sobre cómo armarlo.' },
  { titulo: 'Armamos el evento', vos: 'Nos pasás fotos, actividades y precios.', nosotros: 'Página, entradas, QR y mapa de puestos.' },
  { titulo: 'Publicamos y vendés', vos: 'Difundís tu evento.', nosotros: 'Lo sumamos a la cartelera y aprobamos los pagos.' },
  { titulo: 'El día del evento', vos: 'Te enfocás en el show.', nosotros: 'Acceso con QR, recargas y cobros en puestos.' },
  { titulo: 'Cierre', vos: 'Recibís tu informe en PDF.', nosotros: 'Cortes de caja y devolución de saldos.' },
];

const FLUJO_COBRO = [
  { icono: FaHandPointer, titulo: 'El cliente pide', texto: 'Elige del catálogo de tu puesto.' },
  { icono: FaQrcode, titulo: 'Escaneás su manilla', texto: 'Vos o tu ayudante, desde el celular.' },
  { icono: FaCheckCircle, titulo: 'Cobro listo', texto: 'Se descuenta el saldo al instante.' },
  { icono: FaReceipt, titulo: 'Venta registrada', texto: 'Suma a tus ventas y baja tu stock.' },
];

const BENEFICIOS_NEGOCIO = [
  { icono: FaBoxOpen, titulo: 'Tu catálogo', texto: 'Tus productos, precios y stock, cargados por vos.' },
  { icono: FaCashRegister, titulo: 'Sin efectivo', texto: 'Nada de vuelto, billetes falsos ni cajas descuadradas.' },
  { icono: FaUserFriends, titulo: 'Tus ayudantes', texto: 'Cada ayudante con su cuenta para cobrar en el puesto.' },
  { icono: FaChartLine, titulo: 'Tus ventas al momento', texto: 'Qué se vende, cuánto llevás y qué se está agotando.' },
];

const PESTANAS = [
  { id: 'organizador', etiqueta: 'Organizo un evento', icono: FaCalendarCheck },
  { id: 'negocio', etiqueta: 'Tengo un negocio', icono: FaStore },
];

// Luz que sigue al puntero sobre las tarjetas (ver .qp-info__servicio::before).
const seguirPuntero = (e) => {
  const tarjeta = e.target.closest?.('.qp-info__servicio');
  if (!tarjeta) return;
  const r = tarjeta.getBoundingClientRect();
  tarjeta.style.setProperty('--mx', `${e.clientX - r.left}px`);
  tarjeta.style.setProperty('--my', `${e.clientY - r.top}px`);
};

function VistaOrganizador({ onContactar }) {
  const [refServ, servVisible] = useRevelar();
  const [refPasos, pasosVisible] = useRevelar();

  return (
    <>
      <ul
        ref={refServ}
        className={`qp-info__servicios qp-escalonado${servVisible ? ' es-visible' : ''}`}
        onPointerMove={seguirPuntero}
      >
        {SERVICIOS.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} className="qp-info__servicio glass-morphism" style={{ '--i': i }}>
            <span className="icon-circle" aria-hidden="true"><Icono /></span>
            <h4>{titulo}</h4>
            <p>{texto}</p>
          </li>
        ))}
      </ul>

      <h3 className="qp-info__subtitulo">Así se ve tu panel</h3>
      <div className="qp-info__panel-explicado">
        <ol className="qp-info__explica">
          {EXPLICA_PANEL.map((e, i) => (
            <li key={e.titulo}>
              <span className="qp-info__num qp-info__num--coral" aria-hidden="true">{i + 1}</span>
              <span>
                <strong>{e.titulo}</strong>
                <span>{e.texto}</span>
              </span>
            </li>
          ))}
        </ol>
        <PanelEjemplo />
      </div>

      <h3 className="qp-info__subtitulo">Cómo trabajamos</h3>
      <ol
        ref={refPasos}
        className={`qp-info__timeline qp-escalonado${pasosVisible ? ' es-visible' : ''}`}
      >
        {PASOS.map((p, i) => (
          <li key={p.titulo} style={{ '--i': i }}>
            <span className="qp-info__num" aria-hidden="true">{i + 1}</span>
            <strong>{p.titulo}</strong>
            <span className="qp-info__rol"><em>Vos</em>{p.vos}</span>
            <span className="qp-info__rol qp-info__rol--qp"><em>QPass</em>{p.nosotros}</span>
          </li>
        ))}
      </ol>

      <div className="qp-info__banda" style={{ '--foto': `url(${IMAGENES_LANDING.confeti})` }}>
        <div className="qp-info__banda-texto">
          <h3>¿Tenés una fecha en mente?</h3>
          <p>Contanos tu idea y te proponemos cómo armar tu evento con QPass.</p>
        </div>
        <div className="qp-info__cta-fila">
          <Boton variante="acento" pildora iconoDerecha={FaArrowRight} onClick={() => onContactar('organizar')}>
            Quiero organizar mi evento
          </Boton>
        </div>
      </div>
    </>
  );
}

function VistaNegocio({ onContactar }) {
  const [refBen, benVisible] = useRevelar();

  return (
    <>
      <div className="qp-info__negocio-intro">
        <div className="qp-info__collage" aria-hidden="true">
          <img src={IMAGENES_LANDING.cobroMostrador} alt="" width="900" height="600" loading="lazy" />
          <img src={IMAGENES_LANDING.foodTruck} alt="" width="600" height="400" loading="lazy" />
          <img src={IMAGENES_LANDING.brindis} alt="" width="600" height="400" loading="lazy" />
        </div>
        <div className="qp-info__negocio-texto">
          <h3>Vendé dentro de los eventos, sin tocar efectivo</h3>
          <p>
            Comida, bebidas o merchandising: te damos un puesto en el mapa del
            recinto y todo lo necesario para cobrar con la manilla del asistente.
          </p>
        </div>
      </div>

      <h3 className="qp-info__subtitulo">Así se cobra en tu puesto</h3>
      <ol className="qp-info__flujo">
        {FLUJO_COBRO.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} style={{ '--i': i }}>
            <span className="qp-info__flujo-ic" aria-hidden="true"><Icono /></span>
            <strong>{titulo}</strong>
            <span>{texto}</span>
          </li>
        ))}
      </ol>

      <ul
        ref={refBen}
        className={`qp-info__beneficios qp-escalonado${benVisible ? ' es-visible' : ''}`}
      >
        {BENEFICIOS_NEGOCIO.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} className="glass-morphism" style={{ '--i': i }}>
            <span className="qp-info__ic-alt" aria-hidden="true"><Icono /></span>
            <strong>{titulo}</strong>
            <span>{texto}</span>
          </li>
        ))}
      </ul>

      <div className="qp-info__banda qp-info__banda--coral" style={{ '--foto': `url(${IMAGENES_LANDING.foodTruck})` }}>
        <div className="qp-info__banda-texto">
          <h3>¿Querés tu puesto en el próximo evento?</h3>
          <p>Escribinos y te contamos qué eventos se vienen y cómo sumarte.</p>
        </div>
        <div className="qp-info__cta-fila">
          <Boton variante="compra" pildora iconoDerecha={FaArrowRight} onClick={() => onContactar('negocio')}>
            Quiero vender en un evento
          </Boton>
        </div>
      </div>
    </>
  );
}

/**
 * Sección "Para organizadores" de la landing, con dos pestañas: quien organiza
 * un evento (Cliente) y quien tiene un negocio y quiere vender adentro
 * (Usuario Negocio).
 *
 * `onContactar(tipo)`: lleva al formulario con el motivo preseleccionado
 * ('organizar' | 'negocio', claves de MOTIVOS_CONTACTO).
 */
export default function OrganizadoresSection({ onContactar }) {
  const [pestana, setPestana] = useState('organizador');
  const tabsRef = useRef({});

  const teclado = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const otra = pestana === 'organizador' ? 'negocio' : 'organizador';
    setPestana(otra);
    tabsRef.current[otra]?.focus();
  };

  return (
    <>
      <div className="qp-info__intro qp-info__intro--invertido">
        <div className="section-header qp-info__header">
          <span className="qp-info__eyebrow">Para organizadores y negocios</span>
          <h2>Vos ponés el show. <span className="qp-info__resalte">Nosotros, todo lo demás.</span></h2>
          <p>
            Gestionamos tu evento completo: desde la primera entrada vendida hasta
            el informe de cierre. Y si tenés un negocio, te llevamos a vender adentro.
          </p>
        </div>

        <div className="qp-info__foto" aria-hidden="true">
          <img src={IMAGENES_LANDING.publicoManos} alt="" width="900" height="600" loading="lazy" />
          <span className="qp-info__flotante qp-info__flotante--a">
            <FaTicketAlt /> <span><b>Venta online</b><small>entradas y manillas QR</small></span>
          </span>
          <span className="qp-info__flotante qp-info__flotante--b">
            <FaChartLine /> <span><b>Todo en tu panel</b><small>en tiempo real</small></span>
          </span>
        </div>
      </div>

      <div className="qp-info__tabs" role="tablist" aria-label="¿Qué buscás?" onKeyDown={teclado}>
        <span
          className="qp-info__tabs-indicador"
          style={{ transform: `translateX(${pestana === 'organizador' ? 0 : 100}%)` }}
          aria-hidden="true"
        />
        {PESTANAS.map(({ id, etiqueta, icono: Icono }) => (
          <button
            key={id}
            ref={(n) => { tabsRef.current[id] = n; }}
            type="button"
            role="tab"
            id={`qp-org-tab-${id}`}
            aria-selected={pestana === id}
            aria-controls={`qp-org-panel-${id}`}
            tabIndex={pestana === id ? 0 : -1}
            className={`qp-info__tab${pestana === id ? ' es-activa' : ''}`}
            onClick={() => setPestana(id)}
          >
            <Icono aria-hidden="true" /> {etiqueta}
          </button>
        ))}
      </div>

      <div
        key={pestana}
        id={`qp-org-panel-${pestana}`}
        role="tabpanel"
        aria-labelledby={`qp-org-tab-${pestana}`}
        className="qp-info__tabpanel"
      >
        {pestana === 'organizador'
          ? <VistaOrganizador onContactar={onContactar} />
          : <VistaNegocio onContactar={onContactar} />}
      </div>
    </>
  );
}
