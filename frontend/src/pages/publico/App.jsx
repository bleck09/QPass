import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaChartLine, FaClock, FaTicketAlt, FaExchangeAlt,
  FaQrcode, FaMapMarkedAlt, FaStore, FaTimes,
  FaArrowLeft, FaCheck
} from 'react-icons/fa';
import api from '../../api/index.js';
import { esVigente } from '../../utils/eventos.js';
import './App.css';

// DATOS ACTUALIZADOS (Con fecha objetivo en Febrero)
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

  // FIX DEL SCROLL
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [evento, setEvento] = useState(null);
  const [data, setData] = useState(defaultLandingData);
  const [precios, setPrecios] = useState(defaultLandingData.precios);
  const [mapaPuestos, setMapaPuestos] = useState([]);
  const [puestoModal, setPuestoModal] = useState(null);

  // ESTADOS DEL CONTADOR
  const [timeLeft, setTimeLeft] = useState({ dias: 0, horas: 0, minutos: 0, seg: 0 });

  useEffect(() => {
    api.eventos.listar().then(async (todos) => {
      const activo = todos.find(esVigente) || todos[0];
      if (!activo) return;
      setEvento(activo);

      api.landingConfig.obtener(activo.id)
        .then(cfg => setData({ ...defaultLandingData, ...cfg }))
        .catch(() => {});

      api.categoriasTicket.listar(activo.id).then(categorias => {
        if (categorias.length === 0) return;
        setPrecios(categorias.map(c => ({
          id: c.id,
          tipo: c.nombre,
          precio: `${c.precio} Bs`,
          destacado: false,
          beneficios: [c.descripcion || 'Acceso al evento'],
        })));
      });

      api.puestos.listar({ eventoId: activo.id }).then(setMapaPuestos);
    });
  }, []);

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
      }
    };
    calcularTiempo();
    const timer = setInterval(calcularTiempo, 1000);
    return () => clearInterval(timer);
  }, [evento?.fecha]);

  const handleLoginClick = () => navigate('/login');
  const handleVolverInicio = () => navigate('/'); 

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

  return (
    <div className="pi-landing-container" style={estiloDinamico}>
      
      {/* BARRA DE NAVEGACIÓN */}
      <nav className="pi-landing-navbar">
        <div className="pi-landing-volver" onClick={handleVolverInicio}>
          <FaArrowLeft />
        </div>
        <div className="pi-landing-logo" onClick={handleVolverInicio} style={{cursor: 'pointer'}}>
          <FaQrcode className="logo-icon" />
          <span>QPass</span>
        </div>
        <ul className="pi-landing-nav-links">
          <li><a href="#entradas">Entradas</a></li>
          <li><a href="#actividades">Actividades</a></li>
          <li><a href="#mapa">Mapa</a></li>
          <li><a href="#cronograma">Cronograma</a></li>
        </ul>
        <button className="pi-landing-btn-nav" onClick={handleLoginClick}>
          Comprar Entrada
        </button>
      </nav>

      <div className="bg-glow glow-top-left"></div>
      <div className="bg-glow glow-bottom-right"></div>

      {/* SECCIÓN HERO */}
      <header id="inicio" className="pi-landing-hero">
        <div className="pi-landing-hero-content">
          <h1>{data.titulo}</h1>
          <p>{data.informacion}</p>
          <div style={{display: 'flex', gap: '15px'}}>
            <button className="pi-landing-btn-primary" onClick={() => document.getElementById('entradas').scrollIntoView({behavior: 'smooth'})}>
              Comprar Entradas
            </button>
          </div>
        </div>
        <div className="pi-landing-hero-image">
          <img src={data.imagen} alt="Evento QPass" className="floating-img" />
        </div>
      </header>
{/* SECCIÓN PRECIOS Y ENTRADAS */}
      <section id="entradas" className="pi-landing-section pricing-section">
        <h2 className="pricing-title">OUR PRICES</h2>
        <div className="pricing-grid">
          {precios.map((plan) => (
            <div key={plan.id} className={`pricing-card ${plan.destacado ? 'destacado' : ''}`}>
              <div className="pricing-card-header">
                <h3>{plan.tipo}</h3>
                <p>La mejor opción para disfrutar el evento.</p>
              </div>
              <ul className="pricing-features">
                {plan.beneficios.map((ben, idx) => (
                  <li key={idx}><FaCheck className="check-icon"/> {ben}</li>
                ))}
              </ul>
              <div className="pricing-price">
                <span className="price-amount">{plan.precio}</span>
              </div>
              <button className="btn-pricing" onClick={handleLoginClick}>
                ADQUIRIR AHORA
              </button>
            </div>
          ))}
        </div>
      </section>
      {/* NUEVA SECCIÓN: FECHA GIGANTE Y CONTADOR */}
      <section className="pi-landing-section date-countdown-section">
        
        {/* Fecha Gigante */}
        <div className="massive-date-container">
          <span className="date-subtitle">Tu próxima experiencia será el</span>
          <div className="date-huge">
            <span className="date-number">23</span>
            <span className="date-month">Febrero</span>
          </div>
          <p className="date-description">
            Prepárate para vivir el mejor evento del año. Asegura tu lugar antes de que se agoten las entradas y sé parte de la historia.
          </p>
        </div>

        {/* Contador Compacto */}
        <div className="countdown-wrapper">
          <h3 className="countdown-title">Tiempo Restante</h3>
          <div className="countdown-timer small-timer">
            <div className="time-block">
              <span className="time-number">{String(timeLeft.dias).padStart(2, '0')}</span>
              <span className="time-label">DÍAS</span>
            </div>
            <div className="time-separator">:</div>
            <div className="time-block">
              <span className="time-number">{String(timeLeft.horas).padStart(2, '0')}</span>
              <span className="time-label">HORAS</span>
            </div>
            <div className="time-separator">:</div>
            <div className="time-block">
              <span className="time-number">{String(timeLeft.minutos).padStart(2, '0')}</span>
              <span className="time-label">MINUTOS</span>
            </div>
            <div className="time-separator">:</div>
            <div className="time-block">
              <span className="time-number">{String(timeLeft.seg).padStart(2, '0')}</span>
              <span className="time-label">SEGUNDOS</span>
            </div>
          </div>
        </div>
      </section>

      

      {/* SECCIÓN ACTIVIDADES */}
      <section id="actividades" className="pi-landing-section">
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

      {/* SECCIÓN MAPA INTERACTIVO */}
      <section id="mapa" className="pi-landing-section">
        <div className="pi-landing-section-header">
          <h2 className="pi-landing-section-title"><FaMapMarkedAlt /> Mapa del Evento</h2>
          <p className="pi-landing-subtitle">
            Explora la distribución del evento. Haz clic en los puestos para ver su menú y precios.
          </p>
        </div>

        <div className="pi-landing-mapa-wrapper glass-panel">
          <div className="pi-landing-mapa-canvas">
            {mapaPuestos.filter(p => p.estadoActivo).map((puesto) => (
              <div 
                key={puesto.id}
                className="pi-landing-puesto-box"
                style={{
                  left: `${puesto.x}px`, top: `${puesto.y}px`,
                  width: `${puesto.ancho}px`, height: `${puesto.alto}px`
                }}
                onClick={() => setPuestoModal(puesto)}
              >
                {puesto.logo ? (
                  <div className="box-fondo-img" style={{ backgroundImage: `url(${puesto.logo})` }}>
                    <div className="box-overlay-texto"><strong>{puesto.nombre}</strong></div>
                  </div>
                ) : (
                  <div className="box-fondo-color">
                    <FaStore className="puesto-icon-dinamico" />
                    <strong>{puesto.nombre}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN CRONOGRAMA */}
      <section id="cronograma" className="pi-landing-section">
        <div className="pi-landing-section-header">
          <h2 className="pi-landing-section-title"><FaClock /> Cronograma Oficial</h2>
        </div>
        
        <div className="pi-landing-timeline">
          {data.cronograma.map((item, index) => {
            const isLeft = index % 2 === 0;
            return (
              <div key={index} className={`timeline-card ${isLeft ? 'card-left' : 'card-right'}`}>
                <div className="timeline-badge">{index + 1}</div>
                <div className="timeline-content">
                  <div className="timeline-time">{item.hora}</div>
                  <p className="timeline-actividad">{item.actividad}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pi-landing-footer glass-footer">
        <div className="footer-logo">
          <FaQrcode size={24} />
          <strong>QPass</strong>
        </div>
        <p>&copy; {new Date().getFullYear()} QPass - Gestión de Accesos Inteligente. Todos los derechos reservados.</p>
      </footer>

      {/* MODAL PUESTO */}
      {puestoModal && (
        <div className="pi-landing-modal-overlay" onClick={() => setPuestoModal(null)}>
          <div className="pi-landing-modal glass-modal" onClick={e => e.stopPropagation()}>
            <div className="pi-landing-modal-header">
              <h2>{puestoModal.nombre}</h2>
              <button className="btn-close-modal" onClick={() => setPuestoModal(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="pi-landing-modal-body">
              {puestoModal.descripcion && <p>{puestoModal.descripcion}</p>}
              {(puestoModal.productos || []).length === 0 ? (
                <p>Este puesto todavía no tiene productos publicados.</p>
              ) : (
                <ul className="pricing-features">
                  {puestoModal.productos.map(p => (
                    <li key={p.id}><FaCheck className="check-icon" /> {p.nombre} — {p.precio} Bs</li>
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