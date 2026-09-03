import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaUserTie, FaEnvelope, FaLock, FaPlus,
  FaTrash, FaSearch, FaTimes, FaUserShield, FaUsersCog
} from 'react-icons/fa';
import { ROLE_LABELS } from '../../constants/roles.js';
import api from '../../api/index.js';
import './AdCreaUsuarioNegocio.css';

const ROLES = ['Cliente', 'Recargador', 'Supervisor', 'Devolucion', 'UsuarioNormal', 'UsuarioNegocio'];

export default function AdCreaUsuarioNegocio() {
  useTituloPagina('Gestión de Usuarios');

  // Lista de usuarios con estados cargando/error/reintentar (Manual 8.9).
  const cargarUsuarios = useCallback(() => api.usuarios.listar(), []);
  const {
    data: usuarios,
    setData: setUsuarios,
    cargando: cargandoUsuarios,
    error: errorUsuarios,
    recargar: recargarUsuarios,
  } = useApi(cargarUsuarios, { inicial: [] });

  const [showModal, setShowModal] = useState(false);
  const [confirmar, DialogoConfirmar] = useConfirmar();

  // Foco del modal de crear usuario (A1 / Manual 8.6)
  const modalCrearUsuRef = useRef(null);
  useFocoModal(modalCrearUsuRef, showModal);

  // Modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  useEffect(() => {
    if (!showModal) return;
    const alTecla = (e) => { if (e.key === "Escape") setShowModal(false); };
    window.addEventListener("keydown", alTecla);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", alTecla); document.body.style.overflow = ""; };
  }, [showModal]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.auth.registro(formData);
    await recargarUsuarios();
    setFormData({ nombre: '', email: '', password: '', rol: 'UsuarioNegocio' });
    setShowModal(false);
  };

  const eliminarUsuario = async (id) => {
    const ok = await confirmar({
      titulo: '¿Eliminar usuario?',
      mensaje: 'Se eliminará a este usuario del sistema. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar usuario',
      peligroso: true,
    });
    if (!ok) return;
    await api.usuarios.eliminar(id);
    setUsuarios(prev => prev.filter(u => u.id !== id));
  };

  // Conteo por rol para las pestañas de filtro.
  const conteoPorRol = useMemo(() => {
    const m = {};
    usuarios.forEach(u => { m[u.rol] = (m[u.rol] || 0) + 1; });
    return m;
  }, [usuarios]);

  // Filtrado: rol + texto (nombre / correo).
  const usuariosFiltrados = useMemo(() => {
    const termino = searchTerm.trim().toLowerCase();
    return usuarios
      .filter(u => filtroRol === 'Todos' || u.rol === filtroRol)
      .filter(u =>
        !termino ||
        u.nombre.toLowerCase().includes(termino) ||
        u.email.toLowerCase().includes(termino)
      );
  }, [usuarios, filtroRol, searchTerm]);

  const hayFiltro = searchTerm.trim() !== '' || filtroRol !== 'Todos';

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
          <h1>Gestión global de usuarios</h1>
          <p>Administra, crea y filtra todas las cuentas operativas y clientes del sistema.</p>
        </div>
        
        {/* KPI Estilo QPass */}

      </div>

      {/* Buscador destacado */}
      <div className="pi-adnegocio-buscador-destacado">
        <FaSearch className="bd-icon" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar usuario por nombre o correo"
          placeholder="Buscar usuario por nombre o correo…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button type="button" className="bd-clear" onClick={() => setSearchTerm('')} aria-label="Limpiar búsqueda">
            <FaTimes aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="pi-adnegocio-action-bar">
        {/* Pestañas de Filtro por Rol (con conteo) */}
        <div className="pi-adnegocio-tabs" role="group" aria-label="Filtrar por rol">
          <button type="button"
            className={`tab-btn ${filtroRol === 'Todos' ? 'active' : ''}`}
            aria-pressed={filtroRol === 'Todos'}
            onClick={() => setFiltroRol('Todos')}
          >
            Todos <span className="tab-count">{usuarios.length}</span>
          </button>
          {ROLES.map(rol => (
            <button type="button"
              key={rol}
              className={`tab-btn ${filtroRol === rol ? 'active' : ''}`}
              aria-pressed={filtroRol === rol}
              onClick={() => setFiltroRol(rol)}
            >
              {ROLE_LABELS[rol] || rol} <span className="tab-count">{conteoPorRol[rol] || 0}</span>
            </button>
          ))}
        </div>

        <button type="button" className="pi-adnegocio-btn-add" onClick={() => setShowModal(true)}>
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      {hayFiltro && (
        <p className="pi-adnegocio-resultados">
          {usuariosFiltrados.length} usuario{usuariosFiltrados.length === 1 ? '' : 's'} encontrado{usuariosFiltrados.length === 1 ? '' : 's'}
          {filtroRol !== 'Todos' && ` · rol: ${ROLE_LABELS[filtroRol] || filtroRol}`}
        </p>
      )}

      {/* Tabla Principal */}
      {errorUsuarios ? (
        <EstadoError onReintentar={recargarUsuarios} />
      ) : cargandoUsuarios ? (
        <EstadoCarga filas={5} />
      ) : (
      <div className="pi-adnegocio-card pi-adnegocio-list-section">
        <div className="pi-adnegocio-table-wrapper">
          <table className="pi-adnegocio-table">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Contacto</th>
                <th scope="col">Rol / Tipo</th>
                <th scope="col">CI / Celular</th>
                <th scope="col" style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="pi-adnegocio-item-info">
                      {user.foto ? (
                        <img width="40" height="40" src={user.foto} alt="Perfil" className="pi-adnegocio-img" />
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
                      {user.ci || user.celular || '-'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" 
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
      )}

      {/* --- MODAL (VENTANA EMERGENTE) PARA CREAR --- */}
      {showModal && (
        <div className="pi-adnegocio-modal-overlay" onClick={() => setShowModal(false)}>
          <div ref={modalCrearUsuRef} tabIndex={-1} className="pi-adnegocio-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="adneg-modal-titulo">
            
            <div className="pi-adnegocio-modal-header">
              <h2 id="adneg-modal-titulo"><FaUsersCog color="var(--indigo-profundo)" aria-hidden="true" /> Registrar Nuevo Usuario</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowModal(false)} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <div className="pi-adnegocio-modal-body">
              <p className="pi-adnegocio-hint">
                Asigna el rol correcto. El sistema adaptará los accesos y paneles automáticamente.
              </p>

              <form onSubmit={handleSubmit} className="pi-adnegocio-form">
                
                <div className="pi-adnegocio-input-group">
                  <label htmlFor="adneg-rol">Tipo de cuenta (rol)</label>
                  <div className="input-wrapper">
                    <FaUserShield className="input-icon" />
                    <select 
                      id="adneg-rol"
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
                  <label htmlFor="adneg-nombre">Nombre completo / encargado</label>
                  <div className="input-wrapper">
                    <FaUserTie className="input-icon" />
                    <input 
                      type="text" 
                      id="adneg-nombre"
                      autoComplete="name"
                      name="nombre"
                      value={formData.nombre} 
                      onChange={handleChange} 
                      placeholder="Ej: Juan Pérez" 
                      required 
                    />
                  </div>
                </div>

                <div className="pi-adnegocio-input-group">
                  <label htmlFor="adneg-email">Correo electrónico</label>
                  <div className="input-wrapper">
                    <FaEnvelope className="input-icon" />
                    <input 
                      type="email" 
                      id="adneg-email"
                      autoComplete="email"
                      name="email"
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="juan@correo.com" 
                      required 
                    />
                  </div>
                </div>

                <div className="pi-adnegocio-input-group">
                  <label htmlFor="adneg-password">Contraseña temporal</label>
                  <div className="input-wrapper">
                    <FaLock className="input-icon" />
                    <input 
                      type="text" 
                      id="adneg-password"
                      autoComplete="new-password"
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

      {DialogoConfirmar}
    </div>
  );
}