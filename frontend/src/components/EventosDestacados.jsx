import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaArrowRight, FaArrowLeft, FaMapMarkerAlt, FaClock,
  FaCalendarAlt, FaQrcode, FaRegLightbulb, FaTicketAlt, FaMobileAlt,
} from 'react-icons/fa';
import {
  imagenEvento, formatearFecha, diaLocalISO, estadoEvento, ESTADO_EVENTO,
} from '../../utils/eventos.js';
import './EventosDestacados.css';

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

/**
 * Cartelera destacada: escenario a pantalla completa con el evento activo de
 * fondo y una cola de tarjetas flotantes a la derecha. Al elegir una, la
 * tarjeta se expande hasta ocupar todo el escenario y el panel de texto hace
 * cross-fade.
 *
 * Se adapta a la cantidad real de eventos: la cola muestra como mucho los 3
 * siguientes, y con menos eventos simplemente muestra los que haya. Con menos
 * de dos no hay nada que rotar, así que el componente no se dibuja.
 */
export default function EventosDestacados({ eventos = [], onVerEvento }) {
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
      id="cartelera"
      className="qp-dest"
      aria-label="Cartelera destacada"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {/* 1. Encabezado */}
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

      {/* 3. Panel de información con cross-fade */}
      <div className="qp-dest__panel">
        <div className={`qp-dest__info${textoSaliendo ? ' es-saliendo' : ''}`}>
          <p className="qp-dest__estado">
            <span className="qp-dest__estado-punto" aria-hidden="true" />
            {ESTADO_EVENTO[estadoEvento(evento)]?.label ?? 'Próximo'}
            {cuando.dias > 1 && <> · {cuando.dias} jornadas</>}
          </p>

          <h3 className="qp-dest__evento-nombre">{evento.nombre}</h3>

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

          <button
            type="button"
            className="qp-dest__cta"
            onClick={() => onVerEvento?.(evento)}
          >
            Ver evento y comprar
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

      {/* 4. Banner de cierre */}
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
    </section>
  );
}
