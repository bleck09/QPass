  import { useState, useEffect, useRef } from 'react';
import {
  FaArrowRight, FaQrcode, FaWallet, FaChartLine,
  FaBolt, FaTicketAlt, FaStore,
} from 'react-icons/fa';
import './HeroSection.css';
import Boton from '../../components/Boton.jsx';

/**
 * Curva Bézier suave a partir de N puntos (viewBox 0 0 240 60).
 * Cada tramo usa dos puntos de control horizontales, así la línea
 * entra y sale plana de cada lectura y no hace picos duros.
 */
function trazarCurva(puntos) {
  const n = puntos.length;
  const dx = 240 / (n - 1);
  let d = `M 0,${puntos[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = i * dx;
    const x1 = (i + 1) * dx;
    const y0 = puntos[i];
    const y1 = puntos[i + 1];
    d += ` C ${(x0 + dx * 0.45).toFixed(1)},${y0.toFixed(1)} ${(x1 - dx * 0.45).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/**
 * Demo en vivo de la puerta de un evento. Son 20 lecturas que giran en
 * bucle, NO datos reales: la landing es pública y no consulta la API.
 *
 * Las dos series son la MISMA unidad (eventos por minuto), por eso
 * comparten un solo eje: ingresos de gente por puerta y compras
 * cobradas contra la manilla. En el SVG el eje Y está invertido
 * (0 arriba), así que un valor más CHICO se dibuja más alto.
 */
const INGRESOS_CICLO = [42, 38, 33, 28, 24, 21, 19, 18, 20, 24, 29, 34, 38, 41, 43, 44, 42, 39, 35, 31];
const CONSUMOS_CICLO = [50, 48, 45, 41, 38, 34, 31, 29, 28, 30, 33, 37, 41, 44, 47, 49, 50, 48, 45, 42];
/** Saldo cashless que va quedando en la manilla del demo (Bs). */
const SALDO_CICLO = [120, 115, 115, 103, 97, 97, 85, 78, 78, 66, 54, 54, 47, 35, 35, 150, 142, 131, 131, 125];

const PASOS = [
  { icono: FaTicketAlt, titulo: 'Comprás tu entrada', detalle: 'Pagás por QR y subís el comprobante.' },
  { icono: FaQrcode, titulo: 'Recibís tu manilla', detalle: 'Un QR único que es tu entrada y tu billetera.' },
  { icono: FaStore, titulo: 'Consumís sin efectivo', detalle: 'El puesto escanea y descuenta de tu saldo.' },
];

export default function HeroSection() {
  // Ventana deslizante de 7 lecturas (arranca con las 7 primeras del ciclo).
  const [ingresos, setIngresos] = useState(INGRESOS_CICLO.slice(0, 7));
  const [consumos, setConsumos] = useState(CONSUMOS_CICLO.slice(0, 7));
  const [saldo, setSaldo] = useState(SALDO_CICLO[6]);
  const [pulso, setPulso] = useState(false);

  const indiceRef = useRef(7);
  const heroRef = useRef(null);
  const introRef = useRef(null);
  const pasosRef = useRef(null);
  const escenaRef = useRef(null);

  /**
   * Coreografía de scroll de la primera pantalla (0 a 100vh):
   * el titular se desvanece, la manilla gira y entra en perspectiva, y
   * EN PARALELO aparece la tarjeta de "cómo funciona". Al 78% el giro
   * terminó y la tarjeta ya está nítida; el resto del tramo queda
   * quieto antes de que la siguiente sección tape el hero.
   *
   * Se escribe directo en el DOM (no con estado) para no re-renderizar
   * el árbol en cada frame de scroll.
   */
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reduce?.matches) return; // Sin animación: queda todo en su estado final (ver CSS).

    // Debajo de 62rem el layout pasa a una columna y las tarjetas y los pasos
    // van en el flujo normal (ver CSS). Si la coreografía siguiera escribiendo
    // estilos inline, los pisaría y los dejaría invisibles ocupando lugar.
    const escritorio = window.matchMedia('(min-width: 62rem)');

    const limpiar = () => {
      for (const ref of [introRef, pasosRef, escenaRef]) {
        if (!ref.current) continue;
        ref.current.style.opacity = '';
        ref.current.style.transform = '';
        ref.current.style.pointerEvents = '';
      }
      heroRef.current?.style.removeProperty('--hero-tarjetas-op');
      heroRef.current?.style.removeProperty('--hero-tarjetas-sep');
    };

    let pendiente = false;

    const alScrollear = () => {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(() => {
        pendiente = false;
        if (!escritorio.matches) { limpiar(); return; }
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        const vh = window.innerHeight || 750;
        const p = Math.min(Math.max(y / vh, 0), 1);

        // 1. Titular y CTAs: se van entre 0% y 38%.
        const opTitulo = Math.max(0, 1 - p / 0.38);
        const yTitulo = -24 * Math.min(p / 0.38, 1);

        // 2. Tarjetas flotantes: se abren y desvanecen entre 0% y 32%.
        const opTarjetas = Math.max(0, 1 - p / 0.32);
        const aperturaTarjetas = Math.min(p / 0.32, 1) * 35;

        // 3. Giro y acercamiento de la manilla: de 0% a 78%.
        const p3d = Math.min(Math.max(p / 0.78, 0), 1);

        // 4. Tarjeta de pasos: emerge de 10% a 78%, en paralelo al giro.
        const pPasos = Math.min(Math.max((p - 0.1) / 0.68, 0), 1);

        if (introRef.current) {
          introRef.current.style.opacity = opTitulo.toFixed(3);
          introRef.current.style.transform = `translateY(${yTitulo.toFixed(1)}px)`;
          introRef.current.style.pointerEvents = opTitulo > 0.08 ? 'auto' : 'none';
        }
        if (pasosRef.current) {
          pasosRef.current.style.opacity = pPasos.toFixed(3);
          pasosRef.current.style.transform = `translateY(${((1 - pPasos) * 20).toFixed(1)}px) scale(${(0.94 + pPasos * 0.06).toFixed(3)})`;
          pasosRef.current.style.pointerEvents = pPasos > 0.25 ? 'auto' : 'none';
        }
        if (escenaRef.current) {
          escenaRef.current.style.transform =
            `perspective(1200px) scale(${(1 + p3d * 0.16).toFixed(3)})` +
            ` rotateY(${(p3d * -18).toFixed(2)}deg)` +
            ` rotateX(${(p3d * 7.5).toFixed(2)}deg)` +
            ` rotateZ(${(p3d * -2).toFixed(2)}deg)`;
        }
        if (heroRef.current) {
          heroRef.current.style.setProperty('--hero-tarjetas-op', opTarjetas.toFixed(3));
          heroRef.current.style.setProperty('--hero-tarjetas-sep', `${aperturaTarjetas.toFixed(1)}px`);
        }
      });
    };

    window.addEventListener('scroll', alScrollear, { passive: true });
    window.addEventListener('resize', alScrollear, { passive: true });
    escritorio.addEventListener('change', alScrollear);
    alScrollear();
    return () => {
      window.removeEventListener('scroll', alScrollear);
      window.removeEventListener('resize', alScrollear);
      escritorio.removeEventListener('change', alScrollear);
    };
  }, []);

  /** Entra una lectura nueva cada 2s y la ventana se corre una posición. */
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reduce?.matches) return;

    let apagarPulso;
    const intervalo = setInterval(() => {
      const i = indiceRef.current % 20;
      indiceRef.current += 1;

      setIngresos(p => [...p.slice(1), INGRESOS_CICLO[i]]);
      setConsumos(p => [...p.slice(1), CONSUMOS_CICLO[i]]);
      setSaldo(SALDO_CICLO[i]);

      setPulso(true);
      clearTimeout(apagarPulso);
      apagarPulso = setTimeout(() => setPulso(false), 550);
    }, 2000);

    return () => {
      clearInterval(intervalo);
      clearTimeout(apagarPulso);
    };
  }, []);

  const lineaIngresos = trazarCurva(ingresos);
  const areaIngresos = `${lineaIngresos} L 240,60 L 0,60 Z`;
  const lineaConsumos = trazarCurva(consumos);
  const ultIngreso = ingresos[ingresos.length - 1];
  const ultConsumo = consumos[consumos.length - 1];

  return (
    <header className="qp-hero" ref={heroRef}>
      <div className="qp-hero__resplandor" aria-hidden="true" />

      <div className="qp-hero__grid">
        {/* ============ COLUMNA IZQUIERDA ============ */}
        <div className="qp-hero__col-texto">
          <div className="qp-hero__intro" ref={introRef}>
            <p className="qp-hero__chip">
              <span className="qp-hero__chip-punto" aria-hidden="true" />
              EVENTOS CASHLESS · MANILLA QR
            </p>

            <h1 className="qp-hero__titulo">
              Viví el evento sin filas con tu{' '}
              <span className="qp-hero__destacado">manilla QR</span> y pagos{' '}
              <span className="qp-hero__destacado qp-hero__destacado--comercio">sin efectivo</span>
            </h1>

            <p className="qp-hero__bajada">
              Tu entrada y tu billetera en un solo código. Entrás en segundos, recargás
              saldo en el evento y comprás en cualquier puesto{' '}
              <strong>sin sacar la billetera</strong>.
            </p>

            <div className="qp-hero__acciones">
              <Boton como="a" href="#cartelera" variante="acento" tamano="lg" pildora iconoDerecha={FaArrowRight}>
                Ver cartelera
              </Boton>
            </div>
          </div>

          {/* Capa 2: aparece mientras la manilla gira. */}
          {/* Sin aria-hidden a propósito: es contenido real, y el desvanecido
              es puramente visual. No tiene elementos enfocables, así que al
              estar transparente tampoco captura el foco del teclado. */}
          <div className="qp-hero__pasos pi-home-glass-morphism" ref={pasosRef}>
            <p className="qp-hero__pasos-chip">
              <span className="qp-hero__chip-punto" aria-hidden="true" />
              CÓMO FUNCIONA
            </p>
            <ol className="qp-hero__pasos-lista">
              {PASOS.map(({ icono: Icono, titulo, detalle }, i) => (
                <li className="qp-hero__paso" key={titulo}>
                  <span className="qp-hero__paso-num" aria-hidden="true">
                    <Icono />
                    <em>{i + 1}</em>
                  </span>
                  <span className="qp-hero__paso-txt">
                    <strong>{titulo}</strong>
                    <span>{detalle}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ============ COLUMNA DERECHA: ESCENA ============ */}
        <div className="qp-hero__col-escena">
          <div className="qp-hero__escenario">
            <div className="qp-hero__escena" ref={escenaRef}>
              <div className="qp-hero__foco" aria-hidden="true" />

              {/* Manilla con QR, en isométrico */}
              <div className="qp-hero__manilla" aria-hidden="true">
                <div className="qp-hero__manilla-correa qp-hero__manilla-correa--izq" />
                <div className="qp-hero__manilla-correa qp-hero__manilla-correa--der" />

                {/* La señal sale del contorno del QR entero (es el código el que
                    se lee, no un sensor puntual): anillos con la misma forma que
                    la chapa, expandiéndose hacia afuera. */}
                <span className="qp-hero__aura" />
                <span className="qp-hero__aura qp-hero__aura--2" />
                <span className="qp-hero__aura qp-hero__aura--3" />
                <div className="qp-hero__manilla-chapa">
                  <svg viewBox="0 0 100 100" className="qp-hero__qr" role="img" aria-label="Código QR de la manilla">
                    <rect x="0" y="0" width="100" height="100" rx="6" className="qp-hero__qr-fondo" />
                    {/* Marcas de posición */}
                    {[[10, 10], [66, 10], [10, 66]].map(([x, y]) => (
                      <g key={`${x}-${y}`}>
                        <rect x={x} y={y} width="24" height="24" rx="4" className="qp-hero__qr-ojo" />
                        <rect x={x + 7} y={y + 7} width="10" height="10" rx="2" className="qp-hero__qr-pupila" />
                      </g>
                    ))}
                    {/* Módulos de datos */}
                    {[
                      [42, 12], [50, 12], [42, 20], [58, 20], [42, 28], [50, 28], [58, 28],
                      [42, 36], [12, 42], [20, 42], [36, 42], [44, 42], [52, 42], [68, 42], [76, 42], [84, 42],
                      [20, 50], [28, 50], [44, 50], [60, 50], [76, 50],
                      [12, 58], [36, 58], [52, 58], [68, 58], [84, 58],
                      [42, 66], [58, 66], [74, 66], [50, 74], [66, 74], [82, 74],
                      [42, 82], [58, 82], [74, 82], [66, 90], [82, 90],
                    ].map(([x, y]) => (
                      <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.5" className="qp-hero__qr-modulo" />
                    ))}
                  </svg>
                  {/* Haz de escaneo */}
                  <span className="qp-hero__haz" />
                </div>
              </div>
            </div>

            {/* ---- Tarjeta 1: saldo de la manilla ---- */}
            <div className="qp-hero__tarjeta qp-hero__tarjeta--saldo pi-home-glass-morphism">
              <div className="qp-hero__tarjeta-cab">
                <FaWallet className="qp-hero__tarjeta-ic" aria-hidden="true" />
                <strong>Saldo en manilla</strong>
                <span className={`qp-hero__vivo-punto${pulso ? ' es-activo' : ''}`} aria-hidden="true" />
              </div>
              <p className="qp-hero__monto">
                <span className={pulso ? 'qp-hero__monto-val es-pulso' : 'qp-hero__monto-val'}>
                  Bs {saldo.toFixed(2)}
                </span>
                <span className="qp-hero__monto-tag">Cashless</span>
              </p>
              <p className="qp-hero__tarjeta-pie">
                <FaBolt className="qp-hero__pie-ic" aria-hidden="true" />
                Recarga acreditada al instante
              </p>
            </div>

            {/* ---- Tarjeta 2: actividad de la puerta ---- */}
            <div className="qp-hero__tarjeta qp-hero__tarjeta--grafico pi-home-glass-morphism">
              <div className="qp-hero__tarjeta-cab">
                <FaChartLine className="qp-hero__tarjeta-ic" aria-hidden="true" />
                <strong>Actividad del evento</strong>
                <span className="qp-hero__vivo-pill">
                  <span className={`qp-hero__vivo-punto${pulso ? ' es-activo' : ''}`} aria-hidden="true" />
                  En vivo
                </span>
              </div>

              <div className="qp-hero__grafico">
                <svg viewBox="0 0 240 60" className="qp-hero__svg" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="qpHeroAreaIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" className="qp-hero__area-arriba" />
                      <stop offset="100%" className="qp-hero__area-abajo" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="18" x2="240" y2="18" className="qp-hero__rejilla" />
                  <line x1="0" y1="40" x2="240" y2="40" className="qp-hero__rejilla" />
                  <path d={areaIngresos} fill="url(#qpHeroAreaIngresos)" />
                  <path d={lineaConsumos} className="qp-hero__linea qp-hero__linea--consumos" />
                  <path d={lineaIngresos} className="qp-hero__linea qp-hero__linea--ingresos" />
                  <circle cx="238" cy={ultConsumo} r="3" className="qp-hero__punto qp-hero__punto--consumos" />
                  <circle cx="238" cy={ultIngreso} r="3.5" className="qp-hero__punto qp-hero__punto--ingresos" />
                </svg>
              </div>

              {/* Con 2 series la leyenda es obligatoria: la identidad nunca queda solo en el color. */}
              <ul className="qp-hero__leyenda">
                <li>
                  <span className="qp-hero__bullet qp-hero__bullet--ingresos" aria-hidden="true" />
                  Ingresos <b>{60 - ultIngreso}/min</b>
                </li>
                <li>
                  <span className="qp-hero__bullet qp-hero__bullet--consumos" aria-hidden="true" />
                  Consumos <b>{60 - ultConsumo}/min</b>
                </li>
              </ul>
            </div>

            {/* ---- Tarjeta 3: validación en puerta ---- */}
            <div className="qp-hero__tarjeta qp-hero__tarjeta--acceso pi-home-glass-morphism">
              <span className="qp-hero__acceso-ic" aria-hidden="true"><FaQrcode /></span>
              <span className="qp-hero__acceso-txt">
                <strong>Acceso validado</strong>
                <span>Manilla leída en puerta · reingreso permitido con foto.</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
