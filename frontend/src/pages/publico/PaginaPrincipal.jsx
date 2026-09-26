import { useCallback, useEffect, useRef, useState } from 'react';
import { forzarTemaClaro } from '../../utils/tema.js';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaSignInAlt, FaBars, FaTimes, FaMapMarkerAlt, FaWhatsapp, FaCheckCircle,
} from 'react-icons/fa';
import './PaginaPrincipal.css';
import HeroSection from './HeroSection.jsx';
import CintaBeneficios from './CintaBeneficios.jsx';
import FondoLanding from './FondoLanding.jsx';
import EventosDestacados from '../../components/EventosDestacados.jsx';
import EcosistemaSection from './EcosistemaSection.jsx';
import AsistentesSection from './AsistentesSection.jsx';
import OrganizadoresSection from './OrganizadoresSection.jsx';
import ContactoSection from './ContactoSection.jsx';
import PiePagina from './PiePagina.jsx';
import { CONTACTO, MOTIVOS_CONTACTO } from '../../constants/contacto.js';
import api from '../../api/index.js';
import { esVigente, formatearFecha, imagenEvento } from '../../utils/eventos.js';
import { useApi } from '../../utils/useApi.js';
import { useRevelar } from '../../utils/useRevelar.js';
import { useSeccionActiva } from '../../utils/useSeccionActiva.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import Boton from '../../components/Boton.jsx';
import Buscador from '../../components/Buscador.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import EventoCard from '../../components/EventoCard.jsx';

const LINKS_NAV = [
  { id: 'servicios', texto: 'Características' },
  { id: 'cartelera', texto: 'Cartelera' },
  { id: 'asistentes', texto: 'Asistentes' },
  { id: 'organizadores', texto: 'Organizadores' },
  { id: 'contacto', texto: 'Contáctanos' },
];
const IDS_NAV = LINKS_NAV.map((l) => l.id);

export default function PaginaPrincipal() {
  // Esta pantalla se ve siempre en claro: el tema oscuro es solo del
  // panel (ver utils/tema.js).
  useEffect(() => { forzarTemaClaro(); }, []);

  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Cartelera con estados cargando/error/reintentar (Manual 8.9).
  const cargarEventos = useCallback(() => api.eventos.listar(), []);
  const { data: eventos, cargando, error, recargar } = useApi(cargarEventos, { inicial: [] });
  const proximosEventos = eventos.filter(esVigente);
  // El carrusel lleva solo los 3 más cercanos; con más eventos se volvía
  // largo e incómodo. El resto va en una grilla con buscador debajo.
  const porFecha = [...proximosEventos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const destacados = porFecha.slice(0, 3);
  const restoCartelera = porFecha.slice(3);
  const [busqueda, setBusqueda] = useState('');
  const termino = busqueda.trim().toLowerCase();
  const restoFiltrado = termino
    ? restoCartelera.filter((ev) => `${ev.nombre} ${ev.lugar ?? ''}`.toLowerCase().includes(termino))
    : restoCartelera;
  const todosPasados = eventos.filter(ev => !esVigente(ev));
  // Solo los 6 mas recientes: la lista completa crece sin techo y termina
  // ocupando mas pantalla que la cartelera. Se ordena por fecha de fin
  // (cuando TERMINO el evento) y no por createdAt, que es cuando se cargo
  // al sistema y no tiene por que coincidir con el orden real.
  const eventosPasados = [...todosPasados]
    .sort((a, b) => new Date(b.fechaFin || b.fecha) - new Date(a.fechaFin || a.fecha))
    .slice(0, 6);
  // Sin eventos pasados la sección no se dibuja: antes quedaba el título solo.
  const hayPasados = !cargando && !error && eventosPasados.length > 0;

  const verEvento = (evento) => navigate(`/evento/${evento.id}`);

  // Las secciones entran revelandose al llegar a ellas (ver utils/useRevelar.js).
  const [refServicios, serviciosVisible] = useRevelar();
  const [refPasados, pasadosVisible] = useRevelar();
  const [refContacto, contactoVisible] = useRevelar();
  const [refAsistentes, asistentesVisible] = useRevelar();
  const [refOrganizadores, organizadoresVisible] = useRevelar();

  // Los CTA de Organizadores y del pie llevan al formulario con el motivo ya elegido.
  const [motivoContacto, setMotivoContacto] = useState(MOTIVOS_CONTACTO.organizar);
  const irAContacto = (tipo) => {
    setMotivoContacto(MOTIVOS_CONTACTO[tipo]);
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
  };

  // En tablet/movil los links de la navbar se ocultan por falta de espacio.
  // Antes no quedaba NINGUNA navegacion; ahora se despliegan en un panel.
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Link resaltado según la sección que se está leyendo. `cargando` va como
  // versión: la cartelera cambia de nodo al terminar de cargar.
  const seccionActiva = useSeccionActiva(IDS_NAV, cargando);

  /**
   * Estado de scroll: navbar compacta, WhatsApp flotante y barra de progreso.
   * La barra se escribe directo en el DOM (como el hero) para no re-renderizar
   * en cada frame; los dos booleanos solo re-renderizan cuando cambian.
   */
  const [scrolleado, setScrolleado] = useState(false);
  const [pasoHero, setPasoHero] = useState(false);
  const progresoRef = useRef(null);

  useEffect(() => {
    let pendiente = false;
    const medir = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        const y = window.scrollY || 0;
        const alto = document.documentElement.scrollHeight - window.innerHeight;
        progresoRef.current?.style.setProperty('--progreso', alto > 0 ? (y / alto).toFixed(4) : '0');
        setScrolleado(y > 40);
        setPasoHero(y > window.innerHeight * 0.9);
      });
    };
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir, { passive: true });
    medir();
    return () => {
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, []);

  const subir = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pi-home-qpass-home-container">

      {/* Fondo que cambia por sección (antes, una sola foto fija para toda la página). */}
      <FondoLanding version={cargando} />
      <div className="pi-home-qpass-home-glow pi-home-glow-1"></div>
      <div className="pi-home-qpass-home-glow pi-home-glow-2"></div>

      <div className="qp-home-progreso" ref={progresoRef} aria-hidden="true" />

      <nav className={`pi-home-qpass-floating-navbar pi-home-glass-morphism${scrolleado ? ' esta-scrolleada' : ''}`}>
        <a href="#contenido" className="pi-home-qpass-home-logo" onClick={subir} aria-label="QPass, volver al inicio">
          <div className="pi-home-logo-icon-bg"><FaQrcode aria-hidden="true" /></div>
          <span>QPass</span>
        </a>
        <ul id="menu-navegacion" className={`pi-home-qpass-home-nav-links${menuAbierto ? ' esta-abierto' : ''}`} onClick={() => setMenuAbierto(false)}>
          {LINKS_NAV.map(({ id, texto }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={seccionActiva === id ? 'es-activo' : undefined}
                aria-current={seccionActiva === id ? 'location' : undefined}
              >
                {texto}
              </a>
            </li>
          ))}
        </ul>
        <div className="qpass-home-nav-actions">
          <Boton variante="acento" pildora icono={FaSignInAlt} className="qpass-home-sesion" onClick={() => navigate('/login')}>
            Iniciar sesión
          </Boton>
          <button
            type="button"
            className="pi-home-qpass-home-nav-toggle"
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
      <CintaBeneficios />

      {error ? (
        <section id="cartelera" className="pi-home-qpass-home-section">
          <EstadoError onReintentar={recargar} titulo="No se pudo cargar la cartelera" />
        </section>
      ) : cargando ? (
        <section id="cartelera" className="pi-home-qpass-home-section">
          <EstadoCarga filas={3} etiqueta="Cargando cartelera…" />
        </section>
      ) : (
        <EventosDestacados eventos={destacados} onVerEvento={verEvento} />
      )}

      {!cargando && !error && restoCartelera.length > 0 && (
        <section id="mas-eventos" className="pi-home-qpass-home-section">
          <div className="pi-home-section-header">
            <span className="qp-info__eyebrow">Cartelera completa</span>
            <h2>Más eventos que se vienen</h2>
            <p>Busca por nombre o lugar y entra a su página para comprar tus entradas.</p>
          </div>
          <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar evento o lugar…" />
          <GrillaEventos eventos={restoFiltrado} porPagina={6}>
            {(ev) => (
              <EventoCard
                key={ev.id}
                evento={{ ...ev, imagen: imagenEvento(ev) }}
                cta="Ver evento"
                onClick={() => verEvento(ev)}
              />
            )}
          </GrillaEventos>
        </section>
      )}

      <section
        id="servicios"
        className={`pi-home-qpass-home-section qp-revelar${serviciosVisible ? ' es-visible' : ''}`}
        ref={refServicios}
      >
        <EcosistemaSection enCartelera={proximosEventos.length} realizados={todosPasados.length} />
      </section>

      <section
        id="asistentes"
        className={`pi-home-qpass-home-section qp-revelar${asistentesVisible ? ' es-visible' : ''}`}
        ref={refAsistentes}
      >
        <AsistentesSection />
      </section>

      <section
        id="organizadores"
        className={`pi-home-qpass-home-section qp-revelar${organizadoresVisible ? ' es-visible' : ''}`}
        ref={refOrganizadores}
      >
        <OrganizadoresSection onContactar={irAContacto} />
      </section>

      {hayPasados && (
        <section
          id="pasados"
          className={`pi-home-qpass-home-section qp-revelar${pasadosVisible ? ' es-visible' : ''}`}
          ref={refPasados}
        >
          <div className="pi-home-section-header qp-pasados__header">
            <span className="qp-info__eyebrow">Eventos pasados</span>
            <h2>Ya confiaron en QPass</h2>
            <p>El éxito de nuestros aliados es nuestro éxito.</p>
          </div>

          <ul className="pi-home-past-events-grid">
            {eventosPasados.map((evento) => (
              <li key={evento.id}>
                <Link to={`/evento/${evento.id}`} className="pi-home-past-card pi-home-glass-morphism">
                  <span className="pi-home-past-card-img">
                    <img src={evento.imagen} alt="" width="100" height="100" loading="lazy" />
                    <span className="pi-home-past-card-badge"><FaCheckCircle aria-hidden="true" /> Realizado</span>
                  </span>
                  <span className="pi-home-past-card-info">
                    <h3>{evento.nombre}</h3>
                    <span><FaMapMarkerAlt aria-hidden="true" /> {evento.lugar} · {formatearFecha(evento.fecha)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        id="contacto"
        className={`pi-home-qpass-home-section qp-revelar${contactoVisible ? ' es-visible' : ''}`}
        ref={refContacto}
      >
        <div className="pi-home-section-header center">
          <span className="qp-info__eyebrow">Contacto</span>
          <h2>Contáctanos</h2>
          <p>¿Tienes un evento en mente o una consulta? Te respondemos.</p>
        </div>

        <ContactoSection motivo={motivoContacto} />
      </section>
      </main>

      <PiePagina onContactar={irAContacto} hayPasados={hayPasados} />

      {/* WhatsApp flotante: aparece recién pasado el hero para no tapar sus botones. */}
      <a
        href={CONTACTO.whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className={`qp-home-whatsapp${pasoHero ? ' es-visible' : ''}`}
        aria-label="Escríbenos por WhatsApp"
        tabIndex={pasoHero ? undefined : -1}
      >
        <FaWhatsapp aria-hidden="true" />
        <span>¿Dudas? Escríbenos</span>
      </a>
    </div>
  );
}
