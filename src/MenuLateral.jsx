import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  FaChartPie, FaUsers, FaCog, FaSignOutAlt, FaUserCircle, 
  FaFileInvoiceDollar, FaBoxOpen, FaCashRegister, FaChevronDown 
} from 'react-icons/fa';
import { MdAccountBalance } from 'react-icons/md';
import './MenuLateral.css';

// Configuración de menús según el rol
const menuConfig = {
  Admin: [
    { titulo: 'Dashboard General', ruta: '/admin', icono: <FaChartPie /> },
    { titulo: 'Gestión de Usuarios', ruta: '/admin/usuarios', icono: <FaUsers /> },
    { titulo: 'Configuración', ruta: '/admin/config', icono: <FaCog /> }
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
    { titulo: 'Mi Estado', ruta: '/usuarionormal', icono: <FaUserCircle /> }
  ],
  'Usuario Negocio': [
    { titulo: 'Mi Negocio', ruta: '/usuarionegocio', icono: <FaFileInvoiceDollar /> }
  ],
  Ayudante: [
    { titulo: 'Tareas Asignadas', ruta: '/ayudante', icono: <FaBoxOpen /> }
  ]
};

export default function MenuLateral({ children }) {
  // 1. Leemos el localStorage directamente al iniciar el estado
  const [usuario] = useState(() => {
    const userGuardado = localStorage.getItem('usuarioProyectoIngresos');
    return userGuardado ? JSON.parse(userGuardado) : null;
  });

  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 2. Si no hay usuario, lo redirigimos inmediatamente sin usar useEffect
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuarioProyectoIngresos');
    navigate('/login');
  };

  const opcionesMenu = menuConfig[usuario.rol] || [];

  const getIniciales = (nombre = "Usuario") => {
    return nombre.substring(0, 2).toUpperCase();
  };

  return (
    <div className="pi-layout-contenedor">
      
      {/* --- MENÚ LATERAL (SIDEBAR) --- */}
      <aside className="pi-layout-sidebar">
        <div className="pi-layout-logo">
          <MdAccountBalance size={28} />
          <div>
            <h2>PROYECTO</h2>
            <p>Ingresos - {usuario.rol}</p>
          </div>
        </div>

        <nav className="pi-layout-nav">
          {opcionesMenu.map((item, index) => {
            const activo = location.pathname === item.ruta ? 'activo' : '';
            return (
              <div 
                key={index} 
                className={`pi-layout-nav-item ${activo}`}
                onClick={() => navigate(item.ruta)}
              >
                <span className="pi-layout-nav-icon">{item.icono}</span>
                <span className="pi-layout-nav-text">{item.titulo}</span>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="pi-layout-main">
        
        {/* BARRA SUPERIOR (HEADER) */}
        <header className="pi-layout-header">
          <div className="pi-layout-header-left">
            <h3>Panel de {usuario.rol}</h3>
          </div>

          <div className="pi-layout-header-right">
            <div 
              className="pi-layout-perfil-btn"
              onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
            >
              <div className="pi-layout-avatar">
                {getIniciales(usuario.nombre || usuario.email)}
              </div>
              <div className="pi-layout-info-perfil">
                <span className="pi-layout-nombre">{usuario.nombre || 'Usuario'}</span>
                <span className="pi-layout-rol-header">{usuario.rol}</span>
              </div>
              <FaChevronDown size={12} color="#666" />
            </div>

            {/* Menú Desplegable del Perfil */}
            {menuPerfilAbierto && (
              <div className="pi-layout-dropdown">
                <div className="pi-layout-dropdown-header">
                  <strong>{usuario.nombre || 'Usuario'}</strong>
                  <span>{usuario.email}</span>
                </div>
                <div className="pi-layout-dropdown-body">
                  <button onClick={() => navigate('#')}>
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

        {/* CONTENIDO DE LA PÁGINA */}
        <main className="pi-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}