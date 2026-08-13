import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  FaChartPie, FaUsers, FaCog, FaSignOutAlt, FaUserCircle,
  FaFileInvoiceDollar, FaBoxOpen, FaCashRegister, FaChevronDown, 
  FaWallet, FaBars, FaMapMarkedAlt
} from 'react-icons/fa';
import { MdAccountBalance, MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import './MenuLateral.css';

// Configuración de menús según el rol
const menuConfig = {
  Admin: [
    { titulo: 'Dashboard General', ruta: '/admin', icono: <FaChartPie /> },
    { titulo: 'Usuario de Negocio', ruta: '/AdCreaUsuarioNegocio', icono: <FaUsers /> },
    { titulo: 'Tickets del Evento', ruta: '/AdminCrearTickets', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Configurar Página', ruta: '/admin/config', icono: <FaCog /> },
    { titulo: 'Mapa', ruta: '/Mapa', icono: <FaMapMarkedAlt /> } 
  ],
  Cliente: [
    { titulo: 'Propuesta', ruta: '/Cliente', icono: <FaCashRegister /> }
  ],
  Recargador: [
    { titulo: 'Mi Caja', ruta: '/recargador', icono: <FaCashRegister /> },
    { titulo: 'Historial Recargas', ruta: '/recargador/historial', icono: <FaFileInvoiceDollar /> }
  ],
  Supervisor: [
    { titulo: 'Panel de Control', ruta: '/supervisor', icono: <FaChartPie /> },
    { titulo: 'Auditoría', ruta: '/supervisor/auditoria', icono: <FaUsers /> }
  ],
  Devolución: [
    { titulo: 'Gestión Devoluciones', ruta: '/devolucion', icono: <FaBoxOpen /> }
  ],
  'Usuario Normal': [
    { titulo: 'Mi Saldo', ruta: '/usuarionormal/saldo', icono: <FaWallet /> },
    { titulo: 'Comprar Entradas', ruta: '/usuarionormal', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Mi Perfil', ruta: '/perfil', icono: <FaUserCircle /> }
  ],
  'Usuario Negocio': [
    { titulo: 'Dashboard de Negocio', ruta: '/UsuNegoDasboar', icono: <FaChartPie />  },
    { titulo: 'Mi Negocio', ruta: '/usuarionegocio', icono: <FaFileInvoiceDollar /> },
    { titulo: 'Crear ayudante', ruta: '/UsuNegoCreaAyudante', icono:<FaWallet /> }
  ],
  Ayudante: [
    { titulo: 'Vender / Cobrar', ruta: '/ayudante', icono: <FaCashRegister /> }
  ]
};

export const EVENTO_USUARIO_ACTUALIZADO = 'qpass-usuario-actualizado';

const leerUsuarioGuardado = () => {
  const userGuardado = localStorage.getItem('usuarioProyectoIngresos');
  return userGuardado ? JSON.parse(userGuardado) : null;
};

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

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuarioProyectoIngresos');
    navigate('/');
  };

  const opcionesMenu = menuConfig[usuario.rol] || [];
  const getIniciales = (nombre = "Usuario") => nombre.substring(0, 2).toUpperCase();

  return (
    <div className="pi-layout-contenedor">
      
      {isMobileOpen && (
        <div className="pi-mobile-overlay" onClick={() => setIsMobileOpen(false)}></div>
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
                <p>{usuario.rol}</p>
              </div>
            )}
          </div>
          
          <button className="pi-btn-collapse" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <MdKeyboardArrowRight size={20} /> : <MdKeyboardArrowLeft size={20} />}
          </button>
        </div>

        <nav className="pi-layout-nav">
          {opcionesMenu.map((item, index) => {
            const activo = location.pathname === item.ruta ? 'activo' : '';
            return (
              <div 
                key={index} 
                className={`pi-layout-nav-item ${activo}`}
                onClick={() => {
                  navigate(item.ruta);
                  setIsMobileOpen(false); 
                }}
                title={isCollapsed ? item.titulo : ''}
              >
                {/* Elementos fijos para la curva invertida */}
                <div className="curve-top"></div>
                <div className="curve-bottom"></div>
                
                <div className="pi-layout-nav-content">
                  <span className="pi-layout-nav-icon">{item.icono}</span>
                  {!isCollapsed && <span className="pi-layout-nav-text">{item.titulo}</span>}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Botón Salir */}
        <div className="pi-layout-logout-section">
          <div className="pi-layout-nav-item logout-btn" onClick={handleCerrarSesion} title={isCollapsed ? "Cerrar Sesión" : ""}>
            <div className="pi-layout-nav-content">
              <span className="pi-layout-nav-icon"><FaSignOutAlt /></span>
              {!isCollapsed && <span className="pi-layout-nav-text">Cerrar Sesión</span>}
            </div>
          </div>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="pi-layout-main-wrapper">
        <div className="pi-layout-main">
          
          <header className="pi-layout-header">
            <div className="pi-layout-header-left">
              <button className="pi-btn-mobile-menu" onClick={() => setIsMobileOpen(true)}>
                <FaBars size={20} />
              </button>
              <h3>Panel de {usuario.rol}</h3>
            </div>

            <div className="pi-layout-header-right">
              <div 
                className="pi-layout-perfil-btn"
                onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
              >
                <div className="pi-layout-avatar">
                  {usuario.foto
                    ? <img src={usuario.foto} alt={usuario.nombre} className="pi-layout-avatar-img" />
                    : getIniciales(usuario.nombre || usuario.email)}
                </div>
                <div className="pi-layout-info-perfil hide-on-mobile">
                  <span className="pi-layout-nombre">{usuario.nombre || 'Usuario'}</span>
                  <span className="pi-layout-rol-header">{usuario.rol}</span>
                </div>
                <FaChevronDown size={12} color="var(--gris-medio)" />
              </div>

              {menuPerfilAbierto && (
                <div className="pi-layout-dropdown">
                  <div className="pi-layout-dropdown-header">
                    <strong>{usuario.nombre || 'Usuario'}</strong>
                    <span>{usuario.email}</span>
                  </div>
                  <div className="pi-layout-dropdown-body">
                    <button onClick={() => { setMenuPerfilAbierto(false); navigate('/perfil'); }}>
                      <FaUserCircle /> Mi Perfil
                    </button>
                    <button className="btn-logout" onClick={handleCerrarSesion}>
                      <FaSignOutAlt /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="pi-layout-content">
            {children}
          </main>
          
        </div>
      </div>
    </div>
  );
}