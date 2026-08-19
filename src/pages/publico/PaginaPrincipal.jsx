import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaSignInAlt, 
  FaBolt, FaChartPie, FaMobileAlt, FaArrowRight,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import './PaginaPrincipal.css';
import CarruselEventos from '../../components/CarruselEventos.jsx';
import { proximosEventos, eventosPasados } from '../../data/eventos.js';

export default function PaginaPrincipal() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const verEvento = () => navigate('/evento');

  return (
    <div className="qpass-home-container">
      
      <div className="qpass-home-bg-image"></div>
      <div className="qpass-home-glow glow-1"></div>
      <div className="qpass-home-glow glow-2"></div>

      <nav className="qpass-floating-navbar glass-morphism">
        <div className="qpass-home-logo">
          <div className="logo-icon-bg"><FaQrcode /></div>
          <span>QPass</span>
        </div>
        <ul className="qpass-home-nav-links">
          <li><a href="#servicios">Características</a></li>
          <li><a href="#cartelera">Cartelera</a></li>
          <li><a href="#pasados">Eventos Pasados</a></li>
        </ul>
        <div className="qpass-home-nav-actions">
          <button className="btn-solid" onClick={() => navigate('/login')}>
            <FaSignInAlt /> Iniciar Sesión
          </button>
        </div>
      </nav>

      <header className="qpass-home-hero">
        <div className="hero-content">
          <div className="badge-tech glass-morphism">La nueva era de los eventos en Bolivia</div>
          <h1>Revolucionamos la forma en que vives los eventos</h1>
          <p>Olvídate de las filas eternas. Con QPass, tu celular y una manilla QR es todo lo que necesitas para acceder y comprar al instante.</p>
          <div className="hero-buttons">
            <a href="#cartelera" className="btn-solid btn-large">Ver Cartelera <FaArrowRight/></a>
          </div>
        </div>
      </header>

      <section id="cartelera" className="qpass-home-section">
        <div className="section-header center">
          <h2>Próximos Eventos</h2>
          <p>Explora y asegura tu acceso a las mejores experiencias. (Pasa el mouse o desliza)</p>
        </div>

        <CarruselEventos eventos={proximosEventos} onAdquirir={verEvento} />
      </section>

      {/* --- Resto del código se mantiene igual... --- */}
      <section id="servicios" className="qpass-home-section feature-section">
        <div className="feature-grid">
          <div className="feature-main-card glass-morphism">
            <h2>El Ecosistema <br/>Perfecto</h2>
            <p>Conectamos a organizadores y asistentes a través de tecnología de punta. Desde la validación en puerta hasta la compra de una bebida, todo en milisegundos.</p>
            
            <div className="feature-stats">
              <div className="stat-item">
                <strong>10K+</strong>
                <span>Entradas vendidas</span>
              </div>
              <div className="stat-users">
                <img src="https://i.pravatar.cc/100?img=1" alt="u1" />
                <img src="https://i.pravatar.cc/100?img=2" alt="u2" />
                <img src="https://i.pravatar.cc/100?img=3" alt="u3" />
                <div className="more-users"><FaArrowRight/></div>
              </div>
            </div>
          </div>

          <div className="feature-side-cards">
            <div className="side-card glass-morphism">
              <div className="icon-circle"><FaMobileAlt /></div>
              <h4>Manillas Inteligentes</h4>
              <p>Tu dinero y entrada en un QR seguro.</p>
            </div>
            <div className="side-card glass-morphism">
              <div className="icon-circle"><FaBolt /></div>
              <h4>Cero Filas</h4>
              <p>Compras ultrarrápidas en puntos de venta.</p>
            </div>
            <div className="side-card glass-morphism">
              <div className="icon-circle"><FaChartPie /></div>
              <h4>Auditoría Real</h4>
              <p>Métricas exactas para el organizador.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pasados" className="qpass-home-section">
        <div className="section-header">
          <h2>Eventos Pasados</h2>
          <p>El éxito de nuestros aliados es nuestro éxito.</p>
        </div>

        <div className="past-events-grid">
          {eventosPasados.map((evento) => (
            <div key={evento.id} className="past-card glass-morphism">
              <img src={evento.imagen} alt={evento.nombre} />
              <div className="past-card-info">
                <h4>{evento.nombre}</h4>
                <span><FaMapMarkerAlt/> {evento.lugar} · {evento.fecha}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="qpass-home-footer glass-morphism">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="qpass-home-logo">
              <div className="logo-icon-bg"><FaQrcode /></div>
              <span>QPass</span>
            </div>
            <p>La tecnología definitiva para eventos Cashless.</p>
          </div>
          <p className="copyright">&copy; {new Date().getFullYear()} QPass Technologies.</p>
        </div>
      </footer>

    </div>
  );
}