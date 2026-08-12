import { useState } from 'react';
import { 
  FaStore, FaUserTie, FaEnvelope, FaLock, FaPlus, 
  FaTrash, FaSearch, FaTimes, FaUserShield, FaUsersCog
} from 'react-icons/fa';
import './AdCreaUsuarioNegocio.css';

// Lista de roles permitidos
const ROLES = ['Cliente', 'Recargador', 'Supervisor', 'Devolucion', 'UsuarioNormal', 'UsuarioNegocio'];

const mockUsuarios = [
  {
    id: 1,
    nombre: 'María Fernández',
    email: 'maria@fiesta.com',
    rol: 'UsuarioNegocio',
    extraInfo: 'Pollos Doña María', // Para negocios es el puesto
    foto: 'https://images.unsplash.com/photo-1626082896492-766af4eb65ed?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 2,
    nombre: 'Carlos Ruiz',
    email: 'carlos.r@evento.com',
    rol: 'Supervisor',
    extraInfo: 'Turno Mañana',
    foto: null,
  },
  {
    id: 3,
    nombre: 'Ana López',
    email: 'ana.recarga@evento.com',
    rol: 'Recargador',
    extraInfo: 'Caja Principal 01',
    foto: null,
  },
  {
    id: 4,
    nombre: 'Luis Gómez',
    email: 'luis.cliente@correo.com',
    rol: 'Cliente',
    extraInfo: '',
    foto: null,
  }
];

export default function AdCreaUsuarioNegocio() {
  const [usuarios, setUsuarios] = useState(mockUsuarios);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filtroRol, setFiltroRol] = useState('Todos'); // 'Todos' o un rol específico
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'UsuarioNegocio' // Por defecto
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nuevoUsuario = {
      id: Date.now(),
      nombre: formData.nombre,
      email: formData.email,
      rol: formData.rol,
      extraInfo: formData.rol === 'UsuarioNegocio' ? 'Pendiente de configurar...' : 'Sin asignar', 
      foto: null, 
    };

    setUsuarios([nuevoUsuario, ...usuarios]);
    setFormData({ nombre: '', email: '', password: '', rol: 'UsuarioNegocio' });
    setShowModal(false); 
  };

  const eliminarUsuario = (id) => {
    if(window.confirm('¿Estás seguro de eliminar a este usuario del sistema?')) {
      setUsuarios(usuarios.filter(u => u.id !== id));
    }
  };

  // 1. Filtrar por Rol (Pestañas)
  let usuariosFiltrados = filtroRol === 'Todos' 
    ? usuarios 
    : usuarios.filter(u => u.rol === filtroRol);

  // 2. Filtrar por Búsqueda (Texto)
  usuariosFiltrados = usuariosFiltrados.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para dar color a la etiqueta del rol
  const getBadgeColor = (rol) => {
    switch(rol) {
      case 'Supervisor': return 'badge-supervisor';
      case 'Recargador': return 'badge-recargador';
      case 'UsuarioNegocio': return 'badge-negocio';
      case 'Devolucion': return 'badge-devolucion';
      case 'Cliente': 
      case 'UsuarioNormal': return 'badge-cliente';
      default: return 'badge-default';
    }
  };

  return (
    <div className="pi-adnegocio-container">
      
      {/* Cabecera */}
      <div className="pi-adnegocio-header">
        <div>
          <h2>Gestión Global de Usuarios</h2>
          <p>Administra, crea y filtra todas las cuentas operativas y clientes del sistema.</p>
        </div>
        <button className="pi-adnegocio-btn-add" onClick={() => setShowModal(true)}>
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      {/* Pestañas de Filtro por Rol */}
      <div className="pi-adnegocio-tabs">
        <button 
          className={`tab-btn ${filtroRol === 'Todos' ? 'active' : ''}`}
          onClick={() => setFiltroRol('Todos')}
        >
          Todos ({usuarios.length})
        </button>
        {ROLES.map(rol => (
          <button 
            key={rol}
            className={`tab-btn ${filtroRol === rol ? 'active' : ''}`}
            onClick={() => setFiltroRol(rol)}
          >
            {rol}
          </button>
        ))}
      </div>

      {/* Barra de Búsqueda */}
      <div className="pi-adnegocio-action-bar">
        <div className="pi-adnegocio-search">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo electrónico..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla Principal Dinámica */}
      <div className="pi-adnegocio-card pi-adnegocio-list-section">
        <div className="pi-adnegocio-table-wrapper">
          <table className="pi-adnegocio-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Contacto</th>
                <th>Rol / Tipo</th>
                <th>Detalles Extras</th>
                <th style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="pi-adnegocio-item-info">
                      {user.foto ? (
                        <img src={user.foto} alt="Perfil" className="pi-adnegocio-img" />
                      ) : (
                        <div className="pi-adnegocio-no-img">
                          {user.rol === 'UsuarioNegocio' ? <FaStore /> : <FaUserTie />}
                        </div>
                      )}
                      <span className="pi-adnegocio-nombre-puesto">
                        {user.nombre}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="pi-adnegocio-email">{user.email}</span>
                  </td>
                  <td>
                    <span className={`pi-adnegocio-badge ${getBadgeColor(user.rol)}`}>
                      {user.rol}
                    </span>
                  </td>
                  <td>
                    <span className="pi-adnegocio-extra">
                      {user.extraInfo || '-'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="pi-adnegocio-btn-delete"
                      onClick={() => eliminarUsuario(user.id)}
                      title="Eliminar Cuenta"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" className="pi-adnegocio-empty">
                    No se encontraron usuarios en esta categoría o búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL (VENTANA EMERGENTE) PARA CREAR --- */}
      {showModal && (
        <div className="pi-adnegocio-modal-overlay">
          <div className="pi-adnegocio-modal">
            
            <div className="pi-adnegocio-modal-header">
              <h3><FaUsersCog color="#0284c7" /> Registrar Nuevo Usuario</h3>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="pi-adnegocio-modal-body">
              <p className="pi-adnegocio-hint">
                Asigna el rol correcto. El sistema adaptará los accesos y paneles automáticamente según el tipo de cuenta.
              </p>

              <form onSubmit={handleSubmit} className="pi-adnegocio-form">
                
                <div className="pi-adnegocio-input-group">
                  <label>Tipo de Cuenta (Rol)</label>
                  <div className="input-wrapper">
                    <FaUserShield className="input-icon" />
                    <select 
                      name="rol" 
                      value={formData.rol} 
                      onChange={handleChange}
                      className="pi-select-rol"
                    >
                      {ROLES.map(rol => (
                        <option key={rol} value={rol}>{rol}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pi-adnegocio-input-group">
                  <label>Nombre Completo / Encargado</label>
                  <div className="input-wrapper">
                    <FaUserTie className="input-icon" />
                    <input 
                      type="text" 
                      name="nombre"
                      value={formData.nombre} 
                      onChange={handleChange} 
                      placeholder="Ej: Juan Pérez" 
                      required 
                    />
                  </div>
                </div>

                <div className="pi-adnegocio-input-group">
                  <label>Correo Electrónico</label>
                  <div className="input-wrapper">
                    <FaEnvelope className="input-icon" />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="juan@correo.com" 
                      required 
                    />
                  </div>
                </div>

                <div className="pi-adnegocio-input-group">
                  <label>Contraseña Temporal</label>
                  <div className="input-wrapper">
                    <FaLock className="input-icon" />
                    <input 
                      type="text" 
                      name="password"
                      value={formData.password} 
                      onChange={handleChange} 
                      placeholder="Ej: 123456" 
                      required 
                    />
                  </div>
                </div>

                <div className="pi-adnegocio-modal-actions">
                  <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-guardar">
                    Crear Cuenta
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}