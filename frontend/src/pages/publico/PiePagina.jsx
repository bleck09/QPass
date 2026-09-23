import { Link } from 'react-router-dom';
import {
  FaQrcode, FaEnvelope, FaWhatsapp, FaMapMarkerAlt, FaArrowUp,
} from 'react-icons/fa';
import { CONTACTO } from '../../constants/contacto.js';
import './PiePagina.css';
import Boton from '../../components/Boton.jsx';

const EXPLORAR = [
  { href: '#cartelera', texto: 'Cartelera' },
  { href: '#servicios', texto: 'La plataforma' },
  { href: '#asistentes', texto: 'Para asistentes' },
  { href: '#organizadores', texto: 'Para organizadores' },
  { href: '#pasados', texto: 'Eventos pasados' },
];

const CUENTA = [
  { to: '/login', texto: 'Iniciar sesión' },
  { to: '/Registrar', texto: 'Crear cuenta' },
  { to: '/recuperar', texto: 'Recuperar contraseña' },
];

/**
 * Pie de la landing: marca, navegación por secciones, accesos de cuenta y
 * contacto. `onContactar(tipo)` lleva al formulario con el motivo elegido;
 * `hayPasados` saca el link a Eventos pasados cuando esa sección no se dibuja.
 */
export default function PiePagina({ onContactar, hayPasados = true }) {
  const explorar = hayPasados ? EXPLORAR : EXPLORAR.filter((l) => l.href !== '#pasados');

  const subir = () => window.scrollTo({
    top: 0,
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });

  return (
    <footer className="qp-pie pi-home-glass-morphism">
      <div className="qp-pie__grid">
        <div className="qp-pie__marca">
          <div className="pi-home-qpass-home-logo">
            <div className="pi-home-logo-icon-bg"><FaQrcode /></div>
            <span>QPass</span>
          </div>
          <p>
            Entradas online, manillas QR y pagos sin efectivo para eventos en
            Bolivia. Una sola plataforma para el público, los organizadores y
            los negocios.
          </p>
          <Boton variante="acento" pildora onClick={() => onContactar('organizar')}>
            Organizá tu evento con nosotros
          </Boton>
        </div>

        <nav className="qp-pie__col" aria-label="Secciones">
          <h2>Explorar</h2>
          <ul>
            {explorar.map((l) => <li key={l.href}><a href={l.href}>{l.texto}</a></li>)}
          </ul>
        </nav>

        <nav className="qp-pie__col" aria-label="Cuenta">
          <h2>Tu cuenta</h2>
          <ul>
            {CUENTA.map((l) => <li key={l.to}><Link to={l.to}>{l.texto}</Link></li>)}
          </ul>
        </nav>

        <div className="qp-pie__col">
          <h2>Contacto</h2>
          <ul>
            <li><a href={`mailto:${CONTACTO.correo}`}><FaEnvelope aria-hidden="true" /> {CONTACTO.correo}</a></li>
            <li><a href={CONTACTO.whatsappUrl} target="_blank" rel="noreferrer"><FaWhatsapp aria-hidden="true" /> {CONTACTO.whatsapp}</a></li>
            <li><span><FaMapMarkerAlt aria-hidden="true" /> {CONTACTO.ciudad}</span></li>
          </ul>
        </div>
      </div>

      <div className="qp-pie__base">
        <p>&copy; {new Date().getFullYear()} QPass Technologies. Todos los derechos reservados.</p>
        <Boton variante="translucido" tamano="sm" pildora iconoDerecha={FaArrowUp} onClick={subir}>
          Volver arriba
        </Boton>
      </div>
    </footer>
  );
}
