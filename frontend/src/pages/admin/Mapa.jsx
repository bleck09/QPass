import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FaStore, FaMap, FaListUl, FaPlus, FaTimes,
  FaSave, FaEdit, FaEyeSlash, FaCheck, FaLock, FaUnlock,
  FaInfoCircle, FaImage, FaUpload, FaArrowsAltH, FaArrowsAltV,
  FaCalendarAlt
} from 'react-icons/fa';
import api from '../../api/index.js';
import { ROLES } from '../../constants/roles.js';
import './Mapa.css';

export default function Mapa() {
  const location = useLocation();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(location.state?.eventoId || '');
  const [puestos, setPuestos] = useState([]);
  const [negociosDisponibles, setNegociosDisponibles] = useState([]);

  const [vistaActiva, setVistaActiva] = useState('plano');
  const [modoDiseno, setModoDiseno] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [form, setForm] = useState({ id: '', negocioId: '', nombre: '', categoria: 'Comida', logo: '', ancho: 100, alto: 100 });

  useEffect(() => {
    api.eventos.listar().then(lista => {
      setEventosDisponibles(lista);
      setEventoId(prev => prev || lista[0]?.id);
    });
    api.usuarios.listar({ rol: ROLES.USUARIO_NEGOCIO }).then(setNegociosDisponibles);
  }, []);

  useEffect(() => {
    if (!eventoId) return;
    api.puestos.listar({ eventoId }).then(setPuestos);
  }, [eventoId]);

  const cambiarEvento = (nuevoId) => {
    setEventoId(nuevoId);
    setModoDiseno(false);
  };

  // =========================================================
  // MOTOR NATIVO: ARRASTRE (DRAG) Y REDIMENSIONAMIENTO (RESIZE)
  // =========================================================
  const [puestoArrastrado, setPuestoArrastrado] = useState(null);
  const [offsetPuesto, setOffsetPuesto] = useState({ x: 0, y: 0 });
  
  // Nuevos estados para controlar el tamaño visual (Redimensionar)
  const [elementoRedimensionando, setElementoRedimensionando] = useState(null);
  const [datosResize, setDatosResize] = useState({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  // Iniciar Mover
  const iniciarArrastre = (e, puesto) => {
    if (!modoDiseno || elementoRedimensionando) return; // Si está redimensionando, no arrastrar
    const rect = e.currentTarget.getBoundingClientRect();
    setOffsetPuesto({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setPuestoArrastrado(puesto.id);
    e.target.setPointerCapture(e.pointerId);
  };

  // Iniciar Redimensionar (Hacer más grande/pequeño)
  const iniciarRedimension = (e, puesto) => {
    e.stopPropagation(); // Evita que se active el "Arrastrar" al mismo tiempo
    if (!modoDiseno) return;
    
    setElementoRedimensionando(puesto.id);
    setDatosResize({
      startX: e.clientX,
      startY: e.clientY,
      startWidth: puesto.ancho,
      startHeight: puesto.alto
    });
    e.target.setPointerCapture(e.pointerId);
  };

  // Lógica principal de movimiento del mouse sobre el lienzo
  const moverAccion = (e) => {
    if (!modoDiseno) return;

    if (elementoRedimensionando) {
      // ESTAMOS REDIMENSIONANDO (Haciendo más grande o pequeño)
      const deltaX = e.clientX - datosResize.startX;
      const deltaY = e.clientY - datosResize.startY;
      
      // Tamaño mínimo de 50x50 para que no desaparezcan
      let nuevoAncho = Math.max(50, datosResize.startWidth + deltaX);
      let nuevoAlto = Math.max(50, datosResize.startHeight + deltaY);

      setPuestos(prev => prev.map(p => 
        p.id === elementoRedimensionando ? { ...p, ancho: nuevoAncho, alto: nuevoAlto } : p
      ));

    } else if (puestoArrastrado) {
      // ESTAMOS ARRASTRANDO (Moviendo de lugar)
      const contenedor = e.currentTarget;
      const rectContenedor = contenedor.getBoundingClientRect();
      const puestoActual = puestos.find(p => p.id === puestoArrastrado);

      let nuevoX = e.clientX - rectContenedor.left - offsetPuesto.x;
      let nuevoY = e.clientY - rectContenedor.top - offsetPuesto.y;

      if (nuevoX < 0) nuevoX = 0;
      if (nuevoY < 0) nuevoY = 0;
      if (nuevoX > rectContenedor.width - puestoActual.ancho) nuevoX = rectContenedor.width - puestoActual.ancho; 
      if (nuevoY > rectContenedor.height - puestoActual.alto) nuevoY = rectContenedor.height - puestoActual.alto;

      setPuestos(prev => prev.map(p => p.id === puestoArrastrado ? { ...p, x: nuevoX, y: nuevoY } : p));
    }
  };

  const soltarAccion = () => {
    if (!modoDiseno) return;
    setPuestoArrastrado(null);
    setElementoRedimensionando(null);
  };
  // =========================================================

  const mostrarAlerta = (texto, tipo = 'exito') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectNegocio = (e) => {
    const negocioId = e.target.value;
    const neg = negociosDisponibles.find(n => String(n.id) === negocioId);
    setForm({ ...form, negocioId, nombre: neg?.nombre || '' });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm({ ...form, logo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const guardarElemento = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    if (modoEdicion) {
      const actualizado = await api.puestos.actualizar(form.id, {
        nombre: form.nombre, categoria: form.categoria, logo: form.logo,
        ancho: Number(form.ancho), alto: Number(form.alto),
      });
      setPuestos(prev => prev.map(p => p.id === actualizado.id ? { ...p, ...actualizado } : p));
      mostrarAlerta("Elemento actualizado correctamente.");
    } else {
      if (!form.negocioId) return;
      const creado = await api.puestos.crear({
        eventoId, negocioId: Number(form.negocioId), nombre: form.nombre, logo: form.logo,
      });
      const posicionado = await api.puestos.actualizar(creado.id, {
        categoria: form.categoria, x: 20, y: 20, ancho: Number(form.ancho), alto: Number(form.alto),
      });
      setPuestos(prev => [...prev, { ...creado, ...posicionado }]);
      mostrarAlerta("Nuevo elemento añadido al plano.");
    }

    cerrarModal();
  };

  const editarPuesto = (puesto) => {
    setForm({
      id: puesto.id, negocioId: String(puesto.negocioId), nombre: puesto.nombre, categoria: puesto.categoria || 'Comida',
      logo: puesto.logo || '', ancho: puesto.ancho || 100, alto: puesto.alto || 100
    });
    setModoEdicion(true);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setForm({ id: '', negocioId: '', nombre: '', categoria: 'Comida', logo: '', ancho: 100, alto: 100 });
    setModoEdicion(false);
    setMostrarModal(false);
  };

  const toggleEstadoPuesto = async (id) => {
    const puesto = puestos.find(p => p.id === id);
    const actualizado = await api.puestos.actualizar(id, { estadoActivo: !puesto.estadoActivo });
    setPuestos(prev => prev.map(p => p.id === id ? { ...p, ...actualizado } : p));
  };

  const guardarDiseñoPlano = async () => {
    await Promise.all(puestos.map(p => api.puestos.actualizar(p.id, { x: p.x, y: p.y, ancho: p.ancho, alto: p.alto })));
    setModoDiseno(false);
    mostrarAlerta("Distribución guardada y bloqueada.");
  };

  return (
    <div className="pi-mapa-container">
      
      {/* CABECERA */}
      <div className="pi-mapa-header-flex">
        <div>
          <h2><FaMap color="var(--cian-digital)"/> Diseñador del Recinto</h2>
          <p>Añade y escala visualmente los negocios, escenarios y zonas del evento.</p>
        </div>

        <div className="pi-mapa-selector-evento">
          <FaCalendarAlt />
          <select value={eventoId} onChange={(e) => cambiarEvento(e.target.value)}>
            {eventosDisponibles.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>

        <div className="pi-mapa-tabs-container">
          <div className="pi-mapa-tabs">
            <button className={vistaActiva === 'plano' ? 'active' : ''} onClick={() => setVistaActiva('plano')}>
              <FaMap /> Plano Visual
            </button>
            <button className={vistaActiva === 'tabla' ? 'active' : ''} onClick={() => setVistaActiva('tabla')}>
              <FaListUl /> Lista de Elementos
            </button>
          </div>

          {vistaActiva === 'tabla' && (
            <button className="btn-primario" onClick={() => setMostrarModal(true)}>
              <FaPlus /> Añadir Elemento
            </button>
          )}
        </div>
      </div>

      {mensaje.texto && <div className="alerta-exito">{mensaje.texto}</div>}

      {/* =======================================================
          VISTA 1: TABLA
      ======================================================= */}
      {vistaActiva === 'tabla' && (
        <div className="pi-mapa-tabla-vista">
          <div className="pi-mapa-card no-margin">
            <div className="table-wrapper">
              <table className="pi-mapa-table">
                <thead>
                  <tr>
                    <th>Elemento</th>
                    <th>Categoría</th>
                    <th>Tamaño (AnxAl)</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {puestos.length === 0 ? (
                    <tr><td colSpan="5" className="tabla-vacia">No hay elementos registrados.</td></tr>
                  ) : (
                    puestos.map((puesto) => (
                      <tr key={puesto.id} style={{ opacity: puesto.estadoActivo ? 1 : 0.5 }}>
                        <td>
                          <div className="item-info-mapa">
                            {puesto.logo ? (
                              <img src={puesto.logo} alt="img" className="img-miniatura" />
                            ) : (
                              <div className="no-img-miniatura"><FaStore /></div>
                            )}
                            <span className="fila-nombre">{puesto.nombre}</span>
                          </div>
                        </td>
                        <td>{puesto.categoria}</td>
                        <td style={{ color: 'var(--texto-secundario)'}}>{Math.round(puesto.ancho)}px × {Math.round(puesto.alto)}px</td>
                        <td>
                          {puesto.estadoActivo ? <span className="badge-visible">Visible</span> : <span className="badge-oculto">Oculto</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn-icon-editar" onClick={() => editarPuesto(puesto)}><FaEdit /></button>
                          <button className={puesto.estadoActivo ? 'btn-icon-ocultar' : 'btn-icon-visible'} onClick={() => toggleEstadoPuesto(puesto.id)}>
                            {puesto.estadoActivo ? <FaEyeSlash title="Ocultar"/> : <FaCheck title="Mostrar"/>}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          VISTA 2: PLANO VISUAL INTERACTIVO
      ======================================================= */}
      {vistaActiva === 'plano' && (
        <div className="pi-mapa-plano-vista">
          
          <div className={`plano-toolbar ${modoDiseno ? 'diseno-activo' : ''}`}>
            {!modoDiseno ? (
              <>
                <span className="info-text"><FaLock /> El plano está bloqueado.</span>
                <button className="btn-primario" onClick={() => setModoDiseno(true)}><FaUnlock /> Editar Distribución</button>
              </>
            ) : (
              <>
                <div className="toolbar-actions">
                  <button className="btn-secundario" onClick={() => setMostrarModal(true)}>
                    <FaPlus /> Añadir Elemento
                  </button>
                  <span className="info-text-verde"><FaInfoCircle /> Arrastra del centro para mover, o de la esquina para crecer.</span>
                </div>
                <button className="btn-guardar-plano" onClick={guardarDiseñoPlano}><FaSave /> Guardar y Bloquear</button>
              </>
            )}
          </div>

          <div 
            className={`canvas-plano ${modoDiseno ? 'canvas-activo' : ''}`}
            onPointerMove={moverAccion}
            onPointerUp={soltarAccion}
            onPointerLeave={soltarAccion}
            style={{ cursor: elementoRedimensionando ? 'se-resize' : 'default' }}
          >
            {puestos.filter(p => p.estadoActivo).map((puesto) => (
              <div 
                key={puesto.id}
                onPointerDown={(e) => iniciarArrastre(e, puesto)}
                className={`puesto-box-dinamico ${modoDiseno ? 'arrastrable' : ''} ${puestoArrastrado === puesto.id || elementoRedimensionando === puesto.id ? 'activo-top' : ''}`}
                style={{
                  left: `${puesto.x}px`, top: `${puesto.y}px`,
                  width: `${puesto.ancho}px`, height: `${puesto.alto}px`
                }}
              >
                {/* Contenido (Imagen o Icono) */}
                {puesto.logo ? (
                  <div className="box-fondo-img" style={{ backgroundImage: `url(${puesto.logo})` }}>
                    <div className="box-overlay-texto">
                      <strong>{puesto.nombre}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="box-fondo-color">
                    <FaStore className="puesto-icon-dinamico" />
                    <strong>{puesto.nombre}</strong>
                    <span>{puesto.categoria}</span>
                  </div>
                )}

                {/* --- BOTÓN DE REDIMENSIONAR (Solo visible en modo diseño) --- */}
                {modoDiseno && (
                  <div 
                    className="resize-handle"
                    onPointerDown={(e) => iniciarRedimension(e, puesto)}
                  />
                )}

              </div>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: AÑADIR / EDITAR
      ======================================================= */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2><FaMap color="var(--indigo-profundo)" /> {modoEdicion ? 'Editar Elemento' : 'Añadir al Plano'}</h2>
              <button className="btn-close-modal" onClick={cerrarModal}><FaTimes /></button>
            </div>

            <div className="modal-body">
              <form onSubmit={guardarElemento} className="formulario">
                
                {!modoEdicion && (
                  <div className="input-group" style={{ backgroundColor: 'var(--gris-niebla)', padding: '15px', borderRadius: '8px' }}>
                    <label>Usuario Negocio dueño del puesto</label>
                    <select value={form.negocioId} onChange={handleSelectNegocio} className="pi-select-rol" required>
                      <option value="">Selecciona un negocio...</option>
                      {negociosDisponibles.map(neg => (
                        <option key={neg.id} value={neg.id}>{neg.nombre} ({neg.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label>Nombre del Elemento</label>
                  <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Pizzas El Paso" required />
                </div>

                <div className="input-group">
                  <label>Categoría</label>
                  <select name="categoria" value={form.categoria} onChange={handleChange} className="pi-select-rol">
                    <option value="Comida">Comida</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Entretenimiento">Entretenimiento / Escenario</option>
                    <option value="Servicios">Baños / Servicios</option>
                    <option value="General">General / Área</option>
                  </select>
                </div>

                <div className="form-inline">
                  <div className="input-group flex-1">
                    <label><FaArrowsAltH /> Ancho inicial (px)</label>
                    <input type="number" min="50" name="ancho" value={form.ancho} onChange={handleChange} required />
                  </div>
                  <div className="input-group flex-1">
                    <label><FaArrowsAltV /> Alto inicial (px)</label>
                    <input type="number" min="50" name="alto" value={form.alto} onChange={handleChange} required />
                  </div>
                </div>

                <div className="input-group">
                  <label><FaImage /> Imagen o Logo (Opcional)</label>
                  {!form.logo ? (
                    <div className="upload-zone-pequeña">
                      <FaUpload className="upload-icon" />
                      <span className="upload-text">Subir foto para el plano</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" />
                    </div>
                  ) : (
                    <div className="preview-zone">
                      <img src={form.logo} alt="Preview" className="img-preview-rect" style={{maxHeight:'100px'}}/>
                      <button type="button" className="btn-quitar-imagen" onClick={() => setForm({...form, logo: ''})}>
                        <FaTimes /> Quitar
                      </button>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                  <button type="submit" className="btn-primario"><FaSave /> Guardar Elemento</button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}