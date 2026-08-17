import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaChartLine, FaClock, FaTicketAlt, FaExchangeAlt, 
  FaQrcode, FaMapMarkedAlt, FaStore, FaTimes, FaHamburger 
} from 'react-icons/fa';
import './App.css'; 

// NUEVA PALETA POR DEFECTO (Estilo Dark / Glassmorphism)
const defaultLandingData = {
  titulo: 'Innovación. Control. Resultados.',
  informacion: 'Sistema centralizado para el control, monitoreo y auditoría de ingresos diarios. Optimiza los procesos de recarga mediante pulseras QR con total transparencia y datos en tiempo real.',
  imagen: 'https://purovinotinto.com/wp-content/uploads/2022/12/Tomorrowland.jpg',
  colorPrimario: '#00B4D8',     // Cian brillante para acentos
  colorBoton: '#FFFFFF',        // Blanco para el botón principal
  colorFondo: '#0b1120',        // Azul casi negro (Fondo principal)
  colorTextoTitulo: '#FFFFFF',  // Blanco puro para títulos
  colorTextoP: '#94A3B8',       // Gris azulado para párrafos
  actividades: [
    { icono: 'ticket', titulo: 'Recaudación Diaria', descripcion: 'Registro exacto de ingresos.' },
    { icono: 'chart', titulo: 'Auditoría Continua', descripcion: 'Supervisión en tiempo real.' },
    { icono: 'sync', titulo: 'Devoluciones', descripcion: 'Reembolsos rápidos y seguros.' },
    { icono: 'store', titulo: 'Gestión de Puestos', descripcion: 'Control total de inventario.' }
  ],
  cronograma: [
    { hora: '08:00', actividad: 'Apertura de puertas y entrega de pulseras QR' },
    { hora: '13:00', actividad: 'Inicio de shows en vivo y apertura de patios de comida' },
    { hora: '23:30', actividad: 'Cierre del evento y balance de cajas' }
  ]
};

// Datos del mapa
const mockMapa = [
  { id: '1', numero: 'Pizzas El Paso', foto: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&w=150&q=80', categoria: 'Comida', estadoActivo: true, x: 50, y: 50, ancho: 120, alto: 100 },
  { id: '2', numero: 'Pollos Doña María', foto: 'https://images.unsplash.com/photo-1626082896492-766af4eb65ed?ixlib=rb-4.0.3&w=150&q=80', categoria: 'Comida', estadoActivo: true, x: 200, y: 150, ancho: 120, alto: 100 },
  { id: '3', numero: 'Escenario Principal', foto: null, categoria: 'Entretenimiento', estadoActivo: true, x: 400, y: 50, ancho: 250, alto: 120 }
];

export default function App() {
  const navigate = useNavigate();

  // FIX DEL SCROLL: Esto garantiza que siempre cargue en la parte superior
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [data] = useState(() => {
    const dataGuardada = localStorage.getItem('pi_landing_config');
    return dataGuardada ? JSON.parse(dataGuardada) : defaultLandingData;
  });

  const [mapaPuestos] = useState(() => {
    const mapaGuardado = localStorage.getItem('pi_mapa_puestos');
    return mapaGuardado ? JSON.parse(mapaGuardado) : mockMapa;
  });

  const [puestoModal, setPuestoModal] = useState(null);

  const handleLoginClick = () => navigate('/login');

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

  const obtenerProductosMock = (categoria) => {
    if (categoria === 'Comida') {
      return [
        { id: 1, nombre: 'Combo Especial', precio: 35.00 },
        { id: 2, nombre: 'Porción Personal', precio: 15.00 },
        { id: 3, nombre: 'Gaseosa 500ml', precio: 10.00 }
      ];
    }
    return []; 
  };

  const abrirModalPuesto = (puesto) => {
    setPuestoModal({ ...puesto, productos: puesto.productos || obtenerProductosMock(puesto.categoria) });
  };

  return (
    <div className="pi-landing-container" style={estiloDinamico}>
      
      {/* BARRA DE NAVEGACIÓN */}
      <nav className="pi-landing-navbar">
        <div className="pi-landing-logo">
          <FaQrcode className="logo-icon" />
          <span>QPass</span>
        </div>
        <ul className="pi-landing-nav-links">
          <li><a href="#inicio">Inicio</a></li>
          <li><a href="#actividades">Actividades</a></li>
          <li><a href="#mapa">Mapa del Evento</a></li>
          <li><a href="#cronograma">Cronograma</a></li>
        </ul>
        <button className="pi-landing-btn-nav" onClick={handleLoginClick}>
          Iniciar Sesión
        </button>
      </nav>

      <div className="bg-glow glow-top-left"></div>
      <div className="bg-glow glow-bottom-right"></div>

      {/* SECCIÓN HERO */}
      <header id="inicio" className="pi-landing-hero">
        <div className="pi-landing-hero-content">
          <h1>{data.titulo}</h1>
          <p>{data.informacion}</p>
          <button className="pi-landing-btn-primary" onClick={handleLoginClick}>
            Ingresar al Portal
          </button>
        </div>
        <div className="pi-landing-hero-image">
          <img src={data.imagen} alt="Evento QPass" className="floating-img" />
        </div>
      </header>

      {/* SECCIÓN ACTIVIDADES */}
      <section id="actividades" className="pi-landing-section">
        <h2 className="pi-landing-section-title">Servicios Destacados</h2>
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
                onClick={() => abrirModalPuesto(puesto)}
              >
                {puesto.foto ? (
                  <div className="box-fondo-img" style={{ backgroundImage: `url(${puesto.foto})` }}>
                    <div className="box-overlay-texto"><strong>{puesto.numero}</strong></div>
                  </div>
                ) : (
                  <div className="box-fondo-color">
                    <FaStore className="puesto-icon-dinamico" />
                    <strong>{puesto.numero}</strong>
                    <span>{puesto.categoria}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN CRONOGRAMA (DISEÑO ACTUALIZADO) */}
      <section id="cronograma" className="pi-landing-section">
        <div className="pi-landing-section-header">
          <h2 className="pi-landing-section-title"><FaClock /> Cronograma Oficial</h2>
        </div>
        
        <div className="pi-landing-timeline">
          {data.cronograma.map((item, index) => {
            // Alternamos entre la tarjeta izquierda y derecha
            const isLeft = index % 2 === 0;
            return (
              <div key={index} className={`timeline-card ${isLeft ? 'card-left' : 'card-right'}`}>
                {/* Insignia del número */}
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

      {/* --- MODAL DE PRODUCTOS DEL PUESTO --- */}
      {puestoModal && (
        <div className="pi-landing-modal-overlay">
          <div className="pi-landing-modal glass-modal">
            
            <div className="pi-landing-modal-header">
              <div className="modal-header-info">
                {puestoModal.foto ? (
                  <img src={puestoModal.foto} alt="Logo" className="modal-puesto-img" />
                ) : (
                  <div className="modal-puesto-no-img"><FaStore /></div>
                )}
                <h2>{puestoModal.numero}</h2>
              </div>
              <button className="btn-close-modal" onClick={() => setPuestoModal(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="pi-landing-modal-body">
              <span className="modal-categoria-badge">{puestoModal.categoria}</span>
              <h3 className="modal-menu-title">
                <FaHamburger /> Menú Disponible
              </h3>

              {puestoModal.productos && puestoModal.productos.length > 0 ? (
                <div className="pi-landing-table-wrapper inner-table">
                  <table className="pi-landing-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th style={{ textAlign: 'right' }}>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {puestoModal.productos.map(prod => (
                        <tr key={prod.id}>
                          <td className="prod-nombre">{prod.nombre}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="prod-precio">
                              Bs. {prod.precio.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="modal-empty-state">
                  Este lugar no tiene productos a la venta en este momento.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}