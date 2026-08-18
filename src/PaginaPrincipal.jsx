import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaQrcode, FaSignInAlt, FaCalendarAlt,
  FaBolt, FaChartPie, FaMobileAlt, FaArrowRight,
  FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaExpandArrowsAlt
} from 'react-icons/fa';
import './PaginaPrincipal.css';

// --- DATOS SIMULADOS DE EVENTOS ---
const proximosEventos = [
  { id: 'ev-01', nombre: 'Festival QPass 2026', fecha: '15 Oct, 2026', lugar: 'Campo Ferial, Cbba', imagen: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Concierto', precio: 'Bs. 150' },
  { id: 'ev-02', nombre: 'Tech Summit Latam', fecha: '20 Nov, 2026', lugar: 'Hotel Cochabamba', imagen: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Tecnología', precio: 'Bs. 300' },
  { id: 'ev-03', nombre: 'Feria Gastronómica', fecha: '02 Nov, 2026', lugar: 'Parque de la Familia', imagen: 'https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Gastronomía', precio: 'Bs. 50' },
  { id: 'ev-04', nombre: 'Fiesta de Año Nuevo', fecha: '31 Dic, 2026', lugar: 'Salón El Portal', imagen: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Fiesta', precio: 'Bs. 250' },
  { id: 'ev-05', nombre: 'Carnaval VIP', fecha: '15 Feb, 2027', lugar: 'Santa Cruz', imagen: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Festival', precio: 'Bs. 400' },
];

const eventosPasados = [
  { id: 'ev-pas-01', nombre: 'Oktoberfest 2025', fecha: 'Octubre 2025', lugar: 'Santa Cruz', imagen: 'https://images.unsplash.com/photo-1575037614876-c38db4ce8445?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
  { id: 'ev-pas-02', nombre: 'Expo Valles', fecha: 'Agosto 2025', lugar: 'Tarija', imagen: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
];

export default function PaginaPrincipal() {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0); 

  // --- VARIABLES PARA LÓGICA DE RATÓN / TÁCTIL ---
  const [touchStartX, setTouchStartX] = useState(null);
  const [isDragging, setIsDragging] = useState(false); // <--- NUEVO: Para saber si estamos arrastrando

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const verEvento = () => navigate('/evento');

  const nextSlide = () => setActiveIdx((prev) => (prev + 1) % proximosEventos.length);
  const prevSlide = () => setActiveIdx((prev) => (prev - 1 + proximosEventos.length) % proximosEventos.length);

  // ==========================================
  // LÓGICA DE ARRASTRE (SWIPE)
  // ==========================================
  const handleDragStart = (e) => {
    setIsDragging(true); // Bloqueamos el "hover" mientras arrastramos
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
  };

  const handleDragEnd = (e) => {
    setIsDragging(false); // Liberamos el "hover"
    if (touchStartX === null) return; 

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diferenciaX = touchStartX - clientX;

    if (diferenciaX > 50) {
      nextSlide();
    } else if (diferenciaX < -50) {
      prevSlide();
    }
    
    setTouchStartX(null);
  };

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
          <div className="badge-tech glass-morphism">✨ La nueva era de los eventos en Bolivia</div>
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

        {/* --- CONTENEDOR 3D --- */}
        <div 
          className="carousel-3d-container"
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
        >
          {proximosEventos.map((evento, index) => {
            const offset = index - activeIdx;
            const absOffset = Math.abs(offset);
            const direction = Math.sign(offset);
            const isActive = offset === 0;

            return (
              <div 
                key={evento.id} 
                className={`carousel-3d-card ${isActive ? 'active' : ''}`}
                style={{
                  '--offset': offset,
                  '--abs-offset': absOffset,
                  '--dir': direction,
                  zIndex: 10 - absOffset
                }}
                onClick={() => setActiveIdx(index)}
                
                /* LÓGICA DE HOVER SUAVE */
                onMouseEnter={() => {
                  // Solo cambiamos al pasar el mouse si NO estamos arrastrando
                  if (!isDragging) {
                    setActiveIdx(index);
                  }
                }}
              >
                <div className="card-image-bg">
                  <img src={evento.imagen} alt={evento.nombre} />
                  <div className="card-overlay-gradient"></div>
                </div>

                <button className="btn-expand-icon glass-morphism"><FaExpandArrowsAlt/></button>

                <div className="card-3d-content">
                  <h3>{evento.nombre}</h3>
                  <p className="card-desc">Vive la mejor experiencia con tecnología Cashless. Evita filas y recarga desde tu celular.</p>
                  
                  <div className="card-3d-footer">
                    <div className="footer-info">
                      <span><FaMapMarkerAlt/> {evento.lugar}</span>
                      <span><FaCalendarAlt/> {evento.fecha}</span>
                    </div>
                    <div className="footer-price">
                      <span>Desde</span>
                      <strong>{evento.precio}</strong>
                    </div>
                  </div>

                  {isActive && (
                    <button className="btn-solid btn-full mt-15" onClick={(e) => { e.stopPropagation(); verEvento(); }}>
                      Ver Evento <FaArrowRight/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="carousel-control-pill glass-morphism">
          <button onClick={prevSlide}><FaChevronLeft/></button>
          <div className="pill-info">
            <img src={proximosEventos[activeIdx].imagen} alt="thumb" />
            <div className="pill-text">
              <strong>{proximosEventos[activeIdx].nombre}</strong>
              <span>{proximosEventos[activeIdx].categoria}</span>
            </div>
          </div>
          <button onClick={nextSlide}><FaChevronRight/></button>
        </div>
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