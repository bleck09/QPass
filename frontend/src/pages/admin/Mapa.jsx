import { useCallback, useEffect, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import BotonVolver from '../../components/BotonVolver.jsx';
import {
  FaStore, FaMap, FaListUl,
  FaSave, FaEdit, FaEyeSlash, FaCheck, FaLock, FaUnlock,
  FaInfoCircle, FaArrowsAltH, FaArrowsAltV,
  FaCalendarAlt
} from 'react-icons/fa';
import api from '../../api/index.js';
import './Mapa.css';

export default function Mapa({ eventoId: eventoIdProp = null, embebido = false } = {}) {
  useTituloPagina('Diseñador del recinto', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(eventoIdProp || location.state?.eventoId || '');

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

  // Los puestos los crea el Usuario Negocio (activa uno de su catálogo). Acá el
  // Admin solo los ubica y escala en el plano: el modal edita tamaño, nada más.
  const [form, setForm] = useState({ id: '', nombre: '', ancho: 100, alto: 100 });

  useEffect(() => {
    if (!embebido) {
      api.eventos.listarTodos().then(lista => {
        setEventosDisponibles(lista);
        setEventoId(prev => prev || lista[0]?.id);
      });
    }
  }, [embebido]);


  const cambiarEvento = (nuevoId) => {
    setEventoId(nuevoId);
    setModoDiseno(false);
  };
  // Embebido o llegado desde Gestión de Eventos: evento fijo (sin selector/volver).
  const eventoBloqueado = embebido || !!location.state?.eventoId;

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

  const guardarElemento = async (e) => {
    e.preventDefault();
    const actualizado = await api.puestos.actualizar(form.id, {
      ancho: Number(form.ancho), alto: Number(form.alto),
    });
    setPuestos(prev => prev.map(p => p.id === actualizado.id ? { ...p, ...actualizado } : p));
    mostrarAlerta("Tamaño actualizado correctamente.");
    cerrarModal();
  };

  const editarPuesto = (puesto) => {
    setForm({
      id: puesto.id, nombre: puesto.nombre,
      ancho: puesto.ancho || 100, alto: puesto.alto || 100,
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setForm({ id: '', nombre: '', ancho: 100, alto: 100 });
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

      {!embebido && (
        <BotonVolver onClick={() => navigate('/admin/eventos', { state: { eventoId } })}>
          Volver al evento
        </BotonVolver>
      )}

      {/* CABECERA */}
      <div className="pi-mapa-header-flex">
        {!embebido && (
          <div>
            <h1><FaMap color="var(--cian-digital)" aria-hidden="true" /> Diseñador del recinto</h1>
            <p>Añade y escala visualmente los negocios, escenarios y zonas del evento.</p>
          </div>
        )}

        {!embebido && (
          <div className="pi-mapa-selector-evento">
            <FaCalendarAlt />
            {eventoBloqueado ? (
              <strong>{eventosDisponibles.find(ev => ev.id === eventoId)?.nombre || 'Evento'}</strong>
            ) : (
              <select value={eventoId} onChange={(e) => cambiarEvento(e.target.value)}>
                {eventosDisponibles.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="pi-mapa-tabs-container">
          <div className="pi-mapa-tabs">
            <button type="button" className={vistaActiva === 'plano' ? 'active' : ''} onClick={() => setVistaActiva('plano')}>
              <FaMap /> Plano Visual
            </button>
            <button type="button" className={vistaActiva === 'tabla' ? 'active' : ''} onClick={() => setVistaActiva('tabla')}>
              <FaListUl /> Lista de Elementos
            </button>
          </div>

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
            <Tabla
              columnas={['Elemento', 'Categoría', 'Tamaño (AnxAl)', 'Estado', { texto: 'Acciones', align: 'center' }]}
              datos={puestos}
              vacio="No hay elementos registrados."
              renderFila={puesto => (
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
              )}
            />
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
        <Modal
          titulo={<><FaMap color="var(--indigo-profundo)" aria-hidden="true" /> Tamaño de {form.nombre || 'elemento'}</>}
          onCerrar={cerrarModal}
        >
          <form onSubmit={guardarElemento} className="formulario">

                <p className="info-text"><FaInfoCircle aria-hidden="true" /> El nombre y el logo se editan desde el catálogo del negocio. Acá solo se ajusta el tamaño en el plano.</p>

                <div className="form-inline">
                  <div className="input-group flex-1">
                    <label htmlFor="mapa-ancho"><FaArrowsAltH aria-hidden="true" /> Ancho (px)</label>
                    <input id="mapa-ancho" type="number" min="50" name="ancho" value={form.ancho} onChange={handleChange} required />
                  </div>
                  <div className="input-group flex-1">
                    <label htmlFor="mapa-alto"><FaArrowsAltV aria-hidden="true" /> Alto (px)</label>
                    <input id="mapa-alto" type="number" min="50" name="alto" value={form.alto} onChange={handleChange} required />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                  <button type="submit" className="btn-primario"><FaSave /> Guardar tamaño</button>
                </div>

          </form>
        </Modal>
      )}

    </div>
  );
}