import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaPlus, FaTrash, FaTimes, FaImage, FaUsers, FaUpload, FaCheckSquare,
  FaUserTie, FaEnvelope, FaLock, FaSearch, FaSave, FaSquare, FaStore,
  FaMapMarkerAlt
} from 'react-icons/fa';
import api from '../../api/index.js';
import { ROLES } from '../../constants/roles.js';
import './UsuNegoCreaAyudante.css';

const initialStateForm = { nombre: '', email: '', password: '', foto: '', puestosAsignados: [] };

export default function UsuNegoCreaAyudante({ puestos, onCambio }) {
  const [showModal, setShowModal] = useState(false);
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const [formAyudante, setFormAyudante] = useState(initialStateForm);
  const [busqueda, setBusqueda] = useState('');
  const [ayudanteAsignandoId, setAyudanteAsignandoId] = useState(null);

  // No hay un endpoint "mis ayudantes"; se arma juntando las asignaciones de cada
  // uno de mis puestos. Con estados cargando/error/reintentar (Manual 8.9).
  const cargarAyudantes = useCallback(async () => {
    const listas = await Promise.all(puestos.map(p => api.puestoAyudantes.listar({ puestoId: p.id })));
    const porAyudante = new Map();
    listas.flat().forEach(asig => {
      const actual = porAyudante.get(asig.ayudante.id) || { ...asig.ayudante, asignaciones: [] };
      actual.asignaciones.push({ id: asig.id, puestoId: asig.puestoId, turno: asig.turno, puestoNombre: puestos.find(p => p.id === asig.puestoId)?.nombre });
      porAyudante.set(asig.ayudante.id, actual);
    });
    return porAyudante;
  }, [puestos]);
  const {
    data: asignacionesPorAyudante,
    cargando: cargandoAyudantes,
    error: errorAyudantes,
    recargar: recargarAyudantes,
  } = useApi(cargarAyudantes, { inicial: new Map(), activo: puestos.length > 0 });

  const ayudantes = useMemo(() => [...asignacionesPorAyudante.values()], [asignacionesPorAyudante]);

  const ayudanteAsignando = ayudantes.find(a => a.id === ayudanteAsignandoId) || null;

  const abrirAsignarPuestos = (ayudante) => setAyudanteAsignandoId(ayudante.id);
  const cerrarAsignarPuestos = () => setAyudanteAsignandoId(null);

  const toggleAsignacionRapida = async (puesto) => {
    const existente = ayudanteAsignando.asignaciones.find(a => a.puestoId === puesto.id);
    if (existente) {
      await api.puestoAyudantes.quitar(existente.id);
    } else {
      await api.puestoAyudantes.asignar({ puestoId: puesto.id, ayudanteId: ayudanteAsignando.id });
    }
    await recargarAyudantes();
    onCambio?.();
  };

  const handleFormChange = (e) => {
    setFormAyudante({ ...formAyudante, [e.target.name]: e.target.value });
  };

  const handlePuestoToggle = (puestoId) => {
    setFormAyudante(prevForm => {
      const actual = prevForm.puestosAsignados;
      return {
        ...prevForm,
        puestosAsignados: actual.includes(puestoId) ? actual.filter(p => p !== puestoId) : [...actual, puestoId],
      };
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

  const cerrarModal = () => {
    setShowModal(false);
    setFormAyudante(initialStateForm);
  };

  // Modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  const hayModalAbierto = showModal || ayudanteAsignandoId != null;

  // Foco de cada modal (A1 / Manual 8.6): entra al abrir, atrapado con Tab, vuelve al disparador al cerrar.
  const modalCrearRef = useRef(null);
  const modalAsignarRef = useRef(null);
  useFocoModal(modalCrearRef, showModal);
  useFocoModal(modalAsignarRef, ayudanteAsignandoId != null);
  useEffect(() => {
    if (!hayModalAbierto) return;
    const alTecla = (e) => {
      if (e.key !== 'Escape') return;
      cerrarModal();
      cerrarAsignarPuestos();
    };
    window.addEventListener('keydown', alTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTecla);
      document.body.style.overflow = '';
    };
  }, [hayModalAbierto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nuevo = await api.auth.registro({
      rol: ROLES.AYUDANTE, nombre: formAyudante.nombre, email: formAyudante.email,
      password: formAyudante.password, foto: formAyudante.foto || undefined,
    });
    await Promise.all(formAyudante.puestosAsignados.map(puestoId =>
      api.puestoAyudantes.asignar({ puestoId, ayudanteId: nuevo.id })
    ));
    await recargarAyudantes();
    onCambio?.();
    cerrarModal();
  };

  const eliminarAyudante = async (ayudante) => {
    const ok = await confirmar({
      titulo: '¿Quitar al ayudante?',
      mensaje: 'Dejará de estar asignado a todos tus puestos. Su cuenta de usuario no se elimina.',
      textoConfirmar: 'Quitar de mis puestos',
      peligroso: true,
    });
    if (!ok) return;
    await Promise.all(ayudante.asignaciones.map(a => api.puestoAyudantes.quitar(a.id)));
    await recargarAyudantes();
    onCambio?.();
  };

  const ayudantesFiltrados = useMemo(() => {
    return ayudantes.filter(a =>
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.email.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [ayudantes, busqueda]);

  return (
    <div className="pi-ayudante-container">
      <div className="pi-ayudante-header-wrapper">
        <div className="pi-ayudante-header">
          <h1>Gestión de ayudantes</h1>
          <p>Crea, edita y administra el personal que operará en tus puestos de negocio.</p>
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
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <button type="button" className="btn-primario" onClick={abrirModalParaCrear} disabled={puestos.length === 0}>
          <FaPlus /> Crear Nuevo Ayudante
        </button>
      </div>
      {puestos.length === 0 && (
        <p className="pi-ayudante-nota">Crea al menos un puesto para este evento antes de agregar ayudantes.</p>
      )}

      {errorAyudantes ? (
        <EstadoError onReintentar={recargarAyudantes} />
      ) : cargandoAyudantes ? (
        <EstadoCarga filas={4} />
      ) : (
      <div className="pi-ayudante-card">
        <div className="pi-ayudante-table-wrapper">
          <table className="clean-table">
            <thead>
              <tr>
                <th scope="col">Ayudante</th>
                <th scope="col">Puestos Asignados</th>
                <th scope="col" style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ayudantesFiltrados.map(ayudante => (
                <tr key={ayudante.id}>
                  <td>
                    <div className="item-info">
                      {ayudante.foto ? (
                        <img width="48" height="48" src={ayudante.foto} alt={ayudante.nombre} className="item-img" />
                      ) : (
                        <div className="item-no-img"><FaUserTie /></div>
                      )}
                      <div>
                        <div className="fila-nombre">{ayudante.nombre}</div>
                        <div className="celda-normal">{ayudante.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="badge-sucursal-container">
                      {ayudante.asignaciones.length > 0 ? (
                        ayudante.asignaciones.map(a => (
                          <span key={a.id} className="badge-puesto">{a.puestoNombre}</span>
                        ))
                      ) : (
                        <span className="badge-sin-puesto">Sin asignar</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-asignar" onClick={() => abrirAsignarPuestos(ayudante)} aria-label={`Asignar puestos a ${ayudante.nombre}`}>
                        <FaMapMarkerAlt />
                      </button>
                      <button type="button" className="btn-eliminar" onClick={() => eliminarAyudante(ayudante)} aria-label={`Quitar a ${ayudante.nombre} de mis puestos`}>
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ayudantesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="3" className="tabla-vacia">
                    {busqueda ? 'No se encontraron ayudantes.' : 'Aún no has creado ayudantes.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* MODAL PARA CREAR AYUDANTE */}
      {showModal && (
        <div className="pi-usr-modal-overlay" onClick={cerrarModal}>
          <div
            ref={modalCrearRef}
            tabIndex={-1}
            className="pi-usr-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crea-ayu-titulo"
          >
            <div className="pi-usr-modal-header">
              <h3 id="crea-ayu-titulo">
                <FaUserTie color="var(--indigo-profundo)" aria-hidden="true" />
                Registrar Nuevo Ayudante
              </h3>
              <button type="button" className="pi-usr-btn-cerrar-modal" onClick={cerrarModal} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>
            <div className="pi-usr-modal-body">
              <form onSubmit={handleSubmit} className="formulario">
                <div className="input-group">
                  <label htmlFor="ayu-nombre"><FaUserTie aria-hidden="true" /> Nombre completo</label>
                  <input id="ayu-nombre" type="text" name="nombre" autoComplete="name" value={formAyudante.nombre} onChange={handleFormChange} placeholder="Ej: Juan Pérez" required />
                </div>
                <div className="input-group">
                  <label htmlFor="ayu-email"><FaEnvelope aria-hidden="true" /> Correo electrónico</label>
                  <input id="ayu-email" type="email" name="email" autoComplete="email" value={formAyudante.email} onChange={handleFormChange} placeholder="Ej: juan.perez@email.com" required />
                </div>
                <div className="input-group">
                  <label htmlFor="ayu-password"><FaLock aria-hidden="true" /> Contraseña temporal</label>
                  <input id="ayu-password" type="text" name="password" autoComplete="new-password" value={formAyudante.password} onChange={handleFormChange} placeholder="Ej: 123456" required />
                </div>

                <fieldset className="input-group" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend><FaStore aria-hidden="true" /> Puestos asignados (opcional)</legend>
                  <div className="checkbox-grid">
                    {puestos.map(puesto => (
                      <label key={puesto.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={formAyudante.puestosAsignados.includes(puesto.id)}
                          onChange={() => handlePuestoToggle(puesto.id)}
                        />
                        {formAyudante.puestosAsignados.includes(puesto.id) ? <FaCheckSquare aria-hidden="true" /> : <FaSquare aria-hidden="true" />}
                        {puesto.nombre}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="input-group">
                  <label htmlFor="ayu-foto"><FaImage aria-hidden="true" /> Foto de perfil (opcional)</label>
                  {!formAyudante.foto ? (
                    <div className="upload-zone">
                      <FaUpload className="upload-icon" aria-hidden="true" />
                      <span className="upload-text">Haz clic para subir una foto</span>
                      <input id="ayu-foto" type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" />
                    </div>
                  ) : (
                    <div className="preview-zone">
                      <img width="80" height="80" src={formAyudante.foto} alt="Vista previa de la foto de perfil" className="img-preview-avatar" />
                      <button type="button" className="btn-quitar-imagen" onClick={quitarImagen}><FaTimes aria-hidden="true" /> Quitar foto</button>
                    </div>
                  )}
                </div>
                <div className="pi-usr-modal-acciones">
                  <button type="button" className="btn-cerrar-secundario" onClick={cerrarModal}>Cancelar</button>
                  <button type="submit" className="pi-usr-btn-enviar">
                    <FaSave /> Crear Ayudante
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
          <div
            ref={modalAsignarRef}
            tabIndex={-1}
            className="pi-usr-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="asignar-puestos-titulo"
          >
            <div className="pi-usr-modal-header">
              <h3 id="asignar-puestos-titulo">
                <FaMapMarkerAlt color="var(--indigo-profundo)" aria-hidden="true" />
                Asignar Puestos: {ayudanteAsignando.nombre}
              </h3>
              <button type="button" className="pi-usr-btn-cerrar-modal" onClick={cerrarAsignarPuestos} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>
            <div className="pi-usr-modal-body">
              <p className="pi-ayudante-nota">
                Marca en qué puestos puede trabajar. Los cambios se guardan al instante.
              </p>
              <div className="checkbox-grid">
                {puestos.map(puesto => {
                  const asignado = ayudanteAsignando.asignaciones.some(a => a.puestoId === puesto.id);
                  return (
                    <label key={puesto.id} className="checkbox-item">
                      <input type="checkbox" checked={asignado} onChange={() => toggleAsignacionRapida(puesto)} />
                      {asignado ? <FaCheckSquare /> : <FaSquare />}
                      {puesto.nombre}
                    </label>
                  );
                })}
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

      {DialogoConfirmar}
    </div>
  );
}
