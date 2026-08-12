import { useState } from 'react';
import { 
  FaUserTie, FaPlus, FaTrash, FaTimes, FaSearch, 
  FaEnvelope, FaLock, FaStore, FaUserShield, FaUsers,
  FaImage, FaUpload
} from 'react-icons/fa';
import './UsuNegoCreaAyudante.css';

// 1. Simulamos los puestos que el dueño ya creó
const mockPuestosUsuario = [
  { id: 1, nombre: 'Pizzas El Paso' },
  { id: 2, nombre: 'Pollos Doña María' }
];

// 2. Simulamos los ayudantes que ya están registrados
const mockAyudantes = [
  {
    id: 101,
    nombre: 'Pedro Gómez',
    email: 'pedro@ayudante.com',
    puestoAsignado: 'Pizzas El Paso',
    idPuesto: 1,
    foto: 'https://i.pravatar.cc/300?img=11'
  },
  {
    id: 102,
    nombre: 'Lucía Vargas',
    email: 'lucia.v@ayudante.com',
    puestoAsignado: 'Pollos Doña María',
    idPuesto: 2,
    foto: 'https://i.pravatar.cc/300?img=5'
  }
];

export default function UsuNegoCreaAyudante() {
  const [ayudantes, setAyudantes] = useState(mockAyudantes);
  const [puestos] = useState(mockPuestosUsuario);
  
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Añadimos el campo "foto" al estado inicial
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    idPuesto: '',
    foto: '' 
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- LÓGICA DE SUBIDA DE IMAGEN (Foto de Perfil) ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, foto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const quitarImagen = () => {
    setFormData({ ...formData, foto: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const puestoSeleccionado = puestos.find(p => p.id.toString() === formData.idPuesto);
    
    if (!puestoSeleccionado) {
      alert("Por favor, selecciona un puesto válido.");
      return;
    }

    const nuevoAyudante = {
      id: Date.now(),
      nombre: formData.nombre,
      email: formData.email,
      puestoAsignado: puestoSeleccionado.nombre,
      idPuesto: puestoSeleccionado.id,
      foto: formData.foto || null // Guardamos la foto subida
    };

    setAyudantes([nuevoAyudante, ...ayudantes]);
    setFormData({ nombre: '', email: '', password: '', idPuesto: '', foto: '' });
    setShowModal(false);
  };

  const eliminarAyudante = (id) => {
    if(window.confirm('¿Estás seguro de eliminar a este ayudante y revocar su acceso?')) {
      setAyudantes(ayudantes.filter(ayu => ayu.id !== id));
    }
  };

  const ayudantesFiltrados = ayudantes.filter(ayu => 
    ayu.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ayu.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ayu.puestoAsignado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pi-ayudante-container">
      
      {/* Cabecera y KPI */}
      <div className="pi-ayudante-header-wrapper">
        <div className="pi-ayudante-header">
          <h2>Gestión de Ayudantes</h2>
          <p>Crea las cuentas de acceso para tu personal y asígnalos a tus puestos.</p>
        </div>
        
        <div className="pi-ayudante-kpi">
          <span className="micro-etiqueta">Total de Ayudantes</span>
          <div className="kpi-valor">
            <FaUsers className="kpi-icon" />
            <span className="numero-grande">{ayudantes.length}</span>
          </div>
        </div>
      </div>

      <div className="pi-ayudante-action-bar">
        <div className="pi-ayudante-search">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o puesto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button className="btn-primario" onClick={() => setShowModal(true)}>
          <FaPlus /> Nuevo Ayudante
        </button>
      </div>

      {/* Tabla Principal */}
      <div className="pi-ayudante-card">
        <div className="pi-ayudante-table-wrapper">
          <table className="pi-ayudante-table">
            <thead>
              <tr>
                <th>Datos del Ayudante</th>
                <th>Correo de Acceso</th>
                <th>Puesto Asignado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ayudantesFiltrados.map(ayu => (
                <tr key={ayu.id}>
                  <td>
                    <div className="item-info">
                      {ayu.foto ? (
                        <img src={ayu.foto} alt="Perfil" className="item-img" />
                      ) : (
                        <div className="item-no-img"><FaUserTie /></div>
                      )}
                      <span className="fila-nombre">{ayu.nombre}</span>
                    </div>
                  </td>
                  <td>
                    <span className="celda-normal">{ayu.email}</span>
                  </td>
                  <td>
                    <span className="badge-puesto">
                      <FaStore style={{ marginRight: '6px' }} />
                      {ayu.puestoAsignado}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn-eliminar" 
                      onClick={() => eliminarAyudante(ayu.id)}
                      title="Eliminar Cuenta"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {ayudantesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="4" className="tabla-vacia">
                    No se encontraron ayudantes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================
          MODAL: CREAR NUEVO AYUDANTE
      ========================================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            
            <div className="modal-header">
              <h2><FaUserShield color="var(--indigo-profundo)" /> Registrar Ayudante</h2>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <p className="texto-ayuda">
                Genera los accesos de tu trabajador. Al asignar un puesto, el ayudante solo tendrá acceso a cobrar los productos de ese catálogo.
              </p>

              <form onSubmit={handleSubmit} className="formulario">
                
                <div className="input-group">
                  <label>Nombre Completo</label>
                  <div className="input-wrapper">
                    <FaUserTie className="input-icon" />
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Correo Electrónico (Para iniciar sesión)</label>
                  <div className="input-wrapper">
                    <FaEnvelope className="input-icon" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="juan@ejemplo.com" required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Contraseña Temporal</label>
                  <div className="input-wrapper">
                    <FaLock className="input-icon" />
                    <input type="text" name="password" value={formData.password} onChange={handleChange} placeholder="Ej: 123456" required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Asignar a Puesto</label>
                  <div className="input-wrapper">
                    <FaStore className="input-icon" />
                    <select name="idPuesto" value={formData.idPuesto} onChange={handleChange} className="pi-select-rol" required>
                      <option value="" disabled>-- Selecciona un puesto --</option>
                      {puestos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* --- NUEVO: SUBIDA DE FOTO DE PERFIL --- */}
                <div className="input-group">
                  <label><FaImage style={{marginRight: '6px'}}/> Foto de Perfil (Opcional)</label>
                  {!formData.foto ? (
                    <div className="upload-zone">
                      <FaUpload className="upload-icon" />
                      <span className="upload-text">Haz clic para subir una foto</span>
                      <span className="upload-subtext">PNG, JPG (Recomendado formato cuadrado)</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" />
                    </div>
                  ) : (
                    <div className="preview-zone">
                      <img src={formData.foto} alt="Vista previa" className="img-preview-avatar" />
                      <button type="button" className="btn-quitar-imagen" onClick={quitarImagen}>
                        <FaTimes /> Quitar imagen
                      </button>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primario">
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