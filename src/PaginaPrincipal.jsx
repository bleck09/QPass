import { useNavigate } from 'react-router-dom';
import { 
  FaQrcode, FaSignInAlt, FaCalendarAlt, FaHistory, 
  FaBolt, FaChartPie, FaMobileAlt, FaArrowRight 
} from 'react-icons/fa';
import './PaginaPrincipal.css';

// --- DATOS SIMULADOS DE EVENTOS ---
const proximosEventos = [
  { id: 'ev-01', nombre: 'Festival QPass 2026', fecha: '15 de Octubre, 2026', lugar: 'Campo Ferial, Cbba', imagen: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', categoria: 'Concierto' },
  { id: 'ev-02', nombre: 'Feria Gastronómica', fecha: '02 de Noviembre, 2026', lugar: 'Parque de la Familia', imagen: 'https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', categoria: 'Gastronomía' },
  { id: 'ev-03', nombre: 'Tech Summit Latam', fecha: '20 de Noviembre, 2026', lugar: 'Hotel Cochabamba', imagen: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', categoria: 'Tecnología' },
  { id: 'ev-04', nombre: 'Fiesta de Año Nuevo', fecha: '31 de Diciembre, 2026', lugar: 'Salón El Portal', imagen: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', categoria: 'Fiesta' },
];

const eventosPasados = [
  { id: 'ev-pas-01', nombre: 'Carnaval QPass 2025', fecha: 'Febrero 2025', lugar: 'Cochabamba', imagen: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
  { id: 'ev-pas-02', nombre: 'Oktoberfest 2025', fecha: 'Octubre 2025', lugar: 'Santa Cruz', imagen: 'https://images.unsplash.com/photo-1575037614876-c38db4ce8445?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
  { id: 'ev-pas-03', nombre: 'Expo Valles', fecha: 'Agosto 2025', lugar: 'Tarija', imagen: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
];

export default function PaginaPrincipal() {
  const navigate = useNavigate();

  // Función para ir a la Landing Page del evento en particular
  const verEvento = (id) => {
    // Aquí podrías guardar en localStorage qué evento se clickeó, o navegar por parámetro
    // Por ahora redireccionamos a la vista de evento genérica (nuestro App.jsx actual)
    console.log(`Navegando al evento con ID: ${id}`);
    navigate('/evento'); 
  };

  return (
    <div className="qpass-home-container">
      
      {/* --- LUCES DE FONDO --- */}
      <div className="qpass-home-glow glow-1"></div>
      <div className="qpass-home-glow glow-2"></div>

      {/* --- NAVBAR --- */}
      <nav className="qpass-home-navbar glass-panel">
        <div className="qpass-home-logo">
          <FaQrcode className="logo-icon" />
          <span>QPass</span>
        </div>
        <ul className="qpass-home-nav-links">
          <li><a href="#servicios">Servicios</a></li>
          <li><a href="#nosotros">Nosotros</a></li>
          <li><a href="#cartelera">Cartelera</a></li>
        </ul>
        <div className="qpass-home-nav-actions">
          {/* Este botón puede mandar a contacto para organizadores */}
          <button className="btn-outline">Crear mi evento</button>
          <button className="btn-solid" onClick={() => navigate('/login')}>
            <FaSignInAlt /> Iniciar Sesión
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="qpass-home-hero">
        <div className="hero-content">
          <div className="badge-tech">Tecnología Cashless & Tickets 🚀</div>
          <h1>Revolucionamos la experiencia de tus eventos</h1>
          <p>Olvídate de las filas eternas y el manejo de efectivo. Con las manillas y códigos QR de QPass, gestiona accesos, ventas de comida y métricas en tiempo real con seguridad militar.</p>
          <div className="hero-buttons">
            <a href="#cartelera" className="btn-solid btn-large">Ver Próximos Eventos</a>
            <a href="#servicios" className="btn-outline btn-large">¿Cómo funciona?</a>
          </div>
        </div>
      </header>

      {/* --- NOSOTROS / SERVICIOS --- */}
      <section id="servicios" className="qpass-home-section">
        <div className="section-header">
          <h2>¿Por qué elegir QPass?</h2>
          <p>Un ecosistema completo diseñado para organizadores y asistentes.</p>
        </div>
        
        <div className="qpass-home-services-grid">
          <div className="service-card glass-panel">
            <div className="service-icon"><FaMobileAlt /></div>
            <h3>Manillas QR Inteligentes</h3>
            <p>Acceso ultrarrápido y pagos sin contacto. Tu celular y una manilla es todo lo que el asistente necesita.</p>
          </div>
          <div className="service-card glass-panel">
            <div className="service-icon"><FaBolt /></div>
            <h3>Cero Filas (Cashless)</h3>
            <p>Multiplica tus ventas acelerando el flujo de cajas. Recargas en un punto central y compras instantáneas en puestos.</p>
          </div>
          <div className="service-card glass-panel">
            <div className="service-icon"><FaChartPie /></div>
            <h3>Métricas en Tiempo Real</h3>
            <p>Como organizador, controla cuánto vendió cada puesto, ingresos por hora y auditoría de personal al segundo.</p>
          </div>
        </div>
      </section>

      {/* --- CARRUSEL: PRÓXIMOS EVENTOS --- */}
      <section id="cartelera" className="qpass-home-section">
        <div className="section-header-row">
          <div>
            <h2><FaCalendarAlt className="title-icon"/> Próximos Eventos</h2>
            <p>Consigue tus entradas y recarga tu saldo antes de llegar.</p>
          </div>
        </div>

        <div className="qpass-home-carousel">
          {proximosEventos.map((evento) => (
            <div key={evento.id} className="carousel-card glass-panel">
              <div className="card-image-wrapper">
                <img src={evento.imagen} alt={evento.nombre} />
                <span className="card-badge">{evento.categoria}</span>
              </div>
              <div className="card-content">
                <h3>{evento.nombre}</h3>
                <span className="card-date">{evento.fecha}</span>
                <span className="card-location">{evento.lugar}</span>
                <button className="btn-solid btn-full" onClick={() => verEvento(evento.id)}>
                  Ver Información <FaArrowRight />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- CARRUSEL: EVENTOS PASADOS --- */}
      <section className="qpass-home-section">
        <div className="section-header-row">
          <div>
            <h2><FaHistory className="title-icon"/> Eventos Pasados</h2>
            <p>Revive la magia de los eventos que confiaron en la tecnología QPass.</p>
          </div>
        </div>

        <div className="qpass-home-carousel past-events">
          {eventosPasados.map((evento) => (
            <div key={evento.id} className="carousel-card past-card glass-panel">
              <div className="card-image-wrapper grayscale">
                <img src={evento.imagen} alt={evento.nombre} />
              </div>
              <div className="card-content">
                <h3>{evento.nombre}</h3>
                <span className="card-date">{evento.fecha}</span>
                <button className="btn-outline btn-full btn-small">Ver Galería</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- FOOTER GLOBAL --- */}
      <footer className="qpass-home-footer glass-panel">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="qpass-home-logo">
              <FaQrcode className="logo-icon" />
              <span>QPass</span>
            </div>
            <p>La plataforma definitiva para la gestión de accesos y pagos Cashless en Bolivia.</p>
          </div>
          <div className="footer-links">
            <h4>Empresa</h4>
            <ul>
              <li><a href="#nosotros">Sobre Nosotros</a></li>
              <li><a href="#">Contacto Organizadores</a></li>
              <li><a href="#">Términos y Condiciones</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} QPass Technologies. Desarrollado en Cochabamba, Bolivia.</p>
        </div>
      </footer>

    </div>
  );
}