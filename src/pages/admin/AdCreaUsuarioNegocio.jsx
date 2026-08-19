import { useState } from 'react';
import {
  FaStore, FaUserTie, FaEnvelope, FaLock, FaPlus,
  FaTrash, FaSearch, FaTimes, FaUserShield, FaUsersCog
} from 'react-icons/fa';
import { ROLES, leerUsuarios, guardarUsuarios } from '../../data/usuarios';
import './AdCreaUsuarioNegocio.css';

export default function AdCreaUsuarioNegocio() {
  const [usuarios, setUsuarios] = useState(leerUsuarios);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filtroRol, setFiltroRol] = useState('Todos'); 
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'UsuarioNegocio' 
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
      recaudado: 0
    };

    const actualizados = [nuevoUsuario, ...usuarios];
    setUsuarios(actualizados);
    guardarUsuarios(actualizados);
    setFormData({ nombre: '', email: '', password: '', rol: 'UsuarioNegocio' });
    setShowModal(false);
  };

  const eliminarUsuario = (id) => {
    if(window.confirm('¿Estás seguro de eliminar a este usuario del sistema?')) {
      const actualizados = usuarios.filter(u => u.id !== id);
      setUsuarios(actualizados);
      guardarUsuarios(actualizados);
    }
  };

  // Filtrado
  let usuariosFiltrados = filtroRol === 'Todos' 
    ? usuarios 
    : usuarios.filter(u => u.rol === filtroRol);

  usuariosFiltrados = usuariosFiltrados.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      
      {/* Cabecera y KPI */}
      <div className="pi-adnegocio-header-wrapper">
        <div className="pi-adnegocio-header">
          <h2>Gestión Global de Usuarios</h2>
          <p>Administra, crea y filtra todas las cuentas operativas y clientes del sistema.</p>
        </div>
        
        {/* KPI Estilo QPass */}

      </div>

      <div className="pi-adnegocio-action-bar">
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

        <button className="pi-adnegocio-btn-add" onClick={() => setShowModal(true)}>
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div className="pi-adnegocio-search">
        <FaSearch className="search-icon" />
        <input 
          type="text" 
          placeholder="Buscar por nombre o correo electrónico..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla Principal */}
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
                      <span className="fila-nombre">
                        {user.nombre}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="celda-normal">{user.email}</span>
                  </td>
                  <td>
                    <span className={`pi-adnegocio-badge ${getBadgeColor(user.rol)}`}>
                      {user.rol}
                    </span>
                  </td>
                  <td>
                    <span className="celda-secundaria">
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
              <h2><FaUsersCog color="var(--indigo-profundo)" /> Registrar Nuevo Usuario</h2>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="pi-adnegocio-modal-body">
              <p className="pi-adnegocio-hint">
                Asigna el rol correcto. El sistema adaptará los accesos y paneles automáticamente.
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