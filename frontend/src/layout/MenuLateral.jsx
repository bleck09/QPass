import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  FaChartPie, FaUsers, FaSignOutAlt, FaUserCircle,
  FaFileInvoiceDollar, FaBoxOpen, FaCashRegister, FaChevronDown, FaWallet,
  FaExclamationTriangle, FaBars, FaCalendarAlt, FaLink
} from 'react-icons/fa';
import { MdAccountBalance, MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import { ROLES, ROLE_LABELS } from '../constants/roles.js';
import { leerSesion, cerrarSesion } from '../api/client.js';
import './MenuLateral.css';

// Configuración de menús según el rol
const menuConfig = {
  [ROLES.ADMIN]: [
    { titulo: 'Dashboard General', ruta: '/admin', icono: <FaChartPie /> },
    { titulo: 'Gestión de Eventos', ruta: '/admin/eventos', icono: <FaCalendarAlt /> },
    { titulo: 'Gestión de Usuarios', ruta: '/AdCreaUsuarioNegocio', icono: <FaUsers /> },
    // Tickets del Evento, Generar QR, Configurar Página y Mapa se acceden desde
    // Gestión de Eventos (accesos rápidos del detalle), no desde la barra lateral.
    { titulo: 'Reportes', ruta: '/admin/reportes', icono: <FaExclamationTriangle /> }
  ],
  [ROLES.CLIENTE]: [
    { titulo: 'Mi Propuesta', ruta: '/Cliente', icono: <FaCashRegister /> },
    { titulo: 'Dashboard General', ruta: '/Cliente/dashboard', icono: <FaChartPie /> }
  ],
  [ROLES.RECARGADOR]: [
    { titulo: 'Mi Caja', ruta: '/recargador', icono: <FaCashRegister /> },
    { titulo: 'Historial Recargas', ruta: '/recargador/historial', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Incidencias', ruta: '/recargador/incidencias', icono: <FaExclamationTriangle /> }
  ],
  [ROLES.SUPERVISOR]: [
    { titulo: 'Panel de Control', ruta: '/supervisor', icono: <FaChartPie /> },
    { titulo: 'Gestión de Entrega', ruta: '/supervisor/entrega', icono: <FaLink /> }
  ],
  [ROLES.DEVOLUCION]: [
    { titulo: 'Gestión Devoluciones', ruta: '/devolucion', icono: <FaBoxOpen /> },
    { titulo: 'Historial', ruta: '/devolucion/historial', icono: <FaFileInvoiceDollar /> }
  ],
  [ROLES.USUARIO_NORMAL]: [
    { titulo: 'Eventos', ruta: '/usuarionormal/eventos', icono: <FaCalendarAlt /> },
    { titulo: 'Mis Entradas', ruta: '/usuarionormal', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Mi Saldo', ruta: '/usuarionormal/saldo', icono: <FaWallet /> },
    { titulo: 'Mi Perfil', ruta: '/perfil', icono: <FaUserCircle /> }
  ],
  [ROLES.USUARIO_NEGOCIO]: [
    { titulo: 'Dashboard de Negocio', ruta: '/UsuNegoDasboar', icono: <FaChartPie />  },
    { titulo: 'Mi Negocio', ruta: '/usuarionegocio', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Crear ayudante', ruta: '/usuarionegocio/ayudantes', icono:<FaWallet /> }
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

  const navigate = useNavigate();
  const location = useLocation();

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

  const opcionesMenu = menuConfig[usuario.rol] || [];
  const rolLabel = ROLE_LABELS[usuario.rol] || usuario.rol;
  const getIniciales = (nombre = "Usuario") => nombre.substring(0, 2).toUpperCase();

  return (
    <div className="pi-layout-contenedor">
      {/* Primer elemento enfocable: saltar directo al contenido (Manual 11.2) */}
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      
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
                    ? <img width="36" height="36" src={usuario.foto} alt={usuario.nombre} className="pi-layout-avatar-img" />
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