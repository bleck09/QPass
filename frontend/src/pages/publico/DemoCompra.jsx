import { useRef, useState } from 'react';
import {
  FaCalendarAlt, FaUserPlus, FaMobileAlt, FaQrcode, FaMapMarkerAlt,
  FaMinus, FaPlus, FaCheckCircle, FaFileImage, FaLightbulb,
} from 'react-icons/fa';
import { IMAGENES_LANDING } from '../../constants/imagenesLanding.js';
import { useRevelar } from '../../utils/useRevelar.js';
import './DemoCompra.css';

const PASOS = [
  {
    icono: FaCalendarAlt,
    titulo: 'Elige tu evento',
    texto: 'Búscalo en la cartelera y entra a su página: fecha, lugar, actividades, horarios y precios.',
    tip: 'Cada evento tiene su propia página con toda la información antes de comprar.',
  },
  {
    icono: FaUserPlus,
    titulo: 'Suma tus entradas',
    texto: 'Elige la categoría y cuántas quieres. Puedes comprar también para tus amigos.',
    tip: 'Cada entrada lleva el nombre y el correo de quien la va a usar.',
  },
  {
    icono: FaMobileAlt,
    titulo: 'Paga con QR',
    texto: 'Escanea el QR desde la app de tu banco y sube la foto del comprobante.',
    tip: 'Revisamos tu comprobante y aprobamos la compra. Te avisamos por correo.',
  },
  {
    icono: FaQrcode,
    titulo: 'Recibe tu manilla',
    texto: 'Aprobado el pago, tu manilla digital con QR queda en tu cuenta. Si no tenías cuenta, te la creamos.',
    tip: 'La muestras en la puerta para entrar y con ella pagas todo adentro.',
  },
];

// Pantallas del celular: maqueta simple, con datos de ejemplo.
function Pantalla({ paso }) {
  if (paso === 0) {
    return (
      <div className="qp-demo__pant">
        <img className="qp-demo__portada" src={IMAGENES_LANDING.escenario} alt="" width="600" height="400" loading="lazy" />
        <strong className="qp-demo__evento">Festival de Ejemplo</strong>
        <span className="qp-demo__meta"><FaCalendarAlt aria-hidden="true" /> Sáb 15 nov · 20:00</span>
        <span className="qp-demo__meta"><FaMapMarkerAlt aria-hidden="true" /> Estadio Central</span>
        <span className="qp-demo__precio">Desde <b>Bs 80</b></span>
        <span className="qp-demo__boton">Comprar entradas</span>
      </div>
    );
  }
  if (paso === 1) {
    return (
      <div className="qp-demo__pant">
        <span className="qp-demo__rotulo">Elige tu categoría</span>
        {[['General', 80, 2], ['VIP', 150, 1]].map(([cat, precio, cant]) => (
          <span key={cat} className="qp-demo__fila">
            <span><b>{cat}</b><small>Bs {precio}</small></span>
            <span className="qp-demo__cant">
              <FaMinus aria-hidden="true" /> {cant} <FaPlus aria-hidden="true" />
            </span>
          </span>
        ))}
        <span className="qp-demo__rotulo">Titulares</span>
        {['Tú', 'Ana · invitada', 'Luis · invitado'].map((n) => (
          <span key={n} className="qp-demo__titular"><FaUserPlus aria-hidden="true" /> {n}</span>
        ))}
        <span className="qp-demo__total">Total <b>Bs 310</b></span>
      </div>
    );
  }
  if (paso === 2) {
    return (
      <div className="qp-demo__pant qp-demo__pant--centro">
        <span className="qp-demo__rotulo">Escanea para pagar</span>
        <span className="qp-demo__qr">
          <FaQrcode aria-hidden="true" />
          <span className="qp-demo__laser" />
        </span>
        <span className="qp-demo__total">Total <b>Bs 310</b></span>
        <span className="qp-demo__archivo">
          <FaFileImage aria-hidden="true" /> comprobante.jpg
          <FaCheckCircle className="qp-demo__ok" aria-hidden="true" />
        </span>
      </div>
    );
  }
  return (
    <div className="qp-demo__pant qp-demo__pant--centro">
      <span className="qp-demo__aprobada"><FaCheckCircle aria-hidden="true" /> Compra aprobada</span>
      <span className="qp-demo__manilla">
        <small>Festival de Ejemplo · General</small>
        <FaQrcode className="qp-demo__manilla-qr" aria-hidden="true" />
        <b>Tu manilla digital</b>
      </span>
      <span className="qp-demo__cuenta">
        {[['15', 'días'], ['04', 'hrs'], ['32', 'min']].map(([n, u]) => (
          <span key={u}><b>{n}</b><small>{u}</small></span>
        ))}
      </span>
    </div>
  );
}

/**
 * Demo del flujo de compra: pasos a la izquierda y un celular que muestra la
 * pantalla de cada paso. Avanza sola mientras está en pantalla; se pausa con
 * el mouse encima o con foco adentro, y el visitante puede elegir un paso.
 *
 * El avance lo dispara el fin de la animación de la barra de progreso: así
 * pausar la barra (animation-play-state) pausa también el avance, sin timers.
 */
export default function DemoCompra() {
  const [activo, setActivo] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [ref, enVista] = useRevelar({ unaVez: false, margen: '0px' });
  const tabsRef = useRef([]);

  const siguiente = () => setActivo((a) => (a + 1) % PASOS.length);

  const teclado = (e) => {
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const nuevo = (activo + delta + PASOS.length) % PASOS.length;
    setActivo(nuevo);
    tabsRef.current[nuevo]?.focus();
  };

  const corriendo = enVista && !pausa;

  return (
    <div
      ref={ref}
      className={`qp-demo${corriendo ? '' : ' esta-pausada'}`}
      onPointerEnter={() => setPausa(true)}
      onPointerLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)}
      onBlur={() => setPausa(false)}
    >
      <div className="qp-demo__pasos" role="tablist" aria-label="Pasos para comprar" aria-orientation="vertical" onKeyDown={teclado}>
        {PASOS.map(({ icono: Icono, titulo, texto, tip }, i) => (
          <button
            key={titulo}
            ref={(n) => { tabsRef.current[i] = n; }}
            type="button"
            role="tab"
            id={`qp-demo-tab-${i}`}
            aria-selected={activo === i}
            aria-controls="qp-demo-panel"
            tabIndex={activo === i ? 0 : -1}
            className={`qp-demo__paso${activo === i ? ' es-activo' : ''}`}
            onClick={() => setActivo(i)}
          >
            <span className="qp-demo__paso-num" aria-hidden="true">{i + 1}</span>
            <span className="qp-demo__paso-cuerpo">
              <span className="qp-demo__paso-titulo"><Icono aria-hidden="true" /> {titulo}</span>
              <span className="qp-demo__paso-texto">{texto}</span>
              {activo === i && (
                <span className="qp-demo__tip"><FaLightbulb aria-hidden="true" /> {tip}</span>
              )}
            </span>
            {activo === i && (
              <span
                key={activo}
                className="qp-demo__progreso"
                aria-hidden="true"
                onAnimationEnd={siguiente}
              />
            )}
          </button>
        ))}
      </div>

      <div className="qp-demo__escena" aria-hidden="true">
        <span className="qp-demo__halo" />
        <div className="qp-demo__celular">
          <span className="qp-demo__notch" />
          <div key={activo} className="qp-demo__pantalla">
            <Pantalla paso={activo} />
          </div>
        </div>
      </div>

      {/* Texto para lectores de pantalla: la escena del celular es decorativa. */}
      <p id="qp-demo-panel" role="tabpanel" aria-labelledby={`qp-demo-tab-${activo}`} className="sr-only">
        Paso {activo + 1} de {PASOS.length}: {PASOS[activo].titulo}. {PASOS[activo].tip}
      </p>
    </div>
  );
}
