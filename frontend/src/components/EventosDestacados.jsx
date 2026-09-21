import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaArrowRight, FaArrowLeft, FaMapMarkerAlt, FaClock,
  FaCalendarAlt, FaQrcode, FaRegLightbulb, FaTicketAlt, FaMobileAlt, FaCoins, FaHourglassHalf,
} from 'react-icons/fa';
import {
  imagenEvento, formatearFecha, diaLocalISO, estadoEvento, ESTADO_EVENTO,
} from '../utils/eventos.js';
import { useCuentaRegresiva } from '../utils/useCuentaRegresiva.js';
import './EventosDestacados.css';
import './EventosDestacadosTicket.css';

const DURACION_EXPANSION = 700; // ms — debe coincidir con la transición de .slot-expandiendo
const DURACION_CROSSFADE = 200;
const DURACION_ENTRADA_COLA = 650;
const INTERVALO_AUTOPLAY = 8500;

/**
 * Cuándo es el evento, en una línea. Si empieza y termina el mismo día del
 * calendario local muestra la fecha sola; si cruza varios días, el rango y
 * cuántos días dura. Se usa diaLocalISO y no las horas UTC porque una fiesta
 * que cruza medianoche tiene que contar como los dos días que se ven.
 */
function cuandoEs(evento) {
  const desde = diaLocalISO(evento.fecha);
  const hasta = diaLocalISO(evento.fechaFin);
  if (desde === hasta) {
    return { texto: formatearFecha(evento.fecha, false), dias: 1 };
  }
  const dias = Math.round((new Date(hasta) - new Date(desde)) / 86400000) + 1;
  return {
    texto: `${formatearFecha(evento.fecha, false)} — ${formatearFecha(evento.fechaFin, false)}`,
    dias,
  };
}

const dos = (n) => String(n).padStart(2, '0');

/** Cuenta regresiva en bloques (días / hs / min / seg). */
function BloquesCuenta({ fecha, className }) {
  const c = useCuentaRegresiva(fecha);
  if (!c || c.terminada) return null;
  return (
    <div className={className} aria-label={`Faltan ${c.dias} días, ${c.horas} horas y ${c.minutos} minutos`}>
      {[[c.dias, 'días'], [c.horas, 'hs'], [c.minutos, 'min'], [c.segundos, 'seg']].map(([v, u]) => (
        <span key={u} aria-hidden="true">
          <b key={v}>{u === 'días' ? v : dos(v)}</b>
          <em>{u}</em>
        </span>
      ))}
    </div>
  );
}

/**
 * Lado derecho de la cartelera: la entrada flotante del evento activo y, si
 * hay más eventos, una columna "Otros eventos" para saltar a cualquiera.
 * Reemplaza a la cola de tarjetas grandes (con la entrada al lado no había
 * lugar para las dos, y la cola sola dejaba sin entrada a los eventos).
 *
 * La entrada se inclina en 3D siguiendo al mouse (posición escrita directo en
 * el DOM) y se re-monta con cada evento (key) para girar al cambiar.
 */
function Escaparate({ evento, cuando, otros, onElegir }) {
  const inclinar = (e) => {
    if (e.pointerType === 'touch') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty('--ry', `${px * 14}deg`);
    e.currentTarget.style.setProperty('--rx', `${py * -14}deg`);
    e.currentTarget.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
    e.currentTarget.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  };
  const soltar = (e) => {
    e.currentTarget.style.setProperty('--rx', '0deg');
    e.currentTarget.style.setProperty('--ry', '0deg');
  };

  return (
    <div className="qp-dest__escaparate">
    <aside className="qp-dest__ticket" onPointerMove={inclinar} onPointerLeave={soltar} aria-label={`Entrada para ${evento.nombre}`}>
      <div key={evento.id} className="qp-dest__ticket-cuerpo">
        <div className="qp-dest__ticket-img" style={{ backgroundImage: `url(${imagenEvento(evento)})` }}>
          <span className="qp-dest__ticket-tag"><FaTicketAlt aria-hidden="true" /> Entrada</span>
        </div>
        <div className="qp-dest__ticket-info">
          <strong>{evento.nombre}</strong>
          <span><FaCalendarAlt aria-hidden="true" /> {cuando.texto}</span>
          <span><FaMapMarkerAlt aria-hidden="true" /> {evento.lugar}</span>
        </div>
        <div className="qp-dest__ticket-corte" aria-hidden="true" />
        <div className="qp-dest__ticket-pie">
          <span className="qp-dest__ticket-cuenta-tit"><FaHourglassHalf aria-hidden="true" /> Faltan</span>
          <BloquesCuenta fecha={evento.fecha} className="qp-dest__ticket-cuenta" />
          {/* Sin botón propio: el de compra ya está en el panel de la izquierda. */}
          <div className="qp-dest__ticket-compra">
            <em>Entradas desde</em>
            <b>{evento.precioDesde != null ? `Bs ${evento.precioDesde}` : 'Consultar'}</b>
          </div>
        </div>
        <span className="qp-dest__ticket-brillo" aria-hidden="true" />
      </div>
    </aside>

    {otros.length > 0 && (
      <nav className="qp-dest__otros" aria-label="Otros eventos">
        <span className="qp-dest__otros-tit">Otros eventos</span>
        {otros.map(({ ev, idx }, i) => (
          <button
            key={ev.id}
            type="button"
            className="qp-dest__otro"
            style={{ '--i': i }}
            onClick={() => onElegir(idx)}
          >
            <span className="qp-dest__otro-img" style={{ backgroundImage: `url(${imagenEvento(ev)})` }} aria-hidden="true" />
            <span className="qp-dest__otro-txt">
              <strong>{ev.nombre}</strong>
              <small>{formatearFecha(ev.fecha, false)}</small>
            </span>
          </button>
        ))}
      </nav>
    )}
    </div>
  );
}

/**
 * Cartelera destacada: escenario a pantalla completa con el evento activo de
 * fondo y una cola de tarjetas flotantes a la derecha. Al elegir una, la
 * tarjeta se expande hasta ocupar todo el escenario y el panel de texto hace
 * cross-fade.
 *
 * Se adapta a la cantidad real de eventos: la cola muestra como mucho los 3
 * siguientes, y con menos eventos simplemente muestra los que haya. Con menos
 * de dos no hay nada que rotar, así que el componente no se dibuja.
 *
 * Se usa en dos lugares:
 *   - landing pública: completo, con encabezado y banner.
 *   - panel del Usuario Normal: `compacto`, sin encabezado ni banner (el
 *     panel ya tiene su propio marco) y con el saldo que le queda en cada
 *     evento.
 */
export default function EventosDestacados({
  eventos = [],
  onVerEvento,
  saldoPorEvento,
  compacto = false,
  textoCta = 'Ver evento y comprar',
  id = 'cartelera',
}) {
  const total = eventos.length;

  const [activo, setActivo] = useState(0);
  const [fondoSaliente, setFondoSaliente] = useState(null);
  const [expandiendo, setExpandiendo] = useState(null);
  const [infoVisible, setInfoVisible] = useState(0);
  const [textoSaliendo, setTextoSaliendo] = useState(false);
  const [recienReemplazado, setRecienReemplazado] = useState(null);
  const [pausado, setPausado] = useState(false);

  const bloqueoRef = useRef(false);
  // Espejo de `activo` para leerlo desde callbacks estables (autoplay, flechas)
  // sin volver a crearlos ni arrastrar un valor viejo.
  const activoRef = useRef(0);
  // Todos los timers vivos, para poder cortarlos si el componente se desmonta
  // en medio de una transición (si no, React avisa por setState sobre un
  // componente ya desmontado).
  const timersRef = useRef([]);

  const programar = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => { activoRef.current = activo; }, [activo]);

  /**
   * `desde` viaja explícito en vez de leerse dentro de un updater: el fondo
   * que sale y el que entra tienen que ser los mismos durante toda la
   * transición, y el activo real recién cambia cuando la expansión terminó.
   */
  const irA = useCallback((destino, desde) => {
    setFondoSaliente(desde);
    setExpandiendo(destino);

    setTextoSaliendo(true);
    programar(() => {
      setInfoVisible(destino);
      setTextoSaliendo(false);
    }, DURACION_CROSSFADE);

    programar(() => {
      setActivo(destino);
      setRecienReemplazado(desde);
      setExpandiendo(null);
      setFondoSaliente(null);
      bloqueoRef.current = false;
      programar(() => setRecienReemplazado(null), DURACION_ENTRADA_COLA);
    }, DURACION_EXPANSION);
  }, [programar]);

  const avanzar = useCallback((paso) => {
    if (bloqueoRef.current || total < 2) return;
    bloqueoRef.current = true;
    const desde = activoRef.current;
    irA((desde + paso + total) % total, desde);
  }, [irA, total]);

  const elegirTarjeta = (destino) => {
    if (bloqueoRef.current || destino === activo) return;
    bloqueoRef.current = true;
    irA(destino, activo);
  };

  // Autoplay. Se guarda `avanzar` en un ref para que el intervalo no se
  // reinicie en cada render (el original lo recreaba con cada cambio de
  // estado, así que el tiempo entre saltos nunca era el declarado).
  const avanzarRef = useRef(avanzar);
  useEffect(() => { avanzarRef.current = avanzar; }, [avanzar]);

  useEffect(() => {
    if (pausado || total < 2) return;
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (sinMovimiento) return;

    const id = setInterval(() => avanzarRef.current(1), INTERVALO_AUTOPLAY);
    return () => clearInterval(id);
  }, [pausado, total]);

  if (total === 0) return null;

  // Si la lista cambia (la API recarga), el indice guardado puede quedar fuera de rango.
  const evento = eventos[infoVisible] ?? eventos[0];
  const cuando = cuandoEs(evento);

  /** Qué ranura le toca a cada evento en este momento. */
  const ranuraDe = (idx) => {
    if (idx === expandiendo) return 'qp-dest__item--expandiendo';
    if (idx === fondoSaliente && expandiendo !== null) return 'qp-dest__item--fondo-saliente';
    if (idx === activo && expandiendo === null) return 'qp-dest__item--fondo';

    const base = expandiendo ?? activo;
    const orden = (idx - base + total) % total;
    if (orden === 1) return 'qp-dest__item--cola1';
    if (orden === 2) return 'qp-dest__item--cola2';
    if (orden === 3) {
      return idx === recienReemplazado
        ? 'qp-dest__item--cola3 qp-dest__item--entrando'
        : 'qp-dest__item--cola3';
    }
    return 'qp-dest__item--fuera';
  };

  return (
    <section
      id={id}
      className={`qp-dest${compacto ? ' qp-dest--compacto' : ' qp-dest--con-ticket'}`}
      aria-label="Cartelera destacada"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {/* 1. Encabezado (solo en la landing: el panel ya tiene el suyo) */}
      {!compacto && (
      <div className="qp-dest__cabecera">
        <p className="qp-dest__chip">
          <span className="qp-dest__chip-punto" aria-hidden="true" />
          CARTELERA DESTACADA
        </p>
        <h2 className="qp-dest__titulo">Elegí tu próximo evento</h2>
        <p className="qp-dest__bajada">
          Entrás con tu manilla QR y pagás sin efectivo en cualquier puesto.
        </p>
      </div>
      )}

      {/* 2. Escenario con el fondo activo y la cola de tarjetas */}
      <div className="qp-dest__pista">
        {eventos.map((ev, idx) => {
          const ranura = ranuraDe(idx);
          const enCola = ranura.includes('cola');
          const clickeable = enCola && expandiendo === null;

          return (
            <div
              key={ev.id}
              className={`qp-dest__item ${ranura}`}
              style={{ backgroundImage: `url(${imagenEvento(ev)})` }}
              onClick={clickeable ? () => elegirTarjeta(idx) : undefined}
              onKeyDown={clickeable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirTarjeta(idx); }
              } : undefined}
              role={clickeable ? 'button' : undefined}
              tabIndex={clickeable ? 0 : undefined}
              aria-label={clickeable ? `Ver ${ev.nombre}` : undefined}
            >
              <div className="qp-dest__velo" aria-hidden="true" />

              {enCola && (
                <div className="qp-dest__mini">
                  <span className="qp-dest__mini-pill">
                    <FaQrcode aria-hidden="true" />
                    {ev.precioDesde != null ? `Desde Bs. ${ev.precioDesde}` : 'Cashless'}
                  </span>
                  <span className="qp-dest__mini-pie">
                    <span className="qp-dest__mini-num">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="qp-dest__mini-nombre">{ev.nombre}</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!compacto && (
        <Escaparate
          evento={evento}
          cuando={cuando}
          otros={Array.from({ length: Math.min(3, total - 1) }, (_, k) => {
            const idx = (activo + k + 1) % total;
            return { ev: eventos[idx], idx };
          })}
          onElegir={elegirTarjeta}
        />
      )}

      {/* 3. Panel de información con cross-fade */}
      <div className="qp-dest__panel">
        <div className={`qp-dest__info${textoSaliendo ? ' es-saliendo' : ''}`}>
          <p className="qp-dest__estado">
            <span className="qp-dest__estado-punto" aria-hidden="true" />
            {ESTADO_EVENTO[estadoEvento(evento)]?.label ?? 'Próximo'}
            {cuando.dias > 1 && <> · {cuando.dias} jornadas</>}
          </p>

          <h3 className="qp-dest__evento-nombre">{evento.nombre}</h3>

          {saldoPorEvento?.get(evento.id) > 0 && (
            <p className="qp-dest__saldo">
              <FaCoins aria-hidden="true" />
              Te quedan <strong>{saldoPorEvento.get(evento.id)}</strong> pts acá
            </p>
          )}

          <p className="qp-dest__evento-lugar">
            <FaMapMarkerAlt aria-hidden="true" /> {evento.lugar}
          </p>

          <ul className="qp-dest__datos">
            <li>
              <FaCalendarAlt aria-hidden="true" />
              <span><em>Cuándo</em>{cuando.texto}</span>
            </li>
            <li>
              <FaClock aria-hidden="true" />
              <span><em>Apertura</em>{formatearFecha(evento.fecha).split(', ').pop()}</span>
            </li>
            <li>
              {evento.tipoManilla === 'digital'
                ? <FaMobileAlt aria-hidden="true" />
                : <FaQrcode aria-hidden="true" />}
              <span>
                <em>Acceso</em>
                {evento.tipoManilla === 'digital'
                  ? 'QR digital en tu celular'
                  : 'Manilla física en puerta'}
              </span>
            </li>
            <li>
              <FaTicketAlt aria-hidden="true" />
              <span>
                <em>Entradas</em>
                {evento.precioDesde != null ? `Desde Bs. ${evento.precioDesde}` : 'Consultar'}
              </span>
            </li>
          </ul>

          <BloquesCuenta fecha={evento.fecha} className="qp-dest__cuenta" />

          <button
            type="button"
            className="qp-dest__cta"
            onClick={() => onVerEvento?.(evento)}
          >
            {textoCta}
            <FaArrowRight aria-hidden="true" />
          </button>
        </div>

        {total > 1 && (
          <div className="qp-dest__controles">
            <p className="qp-dest__contador">
              <span className="qp-dest__contador-num">
                {String(infoVisible + 1).padStart(2, '0')}
              </span>
              <span className="qp-dest__contador-barra">/</span>
              <span className="qp-dest__contador-total">
                {String(total).padStart(2, '0')}
              </span>
            </p>
            {/* Cuánto falta para pasar al siguiente evento. Se reinicia con cada
                cambio de evento y al salir de la pausa (el temporizador del
                autoplay también arranca de cero ahí), así van sincronizados. */}
            <span
              key={`${activo}-${pausado}`}
              className={`qp-dest__autoplay${pausado ? ' esta-pausado' : ''}`}
              style={{ '--duracion': `${INTERVALO_AUTOPLAY}ms` }}
              aria-hidden="true"
            />
            <div className="qp-dest__flechas">
              <button type="button" className="qp-dest__flecha" onClick={() => avanzar(-1)} aria-label="Evento anterior">
                <FaArrowLeft aria-hidden="true" />
              </button>
              <button type="button" className="qp-dest__flecha" onClick={() => avanzar(1)} aria-label="Evento siguiente">
                <FaArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Banner de cierre (solo en la landing) */}
      {!compacto && (
      <aside className="qp-dest__banner">
        <span className="qp-dest__banner-ic" aria-hidden="true"><FaRegLightbulb /></span>
        <span className="qp-dest__banner-txt">
          <span className="qp-dest__banner-tag">POR QUÉ CONVIENE COMPRAR ANTES</span>
          <strong>Tu entrada y tu billetera, en el mismo QR</strong>
          <span>
            Comprando con anticipación asegurás el cupo de tu jornada y llegás con la
            manilla lista: entrás sin fila y ya podés recargar saldo para consumir adentro.
          </span>
        </span>
      </aside>
      )}
    </section>
  );
}
