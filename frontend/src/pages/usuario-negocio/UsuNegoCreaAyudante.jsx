import { useState, useMemo } from 'react';
import {
  FaPlus, FaTrash, FaTimes, FaImage, FaUsers, FaUpload, FaCheckSquare,
  FaUserTie, FaEnvelope, FaClock, FaSearch, FaEdit, FaSave, FaSquare, FaStore,
  FaMapMarkerAlt
} from 'react-icons/fa';
import './UsuNegoCreaAyudante.css';

const initialStateForm = { id: null, nombre: '', email: '', turno: 'Día', foto: '', puestosAsignados: [] };

export default function UsuNegoCreaAyudante({ allAyudantes, setAllAyudantes, puestos }) {
  const [showModal, setShowModal] = useState(false);
  const [formAyudante, setFormAyudante] = useState(initialStateForm);
  const [busqueda, setBusqueda] = useState('');
  const [ayudanteAsignandoId, setAyudanteAsignandoId] = useState(null);

  const isEditing = formAyudante.id !== null;

  const ayudanteAsignando = allAyudantes.find(a => a.id === ayudanteAsignandoId) || null;

  const abrirAsignarPuestos = (ayudante) => setAyudanteAsignandoId(ayudante.id);
  const cerrarAsignarPuestos = () => setAyudanteAsignandoId(null);

  const toggleAsignacionRapida = (puestoNombre) => {
    setAllAyudantes(allAyudantes.map(a => {
      if (a.id !== ayudanteAsignandoId) return a;
      const tiene = a.puestosAsignados.includes(puestoNombre);
      return {
        ...a,
        puestosAsignados: tiene
          ? a.puestosAsignados.filter(p => p !== puestoNombre)
          : [...a.puestosAsignados, puestoNombre]
      };
    }));
  };

  const handleFormChange = (e) => {
    setFormAyudante({ ...formAyudante, [e.target.name]: e.target.value });
  };

  const handlePuestoToggle = (puestoNombre) => {
    setFormAyudante(prevForm => {
      const currentPuestos = prevForm.puestosAsignados;
      if (currentPuestos.includes(puestoNombre)) {
        return { ...prevForm, puestosAsignados: currentPuestos.filter(p => p !== puestoNombre) };
      } else {
        return { ...prevForm, puestosAsignados: [...currentPuestos, puestoNombre] };
      }
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormAyudante({ ...formAyudante, foto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const quitarImagen = () => setFormAyudante({ ...formAyudante, foto: '' });

  const abrirModalParaCrear = () => {
    setFormAyudante(initialStateForm);
    setShowModal(true);
  };

  const abrirModalParaEditar = (ayudante) => {
    setFormAyudante(ayudante);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setFormAyudante(initialStateForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      // Lógica para actualizar
      setAllAyudantes(allAyudantes.map(a => a.id === formAyudante.id ? formAyudante : a));
    } else {
      // Lógica para crear
      const nuevoAyudante = {
        ...formAyudante,
        id: Date.now(),
      };
      setAllAyudantes([...allAyudantes, nuevoAyudante]);
    }
    cerrarModal();
  };

  const eliminarAyudante = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar a este ayudante? Esta acción no se puede deshacer.')) {
      setAllAyudantes(allAyudantes.filter(a => a.id !== id));
    }
  };

  const ayudantesFiltrados = useMemo(() => {
    return allAyudantes.filter(a =>
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.email.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [allAyudantes, busqueda]);

  return (
    <div className="pi-ayudante-container">
      <div className="pi-ayudante-header-wrapper">
        <div className="pi-ayudante-header">
          <h2>Gestión de Ayudantes</h2>
          <p>Crea, edita y administra el personal que operará en tus puestos de negocio.</p>
        </div>
        <div className="pi-ayudante-kpi">
          <span className="micro-etiqueta">Total de Ayudantes</span>
          <div className="kpi-valor">
            <FaUsers className="kpi-icon" /> {/* Using allAyudantes.length for total count */}
            <span className="numero-grande">{allAyudantes.length}</span>
          </div>
        </div>
      </div>

      <div className="pi-ayudante-action-bar">
        <div className="pi-ayudante-search">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <button className="btn-primario" onClick={abrirModalParaCrear}>
          <FaPlus /> Crear Nuevo Ayudante
        </button>
      </div>

      <div className="pi-ayudante-card">
        <div className="pi-ayudante-table-wrapper">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Ayudante</th>
                <th>Turno</th>
                <th>Puestos Asignados</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ayudantesFiltrados.map(ayudante => (
                <tr key={ayudante.id}>
                  <td>
                    <div className="item-info">
                      {ayudante.foto ? (
                        <img src={ayudante.foto} alt={ayudante.nombre} className="item-img" />
                      ) : (
                        <div className="item-no-img"><FaUserTie /></div>
                      )}
                      <div>
                        <div className="fila-nombre">{ayudante.nombre}</div>
                        <div className="celda-normal">{ayudante.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><div className="celda-normal">{ayudante.turno}</div></td>
                  <td>
                    <div className="badge-sucursal-container">
                      {ayudante.puestosAsignados.length > 0 ? (
                        ayudante.puestosAsignados.map(puesto => (
                          <span key={puesto} className="badge-puesto">{puesto}</span>
                        ))
                      ) : (
                        <span className="badge-sin-puesto">Sin asignar</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-asignar" onClick={() => abrirAsignarPuestos(ayudante)} title="Asignar Puestos">
                        <FaMapMarkerAlt />
                      </button>
                      <button className="btn-editar" onClick={() => abrirModalParaEditar(ayudante)} title="Editar Ayudante">
                        <FaEdit />
                      </button>
                      <button className="btn-eliminar" onClick={() => eliminarAyudante(ayudante.id)} title="Eliminar Ayudante">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ayudantesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="4" className="tabla-vacia">
                    {busqueda ? 'No se encontraron ayudantes.' : 'Aún no has creado ayudantes.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA CREAR/EDITAR AYUDANTE */}
      {showModal && (
        <div className="pi-usr-modal-overlay" onClick={cerrarModal}>
          <div className="pi-usr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pi-usr-modal-header">
              <h3>
                <FaUserTie color="var(--indigo-profundo)" />
                {isEditing ? 'Editar Ayudante' : 'Registrar Nuevo Ayudante'}
              </h3>
              <button className="pi-usr-btn-cerrar-modal" onClick={cerrarModal}>
                <FaTimes />
              </button>
            </div>
            <div className="pi-usr-modal-body">
              <form onSubmit={handleSubmit} className="formulario">
                <div className="input-group">
                  <label><FaUserTie /> Nombre Completo</label>
                  <input type="text" name="nombre" value={formAyudante.nombre} onChange={handleFormChange} placeholder="Ej: Juan Pérez" required />
                </div>
                <div className="input-group">
                  <label><FaEnvelope /> Correo Electrónico</label>
                  <input type="email" name="email" value={formAyudante.email} onChange={handleFormChange} placeholder="Ej: juan.perez@email.com" required />
                </div>
                <div className="input-group">
                  <label><FaClock /> Turno de Trabajo</label>
                  <select name="turno" value={formAyudante.turno} onChange={handleFormChange} className="input-wrapper">
                    <option value="Día">Día</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                    <option value="Completo">Tiempo Completo</option>
                  </select>
                </div>

                <div className="input-group">
                  <label><FaStore /> Puestos Asignados (Opcional)</label>
                  <div className="checkbox-grid">
                    {puestos.map(puesto => (
                      <label key={puesto.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={formAyudante.puestosAsignados.includes(puesto.nombre)}
                          onChange={() => handlePuestoToggle(puesto.nombre)}
                        />
                        {formAyudante.puestosAsignados.includes(puesto.nombre) ? <FaCheckSquare /> : <FaSquare />}
                        {puesto.nombre}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label><FaImage /> Foto de Perfil (Opcional)</label>
                  {!formAyudante.foto ? (
                    <div className="upload-zone">
                      <FaUpload className="upload-icon" />
                      <span className="upload-text">Haz clic para subir una foto</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" />
                    </div>
                  ) : (
                    <div className="preview-zone">
                      <img src={formAyudante.foto} alt="Vista previa" className="img-preview-avatar" />
                      <button type="button" className="btn-quitar-imagen" onClick={quitarImagen}><FaTimes /> Quitar foto</button>
                    </div>
                  )}
                </div>
                <div className="pi-usr-modal-acciones">
                  <button type="button" className="btn-cerrar-secundario" onClick={cerrarModal}>Cancelar</button>
                  <button type="submit" className="pi-usr-btn-enviar">
                    <FaSave /> {isEditing ? 'Guardar Cambios' : 'Crear Ayudante'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO: ASIGNAR PUESTOS */}
      {ayudanteAsignando && (
        <div className="pi-usr-modal-overlay" onClick={cerrarAsignarPuestos}>
          <div className="pi-usr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pi-usr-modal-header">
              <h3>
                <FaMapMarkerAlt color="var(--indigo-profundo)" />
                Asignar Puestos: {ayudanteAsignando.nombre}
              </h3>
              <button className="pi-usr-btn-cerrar-modal" onClick={cerrarAsignarPuestos}>
                <FaTimes />
              </button>
            </div>
            <div className="pi-usr-modal-body">
              <p className="pi-ayudante-nota">
                Marca en qué puestos puede trabajar. Los cambios se guardan al instante.
              </p>
              <div className="checkbox-grid">
                {puestos.map(puesto => (
                  <label key={puesto.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={ayudanteAsignando.puestosAsignados.includes(puesto.nombre)}
                      onChange={() => toggleAsignacionRapida(puesto.nombre)}
                    />
                    {ayudanteAsignando.puestosAsignados.includes(puesto.nombre) ? <FaCheckSquare /> : <FaSquare />}
                    {puesto.nombre}
                  </label>
                ))}
                {puestos.length === 0 && (
                  <p className="tabla-vacia">Aún no has creado puestos.</p>
                )}
              </div>
              <div className="pi-usr-modal-acciones">
                <button type="button" className="pi-usr-btn-enviar" onClick={cerrarAsignarPuestos}>Listo</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}