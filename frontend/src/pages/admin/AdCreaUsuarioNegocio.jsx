import { useCallback, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaUserTie, FaEnvelope, FaLock, FaPlus,
  FaTrash, FaUserShield, FaUsersCog
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

  // Opciones del filtro por rol, con su conteo (para las pastillas del <Buscador>).
  const filtrosRol = useMemo(() => {
    const m = {};
    usuarios.forEach(u => { m[u.rol] = (m[u.rol] || 0) + 1; });
    return [
      { valor: 'Todos', texto: 'Todos', conteo: usuarios.length },
      ...ROLES.map(rol => ({ valor: rol, texto: ROLE_LABELS[rol] || rol, conteo: m[rol] || 0 })),
    ];
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

      <Buscador
        valor={searchTerm}
        onCambio={setSearchTerm}
        placeholder="Buscar usuario por nombre o correo…"
        etiqueta="Buscar usuario por nombre o correo"
        filtros={filtrosRol}
        filtroActivo={filtroRol}
        onFiltro={setFiltroRol}
        etiquetaFiltros="Filtrar por rol"
        acciones={
          <button type="button" className="pi-adnegocio-btn-add" onClick={() => setShowModal(true)}>
            <FaPlus /> Nuevo Usuario
          </button>
        }
      />

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
        <Tabla
          columnas={['Usuario', 'Contacto', 'Rol / Tipo', 'CI / Celular', { texto: 'Acción', align: 'center' }]}
          datos={usuariosFiltrados}
          vacio="No se encontraron usuarios en esta categoría o búsqueda."
          renderFila={user => (
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
          )}
        />
      </div>
      )}

      {/* --- MODAL (VENTANA EMERGENTE) PARA CREAR --- */}
      {showModal && (
        <Modal
          titulo={<><FaUsersCog color="var(--indigo-profundo)" aria-hidden="true" /> Registrar Nuevo Usuario</>}
          onCerrar={() => setShowModal(false)}
          tamano="md"
          className="pi-adnegocio-modal"
        >
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
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}