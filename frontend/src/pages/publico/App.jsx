import { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useModal } from '../../utils/useModal.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import MapaUbicacion from '../../components/MapaUbicacion.jsx';
import { proyectarContorno } from '../../utils/contornoMapa.js';
import { tipoElementoInfo } from '../../utils/elementosMapa.js';
import {
  FaChartLine, FaClock, FaTicketAlt, FaExchangeAlt,
  FaQrcode, FaMapMarkedAlt, FaMapMarkerAlt, FaStore, FaTimes,
  FaArrowLeft, FaCheck, FaCalendarAlt, FaMobileAlt, FaArrowRight
} from 'react-icons/fa';
import api from '../../api/index.js';
import {
  estadoStock, ESTADO_STOCK, nombreJornada, mostrarJornada,
  estadoEvento, ESTADO_EVENTO, formatearFecha, diaLocalISO,
} from '../../utils/eventos.js';
import { useRevelar } from '../../utils/useRevelar.js';
import { useParallax } from '../../utils/useParallax.js';
import './App.css';

// DATOS ACTUALIZADOS (Con fecha objetivo en Febrero)
// El editor de Admin (Mapa.jsx) usa tamaño real en px con scroll horizontal
// (una herramienta de trabajo, aceptable). Acá, una landing pública, el mapa
// tiene que escalar como una imagen para que se vea entero sin scrollear —
// por eso las cajas se ubican en % del lienzo en vez de en px fijos.
const pct = (valor, total) => `${(valor / total) * 100}%`;

/** Cuantas actividades entran en el panel del hero antes de mandar al modal. */
const CRONO_EN_PANEL = 4;

const defaultLandingData = {
  titulo: 'Tomorrowland Bolivia 2026',
  informacion: 'La experiencia electrónica más grande llega a Bolivia. Vive la magia con nuestro sistema de accesos y pagos Cashless 100% digital.',
  imagen: 'https://purovinotinto.com/wp-content/uploads/2022/12/Tomorrowland.jpg',
  fechaEvento: '2027-02-23T18:00:00', // Fecha ajustada al 23 de Febrero
  colorPrimario: '#00B4D8',     
  colorBoton: '#FFFFFF',        
  colorFondo: '#0b1120',        
  colorTextoTitulo: '#FFFFFF',  
  colorTextoP: '#94A3B8',       
  actividades: [
    { icono: 'ticket', titulo: 'Recaudación Diaria', descripcion: 'Registro exacto de ingresos.' },
    { icono: 'chart', titulo: 'Auditoría Continua', descripcion: 'Supervisión en tiempo real.' },
    { icono: 'sync', titulo: 'Devoluciones', descripcion: 'Reembolsos rápidos y seguros.' },
    { icono: 'store', titulo: 'Gestión de Puestos', descripcion: 'Control total de inventario.' }
  ],
  precios: [
    { 
      id: 'basic', tipo: 'General', precio: '150 Bs', destacado: false,
      beneficios: ['Acceso al sector General', 'Pulsera Cashless estándar', 'Acceso a patio de comidas', 'Baños compartidos']
    },
    { 
      id: 'vip', tipo: 'VIP Premium', precio: '350 Bs', destacado: true,
      beneficios: ['Acceso a sector VIP (Frente al escenario)', 'Pulsera Cashless edición especial', 'Barras exclusivas VIP', 'Baños premium', 'Ingreso preferencial sin filas']
    },
    { 
      id: 'extended', tipo: 'Backstage', precio: '600 Bs', destacado: false,
      beneficios: ['Acceso total incluyendo Backstage', 'Convivencia con artistas', 'Regalos de patrocinadores', 'Bebidas de cortesía', 'Parqueo reservado']
    }
  ],
  cronograma: [
    { hora: '08:00', actividad: 'Apertura de puertas y entrega de pulseras QR' },
    { hora: '13:00', actividad: 'Inicio de shows en vivo y apertura de patios de comida' },
    { hora: '23:30', actividad: 'Cierre del evento y balance de cajas' }
  ]
};

export default function App() {
  const navigate = useNavigate();
  const { id } = useParams();

  // FIX DEL SCROLL
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Carga de la página del evento con estados cargando/error/reintentar (Manual 8.9).
  const cargarEvento = useCallback(async () => {
    const activo = await api.eventos.obtener(id);
    if (!activo) throw new Error('Evento no encontrado');
    const [cfg, categorias, puestos, elementosMapa] = await Promise.all([
      api.landingConfig.obtener(activo.id).catch(() => null),
      api.categoriasTicket.listar(activo.id).catch(() => []),
      api.puestos.listar({ eventoId: activo.id }).catch(() => []),
      api.elementosMapa.listar(activo.id).catch(() => []),
    ]);
    return {
      evento: activo,
      // El título SIEMPRE es el nombre real del evento (no hay un "título de
      // landing" separado para editar, ver AdminConfigurarPagina.jsx) y la
      // imagen, si no se subió una específica para la landing, cae en la
      // portada del evento antes que en la foto de stock de relleno.
      data: {
        ...defaultLandingData,
        ...cfg,
        titulo: activo.nombre,
        imagen: cfg?.imagen || activo.imagen || defaultLandingData.imagen,
      },
      precios: categorias.length > 0
        ? categorias.map(c => ({
            id: c.id,
            tipo: c.nombre,
            // Se guarda aparte (no metido en el nombre): con 2+ noches se
            // muestra como filtro + insignia en la tarjeta, en vez de un
            // nombre largo tipo "Día 1 · VIP" mezclado con los demás.
            diaEvento: c.diaEvento,
            precio: `${c.precio} Bs`, precioNum: Number(c.precio), destacado: false,
            beneficios: c.beneficios?.length ? c.beneficios : ['Acceso al evento'],
            cantidad: c.cantidad, disponibles: c.disponibles,
          }))
        : defaultLandingData.precios,
      mapaPuestos: puestos,
      mapaElementos: elementosMapa,
    };
  }, [id]);
  const { data: carga, cargando, error, recargar } = useApi(cargarEvento, { inicial: null, activo: !!id });
  const evento = carga?.evento ?? null;
  const data = carga?.data ?? defaultLandingData;
  const precios = carga?.precios ?? defaultLandingData.precios;
  const mapaPuestos = carga?.mapaPuestos ?? [];
  const mapaElementos = carga?.mapaElementos ?? [];
  // El mapa es opcional (Admin no lo arma directo, lo dispara cada Usuario
  // Negocio al activar su puesto, o Admin dibujando el contorno / agregando
  // zonas): si no hay nada de eso todavía, la sección ni aparece.
  const mapaPuestosActivos = mapaPuestos.filter(p => p.estadoActivo);
  const contornoProyectado = useMemo(() => proyectarContorno(evento?.contornoMapa), [evento]);
  const hayMapaDelEvento = mapaPuestosActivos.length > 0 || mapaElementos.length > 0 || !!contornoProyectado;

  // Con 2+ noches, un listado plano de todas las categorías junto se vuelve
  // largo y confuso (ej. 3 noches x 2 categorías = 6 tarjetas mezcladas) —
  // se agrega un filtro por jornada arriba de la grilla. Con 0 o 1 noche
  // (el caso más común) no aparece filtro alguno y la grilla queda igual
  // que siempre.
  const jornadasPrecios = useMemo(
    () => [...new Map(precios.map(p => p.diaEvento).filter(mostrarJornada).map(d => [d.id, d])).values()],
    [precios],
  );
  const [filtroDiaPrecios, setFiltroDiaPrecios] = useState(null);
  const preciosFiltrados = useMemo(
    () => filtroDiaPrecios ? precios.filter(p => p.diaEvento?.id === filtroDiaPrecios) : precios,
    [precios, filtroDiaPrecios],
  );

  const [puestoModal, setPuestoModal] = useState(null);
  // El panel del hero muestra 4 actividades; con mas, el resto se ve en un
  // modal centrado. Sin tope, un cronograma largo estiraba el panel y rompia
  // la pantalla de entrada.
  const [verCronograma, setVerCronograma] = useState(false);

  // Foco + ESC + scroll-lock del modal de puesto (look "glass" propio del landing).
  const modalPuestoRef = useModal(!!puestoModal, () => setPuestoModal(null));
  const modalCronoRef = useModal(verCronograma, () => setVerCronograma(false));

  // ESTADOS DEL CONTADOR
  const [timeLeft, setTimeLeft] = useState({ dias: 0, horas: 0, minutos: 0, seg: 0 });


  // LÓGICA DEL CONTADOR
  useEffect(() => {
    if (!evento?.fecha) return;

    const calcularTiempo = () => {
      const diferencia = +new Date(evento.fecha) - +new Date();
      if (diferencia > 0) {
        setTimeLeft({
          dias: Math.floor(diferencia / (1000 * 60 * 60 * 24)),
          horas: Math.floor((diferencia / (1000 * 60 * 60)) % 24),
          minutos: Math.floor((diferencia / 1000 / 60) % 60),
          seg: Math.floor((diferencia / 1000) % 60)
        });
      } else {
        setTimeLeft({ dias: 0, horas: 0, minutos: 0, seg: 0 });
      }
    };
    calcularTiempo();
    const timer = setInterval(calcularTiempo, 1000);
    return () => clearInterval(timer);
  }, [evento?.fecha]);

  const handleLoginClick = () => navigate('/login');
  const handleVolverInicio = () => navigate('/');


  // Cada seccion entra revelandose al llegar a ella (utils/useRevelar.js), asi
  // la pagina deja de sentirse una pila de bloques estaticos.
  const [refEntradas, verEntradas] = useRevelar();
  // Las tarjetas llevan su PROPIO disparador, mas tardio: la seccion se
  // revela apenas asoma su borde superior, pero la grilla esta bastante mas
  // abajo y para cuando entraba en pantalla la animacion ya habia terminado.
  const [refPreciosGrid, verPreciosGrid] = useRevelar({ margen: '0px 0px -25% 0px' });

  // Parallax del hero: la imagen se queda atras y el texto se adelanta un
  // poco. Van en los contenedores, no en la <img>, que ya tiene su propia
  // animacion de transform (flotar) y se pisarian.
  const refParallaxImagen = useParallax(0.16, 90);
  const refParallaxTexto = useParallax(-0.05, 40);
  const [refActividades, verActividades] = useRevelar();
  const [refMapa, verMapa] = useRevelar();

  // Datos que ahora viven en el hero en vez de repartidos por la pagina.
  const precioDesde = useMemo(() => {
    const nums = precios.map(p => p.precioNum).filter(n => Number.isFinite(n));
    return nums.length ? Math.min(...nums) : null;
  }, [precios]);

  const cuandoEs = useMemo(() => {
    if (!evento?.fecha) return null;
    const desde = diaLocalISO(evento.fecha);
    const hasta = evento.fechaFin ? diaLocalISO(evento.fechaFin) : desde;
    if (desde === hasta) return formatearFecha(evento.fecha, false);
    return `${formatearFecha(evento.fecha, false)} — ${formatearFecha(evento.fechaFin, false)}`;
  }, [evento]);

  const yaEmpezo = timeLeft.dias + timeLeft.horas + timeLeft.minutos + timeLeft.seg === 0;


  const estiloDinamico = {
    '--color-primario': data.colorPrimario || defaultLandingData.colorPrimario,
    '--color-boton': data.colorBoton || defaultLandingData.colorBoton,
    '--color-fondo': data.colorFondo || defaultLandingData.colorFondo,
    '--color-texto-titulo': data.colorTextoTitulo || defaultLandingData.colorTextoTitulo,
    '--color-texto-p': data.colorTextoP || defaultLandingData.colorTextoP,
  };

  const renderIcono = (nombreIcono) => {
    switch(nombreIcono) {
      case 'ticket': return <FaTicketAlt />;
      case 'chart': return <FaChartLine />;
      case 'sync': return <FaExchangeAlt />;
      case 'store': return <FaStore />;
      default: return <FaQrcode />;
    }
  };

  // Mientras carga o si el evento no existe / falla, no montamos la landing entera.
  if (cargando || error) {
    return (
      <div className="pi-landing-container" style={estiloDinamico}>
        <nav className="pi-landing-navbar">
          <button type="button" className="pi-landing-logo" onClick={handleVolverInicio} aria-label="QPass, ir al inicio">
            <FaQrcode className="logo-icon" aria-hidden="true" />
            <span>QPass</span>
          </button>
        </nav>
        <main id="contenido" style={{ padding: '32px 24px', maxWidth: '640px', margin: '0 auto' }}>
          {error ? (
            <EstadoError
              onReintentar={recargar}
              titulo="No se pudo cargar este evento"
              mensaje="Puede que el enlace no sea válido o que haya un problema de conexión."
            />
          ) : (
            <EstadoCarga filas={6} etiqueta="Cargando el evento…" />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="pi-landing-container" style={estiloDinamico}>

      {/* BARRA DE NAVEGACIÓN */}
      <nav className="pi-landing-navbar">
        {/* Botones reales, no <div onClick>: operables con teclado (Manual Parte 9). */}
        <button
          type="button"
          className="pi-landing-volver"
          onClick={handleVolverInicio}
          aria-label="Volver al inicio"
        >
          <FaArrowLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="pi-landing-logo"
          onClick={handleVolverInicio}
          aria-label="QPass, ir al inicio"
        >
          <FaQrcode className="logo-icon" aria-hidden="true" />
          <span>QPass</span>
        </button>
        {/* El orden sigue al de la pagina: si el menu lista en un orden y la
            pagina esta en otro, saltar de un link al siguiente hace subir en
            vez de bajar. */}
        <ul className="pi-landing-nav-links">
          <li><a href="#entradas">Entradas</a></li>
          {evento?.latitud != null && <li><a href="#ubicacion">Ubicación</a></li>}
          <li><a href="#cronograma">Cronograma</a></li>
          <li><a href="#actividades">Actividades</a></li>
          {hayMapaDelEvento && <li><a href="#mapa">Mapa</a></li>}
        </ul>
        <button className="pi-landing-btn-nav" onClick={handleLoginClick}>
          Comprar Entrada
        </button>
      </nav>

      <div className="bg-glow glow-top-left"></div>
      <div className="bg-glow glow-bottom-right"></div>

      {/* Landmark principal de la pantalla (Manual 11) */}
      <main id="contenido">
      {/* SECCIÓN HERO */}
      <header id="inicio" className="pi-landing-hero">
        {/* La foto del evento es el fondo de toda la pantalla. Va como <div>
            con background y no como <img> porque es decorativa: el nombre del
            evento ya esta en el <h1>, asi que un alt seria ruido repetido. */}
        <div
          className="ev-hero__fondo"
          ref={refParallaxImagen}
          style={{ backgroundImage: `url(${data.imagen})` }}
          aria-hidden="true"
        />
        <div className="ev-hero__scrim" aria-hidden="true" />

        <div className="pi-landing-hero-content" ref={refParallaxTexto}>
          <p className="ev-hero__estado">
            <span className="ev-hero__estado-punto" aria-hidden="true" />
            {ESTADO_EVENTO[estadoEvento(evento ?? {})]?.label ?? 'Próximo'}
          </p>

          <h1>{data.titulo}</h1>
          <p className="ev-hero__info">{data.informacion}</p>

          {/* Datos clave arriba de todo: antes habia que scrollear media pagina
              para saber cuando, donde y cuanto costaba. */}
          <ul className="ev-hero__datos">
            {cuandoEs && (
              <li>
                <FaCalendarAlt aria-hidden="true" />
                <span><em>Cuándo</em>{cuandoEs}</span>
              </li>
            )}
            {evento?.lugar && (
              <li>
                <FaMapMarkerAlt aria-hidden="true" />
                <span><em>Dónde</em>{evento.lugar}</span>
              </li>
            )}
            <li>
              {evento?.tipoManilla === 'digital'
                ? <FaMobileAlt aria-hidden="true" />
                : <FaQrcode aria-hidden="true" />}
              <span>
                <em>Acceso</em>
                {evento?.tipoManilla === 'digital' ? 'QR en tu celular' : 'Manilla física'}
              </span>
            </li>
            {precioDesde != null && (
              <li>
                <FaTicketAlt aria-hidden="true" />
                <span><em>Entradas</em>Desde {precioDesde} Bs</span>
              </li>
            )}
          </ul>

          {/* El contador vivia en una seccion aparte, mucho mas abajo; aca
              acompana al CTA, que es donde importa. */}
          {!yaEmpezo && (
            <div className="ev-hero__cuenta" aria-label="Tiempo restante para el evento">
              <span className="ev-hero__cuenta-tag">Faltan</span>
              <span className="ev-hero__cuenta-bloques">
                {[['dias', 'días'], ['horas', 'hs'], ['minutos', 'min'], ['seg', 'seg']].map(([clave, etiqueta]) => (
                  <span className="ev-hero__cuenta-bloque" key={clave}>
                    <b>{String(timeLeft[clave]).padStart(2, '0')}</b>
                    <em>{etiqueta}</em>
                  </span>
                ))}
              </span>
            </div>
          )}

          <div className="ev-hero__acciones">
            <button className="pi-landing-btn-primary" onClick={() => document.getElementById('entradas').scrollIntoView({behavior: 'smooth'})}>
              Comprar entradas
              <FaArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Ubicacion y cronograma viven ACA, en la mitad derecha del hero, que
            quedo libre al pasar la foto al fondo. Asi la pantalla de entrada
            responde todo de una: que es, cuando, donde y a que hora. */}
        <aside className="ev-hero__panel glass-panel">
          {evento?.latitud != null && (
            <div className="ev-hero__panel-bloque" id="ubicacion">
              <h2 className="ev-hero__panel-titulo">
                <FaMapMarkerAlt aria-hidden="true" /> Ubicación
              </h2>
              <p className="ev-hero__panel-sub">{evento.lugar}</p>
              <div className="ev-hero__mapa">
                <MapaUbicacion lat={evento.latitud} lng={evento.longitud} />
              </div>
            </div>
          )}

          <div className="ev-hero__panel-bloque" id="cronograma">
            <h2 className="ev-hero__panel-titulo">
              <FaClock aria-hidden="true" /> Cronograma
            </h2>
            <ol className="ev-agenda ev-agenda--compacta">
              {data.cronograma.slice(0, CRONO_EN_PANEL).map((item, index) => (
                <li className="ev-agenda__item" key={index}>
                  <span className="ev-agenda__num" aria-hidden="true">{index + 1}</span>
                  <span className="ev-agenda__cuerpo">
                    <span className="ev-agenda__hora">{item.hora}</span>
                    <span className="ev-agenda__texto">{item.actividad}</span>
                  </span>
                </li>
              ))}
            </ol>

            {data.cronograma.length > CRONO_EN_PANEL && (
              <button
                type="button"
                className="ev-agenda__mas"
                onClick={() => setVerCronograma(true)}
              >
                Ver las {data.cronograma.length} actividades
                <FaArrowRight aria-hidden="true" />
              </button>
            )}
          </div>
        </aside>
      </header>
{/* SECCIÓN PRECIOS Y ENTRADAS */}
      <section
        id="entradas"
        className={`pi-landing-section pricing-section qp-revelar${verEntradas ? ' es-visible' : ''}`}
        ref={refEntradas}
      >
        <h2 className="pricing-title">Elegí tu entrada</h2>
        <p className="pricing-bajada">
          Todas incluyen tu manilla QR: entrás sin fila y pagás sin efectivo adentro.
        </p>

        {jornadasPrecios.length > 0 && (
          <div className="pricing-filtro-dias" role="group" aria-label="Filtrar precios por jornada">
            <button
              type="button"
              className={filtroDiaPrecios === null ? 'activo' : ''}
              onClick={() => setFiltroDiaPrecios(null)}
            >
              Todas las noches
            </button>
            {jornadasPrecios.map((dia) => (
              <button
                key={dia.id}
                type="button"
                className={filtroDiaPrecios === dia.id ? 'activo' : ''}
                onClick={() => setFiltroDiaPrecios(dia.id)}
              >
                {nombreJornada(dia)}
              </button>
            ))}
          </div>
        )}

        <div
          className={`pricing-grid${verPreciosGrid ? ' es-visible' : ''}`}
          ref={refPreciosGrid}
        >
          {preciosFiltrados.map((plan) => {
            const stk = estadoStock(plan);
            const agotado = stk === 'agotado';
            return (
              <div key={plan.id} className={`pricing-card ${plan.destacado ? 'destacado' : ''} ${agotado ? 'agotado' : ''}`}>
                <div className="pricing-card-header">
                  {mostrarJornada(plan.diaEvento) && (
                    <span className="dia-badge">{nombreJornada(plan.diaEvento)}</span>
                  )}
                  <h3>{plan.tipo}</h3>
                  {stk && (
                    <span className={`stock-badge ${ESTADO_STOCK[stk].clase}`}>
                      {ESTADO_STOCK[stk].label}
                    </span>
                  )}
                  <p>La mejor opción para disfrutar el evento.</p>
                </div>
                <ul className="pricing-features">
                  {plan.beneficios.map((ben, idx) => (
                    <li key={idx}><FaCheck className="check-icon" aria-hidden="true"/> {ben}</li>
                  ))}
                </ul>
                <div className="pricing-price">
                  <span className="price-amount">{plan.precio}</span>
                </div>
                <button className="btn-pricing" onClick={handleLoginClick} disabled={agotado}>
                  {agotado ? 'Agotado' : 'Adquirir ahora'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      {/* NUEVA SECCIÓN: FECHA GIGANTE Y CONTADOR */}
      {/* SECCIÓN ACTIVIDADES */}
      <section
        id="actividades"
        className={`pi-landing-section qp-revelar${verActividades ? ' es-visible' : ''}`}
        ref={refActividades}
      >
        <h2 className="pi-landing-section-title">Servicios del Evento</h2>
        <div className="pi-landing-grid">
          {data.actividades.map((actividad, index) => (
            <div key={index} className="pi-landing-glass-card">
              <div className="pi-landing-card-header">
                <div className="pi-landing-card-icon">
                  {renderIcono(actividad.icono || 'ticket')}
                </div>
              </div>
              <h3>{actividad.titulo}</h3>
              <p>{actividad.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN MAPA INTERACTIVO — opcional: si Admin todavía no lo armó, no aparece */}
      {hayMapaDelEvento && (
      <section
        id="mapa"
        className={`pi-landing-section qp-revelar${verMapa ? ' es-visible' : ''}`}
        ref={refMapa}
      >
        <div className="pi-landing-section-header">
          <h2 className="pi-landing-section-title"><FaMapMarkedAlt /> Mapa del Evento</h2>
          <p className="pi-landing-subtitle">
            Explora la distribución del evento. Haz clic en los puestos para ver su menú y precios.
          </p>
        </div>

        <div className="pi-landing-mapa-wrapper glass-panel">
          <div
            className="pi-landing-mapa-canvas"
            style={contornoProyectado
              ? { width: '100%', minWidth: 0, height: 'auto', aspectRatio: `${contornoProyectado.ancho} / ${contornoProyectado.alto}` }
              : undefined}
          >
            {contornoProyectado && (
              <svg className="pi-landing-contorno-svg" viewBox={`0 0 ${contornoProyectado.ancho} ${contornoProyectado.alto}`} preserveAspectRatio="none" aria-hidden="true">
                <polygon points={contornoProyectado.puntos.map(([x, y]) => `${x},${y}`).join(' ')} />
              </svg>
            )}

            {mapaPuestosActivos.map((puesto) => (
              // Cada puesto del mapa es un botón: se puede abrir con Tab + Enter.
              // Con contorno, la posición va en % del lienzo (escala como una
              // imagen); sin contorno, se mantiene el lienzo fijo de siempre.
              <button
                type="button"
                key={puesto.id}
                className="pi-landing-puesto-box"
                style={contornoProyectado ? {
                  left: pct(puesto.x, contornoProyectado.ancho), top: pct(puesto.y, contornoProyectado.alto),
                  width: pct(puesto.ancho, contornoProyectado.ancho), height: pct(puesto.alto, contornoProyectado.alto),
                } : {
                  left: `${puesto.x}px`, top: `${puesto.y}px`,
                  width: `${puesto.ancho}px`, height: `${puesto.alto}px`,
                }}
                onClick={() => setPuestoModal(puesto)}
                aria-label={`Ver puesto ${puesto.nombre}`}
              >
                {puesto.logo ? (
                  <div className="box-fondo-img" style={{ backgroundImage: `url(${puesto.logo})` }}>
                    <div className="box-overlay-texto"><strong>{puesto.nombre}</strong></div>
                  </div>
                ) : (
                  <div className="box-fondo-color">
                    <FaStore className="puesto-icon-dinamico" aria-hidden="true" />
                    <strong>{puesto.nombre}</strong>
                  </div>
                )}
              </button>
            ))}

            {/* Zonas (entrada, baños, escenario...): solo referencia visual, no abren detalle. */}
            {mapaElementos.map((elemento) => {
              const info = tipoElementoInfo(elemento.tipo);
              const Icono = info.Icono;
              return (
                <div
                  key={elemento.id}
                  className="pi-landing-puesto-box pi-landing-elemento-box"
                  style={contornoProyectado ? {
                    left: pct(elemento.x, contornoProyectado.ancho), top: pct(elemento.y, contornoProyectado.alto),
                    width: pct(elemento.ancho, contornoProyectado.ancho), height: pct(elemento.alto, contornoProyectado.alto),
                  } : {
                    left: `${elemento.x}px`, top: `${elemento.y}px`,
                    width: `${elemento.ancho}px`, height: `${elemento.alto}px`,
                  }}
                >
                  <div className="box-fondo-color">
                    <Icono className="puesto-icon-dinamico" aria-hidden="true" />
                    <strong>{elemento.nombre}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      </main>

      {/* FOOTER */}
      <footer className="pi-landing-footer glass-footer">
        <div className="footer-logo">
          <FaQrcode size={24} />
          <strong>QPass</strong>
        </div>
        <p>&copy; {new Date().getFullYear()} QPass - Gestión de Accesos Inteligente. Todos los derechos reservados.</p>
      </footer>

      {/* MODAL PUESTO — role/aria-modal + cierre con ESC y clic en el fondo (Manual 8.6) */}
      {verCronograma && (
        <div className="pi-landing-modal-overlay" onClick={() => setVerCronograma(false)}>
          <div
            ref={modalCronoRef}
            tabIndex={-1}
            className="pi-landing-modal glass-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-crono-titulo"
          >
            <div className="pi-landing-modal-header">
              <h2 id="modal-crono-titulo"><FaClock aria-hidden="true" /> Cronograma</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setVerCronograma(false)}
                aria-label="Cerrar"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>
            <div className="pi-landing-modal-body">
              <ol className="ev-agenda">
                {data.cronograma.map((item, index) => (
                  <li className="ev-agenda__item" key={index}>
                    <span className="ev-agenda__num" aria-hidden="true">{index + 1}</span>
                    <span className="ev-agenda__cuerpo">
                      <span className="ev-agenda__hora">{item.hora}</span>
                      <span className="ev-agenda__texto">{item.actividad}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {puestoModal && (
        <div className="pi-landing-modal-overlay" onClick={() => setPuestoModal(null)}>
          <div
            ref={modalPuestoRef}
            tabIndex={-1}
            className="pi-landing-modal glass-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-puesto-titulo"
          >
            <div className="pi-landing-modal-header">
              <h2 id="modal-puesto-titulo">{puestoModal.nombre}</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setPuestoModal(null)}
                aria-label="Cerrar"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>
            <div className="pi-landing-modal-body">
              {puestoModal.descripcion && <p>{puestoModal.descripcion}</p>}
              {(puestoModal.productos || []).filter(p => p.activo !== false).length === 0 ? (
                <p>Este puesto todavía no tiene productos publicados.</p>
              ) : (
                <ul className="pricing-features">
                  {puestoModal.productos.filter(p => p.activo !== false).map(p => (
                    <li key={p.id}><FaCheck className="check-icon" aria-hidden="true" /> {p.nombre} — {Number(p.precio)} Bs</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}