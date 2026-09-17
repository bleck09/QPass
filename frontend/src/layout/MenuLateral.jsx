import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  FaChartPie, FaChartBar, FaUsers, FaSignOutAlt, FaUserCircle,
  FaFileInvoiceDollar, FaBoxOpen, FaCashRegister, FaChevronDown, FaWallet, FaMoneyBillWave,
  FaExclamationTriangle, FaBars, FaCalendarAlt, FaLink, FaHistory,
  FaSun, FaMoon, FaUserSecret
} from 'react-icons/fa';
import { MdAccountBalance, MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import { ROLES, ROLE_LABELS } from '../constants/roles.js';
import { leerSesion, guardarSesion, cerrarSesion } from '../api/client.js';
import api from '../api/index.js';
import { leerTema, aplicarTema } from '../utils/tema.js';
import { revisarBloqueoScroll } from '../utils/bloqueoScroll.js';
import AlertasDuplicados from '../components/AlertasDuplicados.jsx';
import { ROLES_SEGURIDAD } from '../utils/duplicados.js';
import './MenuLateral.css';

// Configuración de menús según el rol
const menuConfig = {
  [ROLES.ADMIN]: [
    { titulo: 'Dashboard General', ruta: '/admin/general', icono: <FaChartPie /> },
    { titulo: 'Por Eventos', ruta: '/admin', icono: <FaChartBar /> },
    { titulo: 'Gestión de Eventos', ruta: '/admin/eventos', icono: <FaCalendarAlt /> },
    { titulo: 'Gestión de Usuarios', ruta: '/AdCreaUsuarioNegocio', icono: <FaUsers /> },
    // Tickets del Evento, Generar QR, Configurar Página y Mapa se acceden desde
    // Gestión de Eventos (accesos rápidos del detalle), no desde la barra lateral.
    { titulo: 'Reportes', ruta: '/admin/reportes', icono: <FaExclamationTriangle /> },
    { titulo: 'Personas por encontrar', ruta: '/duplicados', icono: <FaUserSecret /> },
    { titulo: 'Auditoría', ruta: '/admin/auditoria', icono: <FaHistory /> }
  ],
  [ROLES.CLIENTE]: [
    { titulo: 'Mi Propuesta', ruta: '/Cliente', icono: <FaCashRegister /> },
    { titulo: 'Dashboard General', ruta: '/Cliente/dashboard', icono: <FaChartPie /> },
    { titulo: 'Personas por encontrar', ruta: '/duplicados', icono: <FaUserSecret /> }
  ],
  [ROLES.RECARGADOR]: [
    { titulo: 'Recargar', ruta: '/recargador', icono: <FaCashRegister /> },
    { titulo: 'Historial Recargas', ruta: '/recargador/historial', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Incidencias', ruta: '/recargador/incidencias', icono: <FaExclamationTriangle /> },
    { titulo: 'Arqueo de Caja', ruta: '/recargador/caja', icono: <FaMoneyBillWave /> }
  ],
  [ROLES.SUPERVISOR]: [
    { titulo: 'Panel de Control', ruta: '/supervisor', icono: <FaChartPie /> },
    { titulo: 'Gestión de Entrega', ruta: '/supervisor/entrega', icono: <FaLink /> },
    { titulo: 'Personas por encontrar', ruta: '/duplicados', icono: <FaUserSecret /> }
  ],
  [ROLES.DEVOLUCION]: [
    { titulo: 'Gestión Devoluciones', ruta: '/devolucion', icono: <FaBoxOpen /> },
    { titulo: 'Historial', ruta: '/devolucion/historial', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Arqueo de Caja', ruta: '/devolucion/caja', icono: <FaMoneyBillWave /> }
  ],
  [ROLES.USUARIO_NORMAL]: [
    { titulo: 'Eventos', ruta: '/usuarionormal/eventos', icono: <FaCalendarAlt /> },
    { titulo: 'Mis Entradas', ruta: '/usuarionormal', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Mi Saldo', ruta: '/usuarionormal/saldo', icono: <FaWallet /> },
    { titulo: 'Mi Perfil', ruta: '/perfil', icono: <FaUserCircle /> }
  ],
  [ROLES.USUARIO_NEGOCIO]: [
    { titulo: 'Dashboard de Negocio', ruta: '/UsuNegoDasboar', icono: <FaChartPie />  },
    { titulo: 'Mi Catálogo', ruta: '/usuarionegocio/catalogo', icono: <FaBoxOpen /> },
    { titulo: 'Mi Negocio', ruta: '/usuarionegocio', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Mis Ayudantes', ruta: '/usuarionegocio/ayudantes', icono:<FaUsers /> }
  ],
  [ROLES.AYUDANTE]: [
    { titulo: 'Vender / Cobrar', ruta: '/ayudante', icono: <FaCashRegister /> }
  ]
};

export const EVENTO_USUARIO_ACTUALIZADO = 'qpass-usuario-actualizado';

const leerUsuarioGuardado = () => leerSesion();

export default function MenuLateral({ children }) {
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [tema, setTema] = useState(leerTema);
  // Las URLs de /uploads vienen firmadas con 30 min de vencimiento (ver
  // firma-uploads.ts): la foto guardada en localStorage nunca se refresca sola,
  // así que pasado ese rato el <img> tira 403. Guarda qué URL ya falló para no
  // reintentar en bucle si el refresco también falla (ej. sin conexión).
  const fotoFallidaRef = useRef(null);

  const cambiarTema = () => {
    const sig = tema === 'dark' ? 'light' : 'dark';
    setTema(sig);
    aplicarTema(sig);
  };

  const navigate = useNavigate();
  const location = useLocation();

  // Red de seguridad: al cambiar de pantalla, si no quedó ningún modal abierto,
  // la página nunca debe seguir sin scroll.
  useEffect(() => {
    revisarBloqueoScroll();
  }, [location.pathname]);

  useEffect(() => {
    const actualizar = () => setUsuario(leerUsuarioGuardado());
    window.addEventListener(EVENTO_USUARIO_ACTUALIZADO, actualizar);
    return () => window.removeEventListener(EVENTO_USUARIO_ACTUALIZADO, actualizar);
  }, []);

  // Toda capa que se despliega se cierra con ESC (Manual 3.3 / 8.6).
  useEffect(() => {
    const alTecla = (e) => {
      if (e.key !== 'Escape') return;
      setMenuPerfilAbierto(false);
      setIsMobileOpen(false);
    };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, []);

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Cuenta generada al aprobar una compra (contraseña temporal, sin CI): no puede
  // usar el resto de la app hasta pasar por /completar-perfil (ver ese componente
  // y ComprasService.aprobar / UsuariosService.reevaluarCompletarPerfil).
  if (usuario.debeCompletarPerfil) {
    return <Navigate to="/completar-perfil" replace />;
  }

  const handleCerrarSesion = () => {
    cerrarSesion();
    navigate('/');
  };

  // Al 403 por firma vencida, pide un usuario fresco (viene con la foto
  // re-firmada) y reutiliza el mismo mecanismo de Perfil.jsx para propagar el
  // cambio: guardar sesión + avisar por el evento que ya escucha este mismo componente.
  const refrescarFotoSiVencio = async () => {
    if (fotoFallidaRef.current === usuario.foto) return;
    fotoFallidaRef.current = usuario.foto;
    try {
      const fresco = await api.usuarios.obtener(usuario.id);
      guardarSesion({ ...leerSesion(), foto: fresco.foto });
      window.dispatchEvent(new Event(EVENTO_USUARIO_ACTUALIZADO));
    } catch {
      // Sin conexión o lo que sea: se deja el ícono roto, no insistimos.
    }
  };

  const opcionesMenu = menuConfig[usuario.rol] || [];
  const rolLabel = ROLE_LABELS[usuario.rol] || usuario.rol;
  const getIniciales = (nombre = "Usuario") => nombre.substring(0, 2).toUpperCase();

  return (
    <div className="pi-layout-contenedor">
      {/* Primer elemento enfocable: saltar directo al contenido (Manual 11.2) */}
      <a href="#contenido" className="skip-link">Saltar al contenido</a>

      {/* Avisos de manillas copiadas (polling cada 10 s) */}
      {ROLES_SEGURIDAD.includes(usuario.rol) && <AlertasDuplicados usuarioId={usuario.id} />}
      
      {isMobileOpen && (
        <div
          className="pi-mobile-overlay"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* --- MENÚ LATERAL --- */}
      <aside className={`pi-layout-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        
        <div className="pi-layout-logo-section">
          <div className="pi-layout-logo">
            <div className="logo-icon-wrapper">
              <MdAccountBalance size={24} color="var(--cian-digital)" />
            </div>
            {!isCollapsed && (
              <div className="logo-text">
                <h2>QPass</h2>
                <p>{rolLabel}</p>
              </div>
            )}
          </div>
          
          <button
            type="button"
            className="pi-btn-collapse"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <MdKeyboardArrowRight size={20} /> : <MdKeyboardArrowLeft size={20} />}
          </button>
        </div>

        <nav className="pi-layout-nav" aria-label="Navegación principal">
          {opcionesMenu.map((item, index) => {
            const esActivo = location.pathname === item.ruta;
            return (
              <button
                type="button"
                key={index}
                className={`pi-layout-nav-item ${esActivo ? 'activo' : ''}`}
                aria-current={esActivo ? 'page' : undefined}
                onClick={() => {
                  navigate(item.ruta);
                  setIsMobileOpen(false);
                }}
                title={isCollapsed ? item.titulo : ''}
              >
                {/* Elementos fijos para la curva invertida */}
                <span className="curve-top" aria-hidden="true"></span>
                <span className="curve-bottom" aria-hidden="true"></span>

                <span className="pi-layout-nav-content">
                  <span className="pi-layout-nav-icon" aria-hidden="true">{item.icono}</span>
                  {!isCollapsed && <span className="pi-layout-nav-text">{item.titulo}</span>}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Tema claro / oscuro */}
        <div className="pi-layout-logout-section">
          <button
            type="button"
            className="pi-layout-nav-item"
            onClick={cambiarTema}
            title={isCollapsed ? (tema === 'dark' ? 'Tema claro' : 'Tema oscuro') : ''}
            aria-label={tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            <span className="pi-layout-nav-content">
              <span className="pi-layout-nav-icon" aria-hidden="true">
                {tema === 'dark' ? <FaSun /> : <FaMoon />}
              </span>
              {!isCollapsed && (
                <span className="pi-layout-nav-text">
                  {tema === 'dark' ? 'Tema claro' : 'Tema oscuro'}
                </span>
              )}
            </span>
          </button>
        </div>

        {/* Botón Salir */}
        <div className="pi-layout-logout-section">
          <button
            type="button"
            className="pi-layout-nav-item logout-btn"
            onClick={handleCerrarSesion}
            title={isCollapsed ? 'Cerrar Sesión' : ''}
          >
            <span className="pi-layout-nav-content">
              <span className="pi-layout-nav-icon" aria-hidden="true"><FaSignOutAlt /></span>
              {!isCollapsed && <span className="pi-layout-nav-text">Cerrar Sesión</span>}
            </span>
          </button>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="pi-layout-main-wrapper">
        <div className="pi-layout-main">
          
          <header className="pi-layout-header">
            <div className="pi-layout-header-left">
              <button
                type="button"
                className="pi-btn-mobile-menu"
                onClick={() => setIsMobileOpen(true)}
                aria-label="Abrir menú"
              >
                <FaBars size={20} />
              </button>
              <h3>Panel de {rolLabel}</h3>
            </div>

            <div className="pi-layout-header-right">
              <button
                type="button"
                className="pi-layout-perfil-btn"
                onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
                aria-haspopup="menu"
                aria-expanded={menuPerfilAbierto}
              >
                <div className="pi-layout-avatar">
                  {usuario.foto
                    ? <img width="36" height="36" src={usuario.foto} alt={usuario.nombre} className="pi-layout-avatar-img" onError={refrescarFotoSiVencio} />
                    : getIniciales(usuario.nombre || usuario.email)}
                </div>
                <div className="pi-layout-info-perfil hide-on-mobile">
                  <span className="pi-layout-nombre">{usuario.nombre || 'Usuario'}</span>
                  <span className="pi-layout-rol-header">{rolLabel}</span>
                </div>
                <FaChevronDown size={12} color="var(--gris-medio)" aria-hidden="true" />
              </button>

              {menuPerfilAbierto && (
                <div className="pi-layout-dropdown" role="menu">
                  <div className="pi-layout-dropdown-header">
                    <strong>{usuario.nombre || 'Usuario'}</strong>
                    <span>{usuario.email}</span>
                  </div>
                  <div className="pi-layout-dropdown-body">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setMenuPerfilAbierto(false); navigate('/perfil'); }}
                    >
                      <FaUserCircle aria-hidden="true" /> Mi Perfil
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="btn-logout"
                      onClick={handleCerrarSesion}
                    >
                      <FaSignOutAlt aria-hidden="true" /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <main id="contenido" className="pi-layout-content" tabIndex={-1}>
            {children}
          </main>
          
        </div>
      </div>
    </div>
  );
}