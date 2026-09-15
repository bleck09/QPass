import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaSignInAlt,
  FaBolt, FaChartPie, FaMobileAlt, FaArrowRight, FaBars, FaTimes,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import './PaginaPrincipal.css';
import HeroSection from './HeroSection.jsx';
import EventosDestacados from '../../components/EventosDestacados.jsx';
import ContactoSection from './ContactoSection.jsx';
import { CONTACTO } from '../../constants/contacto.js';
import api from '../../api/index.js';
import { esVigente, formatearFecha } from '../../utils/eventos.js';
import { useApi } from '../../utils/useApi.js';
import { useRevelar } from '../../utils/useRevelar.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';

export default function PaginaPrincipal() {
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Cartelera con estados cargando/error/reintentar (Manual 8.9).
  const cargarEventos = useCallback(() => api.eventos.listar(), []);
  const { data: eventos, cargando, error, recargar } = useApi(cargarEventos, { inicial: [] });
  const proximosEventos = eventos.filter(esVigente);
  // Solo los 5 mas recientes: la lista completa crece sin techo y termina
  // ocupando mas pantalla que la cartelera. Se ordena por fecha de fin
  // (cuando TERMINO el evento) y no por createdAt, que es cuando se cargo
  // al sistema y no tiene por que coincidir con el orden real.
  const eventosPasados = eventos
    .filter(ev => !esVigente(ev))
    .sort((a, b) => new Date(b.fechaFin || b.fecha) - new Date(a.fechaFin || a.fecha))
    .slice(0, 5);

  const verEvento = (evento) => navigate(`/evento/${evento.id}`);

  // La grilla de eventos pasados entra revelandose al llegar a ella
  // (ver utils/useRevelar.js).
  const [refPasados, pasadosVisible] = useRevelar();
  const [refContacto, contactoVisible] = useRevelar();

  // En tablet/movil los links de la navbar se ocultan por falta de espacio.
  // Antes no quedaba NINGUNA navegacion; ahora se despliegan en un panel.
  const [menuAbierto, setMenuAbierto] = useState(false);

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
        <ul id="menu-navegacion" className={`qpass-home-nav-links${menuAbierto ? ' esta-abierto' : ''}`} onClick={() => setMenuAbierto(false)}>
          <li><a href="#servicios">Características</a></li>
          <li><a href="#cartelera">Cartelera</a></li>
          <li><a href="#pasados">Eventos Pasados</a></li>
          <li><a href="#contacto">Contáctanos</a></li>
        </ul>
        <div className="qpass-home-nav-actions">
          <button className="btn-solid" onClick={() => navigate('/login')}>
            <FaSignInAlt aria-hidden="true" /> <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            className="qpass-home-nav-toggle"
            aria-expanded={menuAbierto}
            aria-controls="menu-navegacion"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuAbierto(a => !a)}
          >
            {menuAbierto ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Landmark principal (Manual 11): permite el salto de teclado y orienta al lector de pantalla */}
      <main id="contenido">
      <HeroSection />

      {error ? (
        <section id="cartelera" className="qpass-home-section">
          <EstadoError onReintentar={recargar} titulo="No se pudo cargar la cartelera" />
        </section>
      ) : cargando ? (
        <section id="cartelera" className="qpass-home-section">
          <EstadoCarga filas={3} etiqueta="Cargando cartelera…" />
        </section>
      ) : (
        <EventosDestacados eventos={proximosEventos.slice(0, 6)} onVerEvento={verEvento} />
      )}

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
                <img src="https://i.pravatar.cc/100?img=1" alt="" width="100" height="100" />
                <img src="https://i.pravatar.cc/100?img=2" alt="" width="100" height="100" />
                <img src="https://i.pravatar.cc/100?img=3" alt="" width="100" height="100" />
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

      <section
        id="pasados"
        className={`qpass-home-section qp-revelar${pasadosVisible ? ' es-visible' : ''}`}
        ref={refPasados}
      >
        <div className="section-header">
          <h2>Eventos Pasados</h2>
          <p>El éxito de nuestros aliados es nuestro éxito.</p>
        </div>

        <div className="past-events-grid">
          {eventosPasados.map((evento) => (
            <div key={evento.id} className="past-card glass-morphism">
              <img src={evento.imagen} alt={evento.nombre} width="100" height="100" loading="lazy" />
              <div className="past-card-info">
                <h4>{evento.nombre}</h4>
                <span><FaMapMarkerAlt/> {evento.lugar} · {formatearFecha(evento.fecha)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="contacto"
        className={`qpass-home-section qp-revelar${contactoVisible ? ' es-visible' : ''}`}
        ref={refContacto}
      >
        <div className="section-header center">
          <h2>Contáctanos</h2>
          <p>¿Tenés un evento en mente o una consulta? Te respondemos.</p>
        </div>

        <ContactoSection />
      </section>
      </main>

      <footer className="qpass-home-footer glass-morphism">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="qpass-home-logo">
              <div className="logo-icon-bg"><FaQrcode /></div>
              <span>QPass</span>
            </div>
            <p>La tecnología definitiva para eventos Cashless.</p>
          <p className="footer-contacto">
            <a href={`mailto:${CONTACTO.correo}`}>{CONTACTO.correo}</a>
            <span aria-hidden="true">·</span>
            <a href="#contacto">Contáctanos</a>
          </p>
          </div>
          <p className="copyright">&copy; {new Date().getFullYear()} QPass Technologies.</p>
        </div>
      </footer>

    </div>
  );
}