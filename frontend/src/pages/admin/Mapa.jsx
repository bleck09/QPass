import { useCallback, useEffect, useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
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
  useTituloPagina('Diseñador del recinto');
  const location = useLocation();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(location.state?.eventoId || '');
  const [negociosDisponibles, setNegociosDisponibles] = useState([]);

  // Puestos del plano con estados cargando/error/reintentar (Manual 8.9).
  // setPuestos (alias de setData) mantiene las actualizaciones optimistas del
  // modo diseño: arrastrar, redimensionar, crear y borrar sin recargar.
  const cargarPuestos = useCallback(
    () => api.puestos.listar({ eventoId }),
    [eventoId],
  );
  const {
    data: puestos,
    setData: setPuestos,
    cargando: cargandoPuestos,
    error: errorPuestos,
    recargar: recargarPuestos,
  } = useApi(cargarPuestos, { inicial: [], activo: !!eventoId });

  const [vistaActiva, setVistaActiva] = useState('plano');
  const [modoDiseno, setModoDiseno] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [mostrarModal, setMostrarModal] = useState(false);

  // Foco del modal de elemento del plano (A1 / Manual 8.6)
  const modalPlanoRef = useRef(null);
  useFocoModal(modalPlanoRef, mostrarModal);

  // Modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  useEffect(() => {
    if (!mostrarModal) return;
    const alTecla = (e) => { if (e.key === "Escape") setMostrarModal(false); };
    window.addEventListener("keydown", alTecla);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", alTecla); document.body.style.overflow = ""; };
  }, [mostrarModal]);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [form, setForm] = useState({ id: '', negocioId: '', nombre: '', categoria: 'Comida', logo: '', ancho: 100, alto: 100 });

  useEffect(() => {
    api.eventos.listar().then(lista => {
      setEventosDisponibles(lista);
      setEventoId(prev => prev || lista[0]?.id);
    });
    api.usuarios.listar({ rol: ROLES.USUARIO_NEGOCIO }).then(setNegociosDisponibles);
  }, []);


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
          <h1><FaMap color="var(--cian-digital)" aria-hidden="true" /> Diseñador del recinto</h1>
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
            <button type="button" className={vistaActiva === 'plano' ? 'active' : ''} onClick={() => setVistaActiva('plano')}>
              <FaMap /> Plano Visual
            </button>
            <button type="button" className={vistaActiva === 'tabla' ? 'active' : ''} onClick={() => setVistaActiva('tabla')}>
              <FaListUl /> Lista de Elementos
            </button>
          </div>

          {vistaActiva === 'tabla' && (
            <button type="button" className="btn-primario" onClick={() => setMostrarModal(true)}>
              <FaPlus /> Añadir Elemento
            </button>
          )}
        </div>
      </div>

      {mensaje.texto && <div className="alerta-exito">{mensaje.texto}</div>}

      {/* Estados de la carga de puestos (Manual 8.9) antes de cualquiera de las dos vistas */}
      {errorPuestos && <EstadoError onReintentar={recargarPuestos} />}
      {!errorPuestos && cargandoPuestos && <EstadoCarga filas={4} />}

      {/* =======================================================
          VISTA 1: TABLA
      ======================================================= */}
      {!errorPuestos && !cargandoPuestos && vistaActiva === 'tabla' && (
        <div className="pi-mapa-tabla-vista">
          <div className="pi-mapa-card no-margin">
            <div className="table-wrapper">
              <table className="pi-mapa-table">
                <thead>
                  <tr>
                    <th scope="col">Elemento</th>
                    <th scope="col">Categoría</th>
                    <th scope="col">Tamaño (AnxAl)</th>
                    <th scope="col">Estado</th>
                    <th scope="col" style={{ textAlign: 'center' }}>Acciones</th>
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
                              <img width="40" height="40" src={puesto.logo} alt="img" className="img-miniatura" />
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
                          <button type="button" className="btn-icon-editar" onClick={() => editarPuesto(puesto)}><FaEdit /></button>
                          <button type="button" className={puesto.estadoActivo ? 'btn-icon-ocultar' : 'btn-icon-visible'} onClick={() => toggleEstadoPuesto(puesto.id)}>
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
      {!errorPuestos && !cargandoPuestos && vistaActiva === 'plano' && (
        <div className="pi-mapa-plano-vista">
          
          <div className={`plano-toolbar ${modoDiseno ? 'diseno-activo' : ''}`}>
            {!modoDiseno ? (
              <>
                <span className="info-text"><FaLock /> El plano está bloqueado.</span>
                <button type="button" className="btn-primario" onClick={() => setModoDiseno(true)}><FaUnlock /> Editar Distribución</button>
              </>
            ) : (
              <>
                <div className="toolbar-actions">
                  <button type="button" className="btn-secundario" onClick={() => setMostrarModal(true)}>
                    <FaPlus /> Añadir Elemento
                  </button>
                  <span className="info-text-verde"><FaInfoCircle /> Arrastra del centro para mover, o de la esquina para crecer.</span>
                </div>
                <button type="button" className="btn-guardar-plano" onClick={guardarDiseñoPlano}><FaSave /> Guardar y Bloquear</button>
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
        <div className="modal-overlay" onClick={cerrarModal}>
          <div ref={modalPlanoRef} tabIndex={-1} className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mapa-modal-titulo">
            <div className="modal-header">
              <h2 id="mapa-modal-titulo"><FaMap color="var(--indigo-profundo)" aria-hidden="true" /> {modoEdicion ? "Editar Elemento" : "Añadir al Plano"}</h2>
              <button type="button" className="btn-close-modal" onClick={cerrarModal} aria-label="Cerrar"><FaTimes aria-hidden="true" /></button>
            </div>

            <div className="modal-body">
              <form onSubmit={guardarElemento} className="formulario">
                
                {!modoEdicion && (
                  <div className="input-group" style={{ backgroundColor: 'var(--gris-niebla)', padding: '15px', borderRadius: '8px' }}>
                    <label htmlFor="mapa-negocio">Usuario Negocio dueño del puesto</label>
                    <select id="mapa-negocio" value={form.negocioId} onChange={handleSelectNegocio} className="pi-select-rol" required>
                      <option value="">Selecciona un negocio...</option>
                      {negociosDisponibles.map(neg => (
                        <option key={neg.id} value={neg.id}>{neg.nombre} ({neg.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="mapa-nombre">Nombre del elemento</label>
                  <input id="mapa-nombre" type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Pizzas El Paso" required />
                </div>

                <div className="input-group">
                  <label htmlFor="mapa-categoria">Categoría</label>
                  <select id="mapa-categoria" name="categoria" value={form.categoria} onChange={handleChange} className="pi-select-rol">
                    <option value="Comida">Comida</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Entretenimiento">Entretenimiento / Escenario</option>
                    <option value="Servicios">Baños / Servicios</option>
                    <option value="General">General / Área</option>
                  </select>
                </div>

                <div className="form-inline">
                  <div className="input-group flex-1">
                    <label htmlFor="mapa-ancho"><FaArrowsAltH aria-hidden="true" /> Ancho inicial (px)</label>
                    <input id="mapa-ancho" type="number" min="50" name="ancho" value={form.ancho} onChange={handleChange} required />
                  </div>
                  <div className="input-group flex-1">
                    <label htmlFor="mapa-alto"><FaArrowsAltV aria-hidden="true" /> Alto inicial (px)</label>
                    <input id="mapa-alto" type="number" min="50" name="alto" value={form.alto} onChange={handleChange} required />
                  </div>
                </div>

                <div className="input-group">
                  <label><FaImage aria-hidden="true" /> Imagen o logo (opcional)</label>
                  {!form.logo ? (
                    <div className="upload-zone-pequeña">
                      <FaUpload className="upload-icon" />
                      <span className="upload-text">Subir foto para el plano</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" />
                    </div>
                  ) : (
                    <div className="preview-zone">
                      <img width="640" height="360" src={form.logo} alt="Preview" className="img-preview-rect" style={{maxHeight:'100px'}}/>
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