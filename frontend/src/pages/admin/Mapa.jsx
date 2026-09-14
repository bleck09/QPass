import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Tabla from '../../components/Tabla.jsx';
import ContornoRecinto from '../../components/ContornoRecinto.jsx';
import { useApi } from '../../utils/useApi.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import BotonVolver from '../../components/BotonVolver.jsx';
import { proyectarContorno } from '../../utils/contornoMapa.js';
import { TIPOS_ELEMENTO_MAPA, tipoElementoInfo } from '../../utils/elementosMapa.js';
import {
  FaStore, FaMap, FaListUl, FaDrawPolygon,
  FaSave, FaEdit, FaEyeSlash, FaCheck, FaLock, FaUnlock,
  FaInfoCircle, FaArrowsAltH, FaArrowsAltV, FaPlus, FaTrash,
  FaCalendarAlt
} from 'react-icons/fa';
import api from '../../api/index.js';
import './Mapa.css';

const FORM_ZONA_VACIO = { tipo: 'entrada', nombre: 'Entrada', nombreTocado: false };

export default function Mapa({ eventoId: eventoIdProp = null, embebido = false } = {}) {
  useTituloPagina('Diseñador del recinto', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(eventoIdProp || location.state?.eventoId || '');

  // Evento completo (no solo el nombre): acá salen latitud/longitud (centro del
  // mapa real en modo Contorno) y contornoMapa (la forma proyectada del modo Plano).
  // obtenerAdmin (no obtener): esta pantalla es de Admin, y el evento puede
  // seguir en borrador — el endpoint público 404-ea eventos sin publicar.
  const cargarEventoActual = useCallback(
    () => api.eventos.obtenerAdmin(eventoId),
    [eventoId],
  );
  const {
    data: eventoActual,
    setData: setEventoActual,
    cargando: cargandoEvento,
  } = useApi(cargarEventoActual, { inicial: null, activo: !!eventoId });

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

  // Cuadros del plano que NO son un negocio (entrada, baños, escenario...).
  // A diferencia de Puesto, el Admin los crea y borra directo desde acá.
  const cargarElementos = useCallback(
    () => api.elementosMapa.listar(eventoId),
    [eventoId],
  );
  const { data: elementos, setData: setElementos } = useApi(cargarElementos, {
    inicial: [],
    activo: !!eventoId,
  });

  const [vistaActiva, setVistaActiva] = useState('plano');
  const [modoDiseno, setModoDiseno] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalZona, setMostrarModalZona] = useState(false);
  const [formZona, setFormZona] = useState(FORM_ZONA_VACIO);

  // Los puestos los crea el Usuario Negocio (activa uno de su catálogo). Acá el
  // Admin solo los ubica y escala en el plano: el modal edita tamaño, nada más.
  const [form, setForm] = useState({ id: '', nombre: '', ancho: 100, alto: 100 });

  // Contorno del recinto: copia editable en el mapa real (modo Contorno). Se
  // resetea a lo guardado cada vez que cambia de evento — ajuste de estado
  // durante el render (no en un efecto: evita el doble render de
  // react-hooks/set-state-in-effect, ver comentario en utils/useApi.js).
  const [contornoBorrador, setContornoBorrador] = useState([]);
  const [eventoIdDelContorno, setEventoIdDelContorno] = useState(null);
  if (eventoActual && eventoActual.id !== eventoIdDelContorno) {
    setEventoIdDelContorno(eventoActual.id);
    setContornoBorrador(eventoActual.contornoMapa || []);
  }
  const contornoGuardado = useMemo(() => eventoActual?.contornoMapa || [], [eventoActual]);
  const contornoSucio = JSON.stringify(contornoBorrador) !== JSON.stringify(contornoGuardado);
  // El plano (modo Plano) se dibuja a partir de lo GUARDADO, no del borrador
  // que se esté editando en la otra pestaña sin confirmar todavía.
  const proyeccion = useMemo(() => proyectarContorno(contornoGuardado), [contornoGuardado]);

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
  // Comparten motor Puesto y ElementoMapa: { tipo: 'puesto'|'elemento', id }
  // dice cuál de las dos colecciones locales (setPuestos/setElementos) tocar.
  // =========================================================
  const [itemArrastrado, setItemArrastrado] = useState(null);
  const [offsetArrastre, setOffsetArrastre] = useState({ x: 0, y: 0 });

  // Nuevos estados para controlar el tamaño visual (Redimensionar)
  const [itemRedimensionando, setItemRedimensionando] = useState(null);
  const [datosResize, setDatosResize] = useState({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const buscarItem = (tipo, id) => (tipo === 'puesto' ? puestos : elementos).find(it => it.id === id);
  const actualizarItemLocal = (tipo, id, cambios) => {
    const setter = tipo === 'puesto' ? setPuestos : setElementos;
    setter(prev => prev.map(it => (it.id === id ? { ...it, ...cambios } : it)));
  };

  // Iniciar Mover
  const iniciarArrastre = (e, tipo, item) => {
    if (!modoDiseno || itemRedimensionando) return; // Si está redimensionando, no arrastrar
    const rect = e.currentTarget.getBoundingClientRect();
    setOffsetArrastre({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setItemArrastrado({ tipo, id: item.id });
    e.target.setPointerCapture(e.pointerId);
  };

  // Iniciar Redimensionar (Hacer más grande/pequeño)
  const iniciarRedimension = (e, tipo, item) => {
    e.stopPropagation(); // Evita que se active el "Arrastrar" al mismo tiempo
    if (!modoDiseno) return;

    setItemRedimensionando({ tipo, id: item.id });
    setDatosResize({
      startX: e.clientX,
      startY: e.clientY,
      startWidth: item.ancho,
      startHeight: item.alto
    });
    e.target.setPointerCapture(e.pointerId);
  };

  // Lógica principal de movimiento del mouse sobre el lienzo
  const moverAccion = (e) => {
    if (!modoDiseno) return;

    if (itemRedimensionando) {
      // ESTAMOS REDIMENSIONANDO (Haciendo más grande o pequeño)
      const deltaX = e.clientX - datosResize.startX;
      const deltaY = e.clientY - datosResize.startY;

      // Tamaño mínimo de 50x50 para que no desaparezcan
      const nuevoAncho = Math.max(50, datosResize.startWidth + deltaX);
      const nuevoAlto = Math.max(50, datosResize.startHeight + deltaY);

      actualizarItemLocal(itemRedimensionando.tipo, itemRedimensionando.id, { ancho: nuevoAncho, alto: nuevoAlto });

    } else if (itemArrastrado) {
      // ESTAMOS ARRASTRANDO (Moviendo de lugar)
      const contenedor = e.currentTarget;
      const rectContenedor = contenedor.getBoundingClientRect();
      const actual = buscarItem(itemArrastrado.tipo, itemArrastrado.id);
      if (!actual) return;

      let nuevoX = e.clientX - rectContenedor.left - offsetArrastre.x;
      let nuevoY = e.clientY - rectContenedor.top - offsetArrastre.y;

      if (nuevoX < 0) nuevoX = 0;
      if (nuevoY < 0) nuevoY = 0;
      if (nuevoX > rectContenedor.width - actual.ancho) nuevoX = rectContenedor.width - actual.ancho;
      if (nuevoY > rectContenedor.height - actual.alto) nuevoY = rectContenedor.height - actual.alto;

      actualizarItemLocal(itemArrastrado.tipo, itemArrastrado.id, { x: nuevoX, y: nuevoY });
    }
  };

  const soltarAccion = () => {
    if (!modoDiseno) return;
    setItemArrastrado(null);
    setItemRedimensionando(null);
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
    await Promise.all([
      ...puestos.map(p => api.puestos.actualizar(p.id, { x: p.x, y: p.y, ancho: p.ancho, alto: p.alto })),
      ...elementos.map(el => api.elementosMapa.actualizar(el.id, { x: el.x, y: el.y, ancho: el.ancho, alto: el.alto })),
    ]);
    setModoDiseno(false);
    mostrarAlerta("Distribución guardada y bloqueada.");
  };

  // --- Zonas manuales (ElementoMapa): catálogo fijo, el Admin las crea directo. ---
  const cambiarTipoZona = (tipo) => {
    setFormZona(f => ({
      tipo,
      nombre: f.nombreTocado ? f.nombre : tipoElementoInfo(tipo).etiqueta,
      nombreTocado: f.nombreTocado,
    }));
  };

  const crearElementoZona = async (e) => {
    e.preventDefault();
    const nuevo = await api.elementosMapa.crear({ eventoId, tipo: formZona.tipo, nombre: formZona.nombre });
    setElementos(prev => [...prev, nuevo]);
    setMostrarModalZona(false);
    setFormZona(FORM_ZONA_VACIO);
    mostrarAlerta('Zona agregada: arrástrala a su lugar en el plano.');
  };

  const eliminarElemento = async (elemento) => {
    const ok = await confirmar({
      titulo: '¿Eliminar esta zona del plano?',
      mensaje: `"${elemento.nombre}" se va a borrar del mapa. No se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    await api.elementosMapa.eliminar(elemento.id);
    setElementos(prev => prev.filter(el => el.id !== elemento.id));
    mostrarAlerta('Zona eliminada.');
  };

  // --- Contorno del recinto (modo Contorno) ---
  const guardarContorno = async () => {
    if (contornoBorrador.length > 0 && contornoBorrador.length < 3) {
      mostrarAlerta('El contorno necesita al menos 3 vértices.', 'error');
      return;
    }
    const actualizado = await api.eventos.actualizarContorno(eventoId, contornoBorrador);
    setEventoActual(actualizado);
    mostrarAlerta('Contorno guardado.');
  };
  const descartarContorno = () => setContornoBorrador(contornoGuardado);

  const centroMapa = eventoActual?.latitud != null && eventoActual?.longitud != null
    ? [eventoActual.latitud, eventoActual.longitud]
    : null;

  const filasTabla = [
    ...puestos.map(p => ({ ...p, _tipo: 'puesto' })),
    ...elementos.map(el => ({ ...el, _tipo: 'elemento' })),
  ];

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
            <p>Dibuja el contorno del recinto y ubica negocios y zonas dentro de él.</p>
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
            <button type="button" className={vistaActiva === 'contorno' ? 'active' : ''} onClick={() => setVistaActiva('contorno')}>
              <FaDrawPolygon /> Contorno
            </button>
            <button type="button" className={vistaActiva === 'plano' ? 'active' : ''} onClick={() => setVistaActiva('plano')}>
              <FaMap /> Plano Visual
            </button>
            <button type="button" className={vistaActiva === 'tabla' ? 'active' : ''} onClick={() => setVistaActiva('tabla')}>
              <FaListUl /> Lista de Elementos
            </button>
          </div>

        </div>
      </div>

      {mensaje.texto && <div className={mensaje.tipo === 'error' ? 'alerta-error' : 'alerta-exito'}>{mensaje.texto}</div>}

      {/* Estados de la carga de puestos (Manual 8.9) antes de cualquiera de las vistas */}
      {errorPuestos && <EstadoError onReintentar={recargarPuestos} />}
      {!errorPuestos && cargandoPuestos && <EstadoCarga filas={4} />}

      {/* =======================================================
          VISTA 0: CONTORNO DEL RECINTO (mapa real)
      ======================================================= */}
      {!errorPuestos && !cargandoPuestos && vistaActiva === 'contorno' && (
        <div className="pi-mapa-contorno-vista">
          <div className="pi-mapa-card">
            <p className="info-text">
              <FaInfoCircle aria-hidden="true" /> Hacé clic sobre el mapa para marcar cada esquina del
              recinto, en orden. Arrastrá un vértice para moverlo, o abrí su punto para eliminarlo
              (mínimo 3). El plano (pestaña "Plano Visual") se ajusta a esta forma una vez guardada.
            </p>

            {!cargandoEvento && eventoActual && eventoActual.latitud == null && (
              <p className="info-text" style={{ color: 'var(--rojo-error-texto)' }}>
                <FaInfoCircle aria-hidden="true" /> Este evento no tiene ubicación configurada — anda a
                Gestión de Eventos y marcala primero para centrar el mapa acá.
              </p>
            )}

            <ContornoRecinto centro={centroMapa} value={contornoBorrador} onChange={setContornoBorrador} />

            <div className="pi-mapa-contorno-acciones">
              <span className="info-text">
                {contornoBorrador.length === 0 && 'Sin contorno todavía.'}
                {contornoBorrador.length > 0 && contornoBorrador.length < 3 &&
                  `${contornoBorrador.length} vértice(s) — faltan al menos ${3 - contornoBorrador.length} más.`}
                {contornoBorrador.length >= 3 && `${contornoBorrador.length} vértices.`}
              </span>
              <div className="toolbar-actions">
                <button type="button" className="btn-secundario" onClick={descartarContorno} disabled={!contornoSucio}>
                  Descartar cambios
                </button>
                <button type="button" className="btn-primario" onClick={guardarContorno} disabled={!contornoSucio}>
                  <FaSave /> Guardar contorno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          VISTA 1: TABLA
      ======================================================= */}
      {!errorPuestos && !cargandoPuestos && vistaActiva === 'tabla' && (
        <div className="pi-mapa-tabla-vista">
          <div className="pi-mapa-card no-margin">
            <Tabla
              columnas={['Elemento', 'Categoría', 'Tamaño (AnxAl)', 'Estado', { texto: 'Acciones', align: 'center' }]}
              datos={filasTabla}
              vacio="No hay elementos registrados."
              renderFila={item => item._tipo === 'elemento' ? (
                <tr key={`el-${item.id}`}>
                  <td>
                    <div className="item-info-mapa">
                      <div className="no-img-miniatura">{(() => { const I = tipoElementoInfo(item.tipo).Icono; return <I />; })()}</div>
                      <span className="fila-nombre">{item.nombre}</span>
                    </div>
                  </td>
                  <td>{tipoElementoInfo(item.tipo).etiqueta}</td>
                  <td style={{ color: 'var(--texto-secundario)' }}>{Math.round(item.ancho)}px × {Math.round(item.alto)}px</td>
                  <td><span className="badge-zona">Zona</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className="btn-icon-ocultar" onClick={() => eliminarElemento(item)}><FaTrash title="Eliminar" /></button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} style={{ opacity: item.estadoActivo ? 1 : 0.5 }}>
                  <td>
                    <div className="item-info-mapa">
                      {item.logo ? (
                        <img width="40" height="40" src={item.logo} alt="img" className="img-miniatura" />
                      ) : (
                        <div className="no-img-miniatura"><FaStore /></div>
                      )}
                      <span className="fila-nombre">{item.nombre}</span>
                    </div>
                  </td>
                  <td>{item.categoria}</td>
                  <td style={{ color: 'var(--texto-secundario)' }}>{Math.round(item.ancho)}px × {Math.round(item.alto)}px</td>
                  <td>
                    {item.estadoActivo ? <span className="badge-visible">Visible</span> : <span className="badge-oculto">Oculto</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className="btn-icon-editar" onClick={() => editarPuesto(item)}><FaEdit /></button>
                    <button type="button" className={item.estadoActivo ? 'btn-icon-ocultar' : 'btn-icon-visible'} onClick={() => toggleEstadoPuesto(item.id)}>
                      {item.estadoActivo ? <FaEyeSlash title="Ocultar" /> : <FaCheck title="Mostrar" />}
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
                  <button type="button" className="btn-secundario" onClick={() => setMostrarModalZona(true)}><FaPlus /> Agregar zona</button>
                </div>
                <button type="button" className="btn-guardar-plano" onClick={guardarDiseñoPlano}><FaSave /> Guardar y Bloquear</button>
              </>
            )}
          </div>

          {!proyeccion && (
            <p className="info-text">
              <FaInfoCircle aria-hidden="true" /> Sin contorno del recinto todavía: el plano usa un tamaño
              por defecto.{' '}
              <button type="button" className="pi-mapa-link" onClick={() => setVistaActiva('contorno')}>Dibujalo en la pestaña Contorno</button>.
            </p>
          )}

          {/* Con contorno, el lienzo pasa a medir lo que mida el recinto real
              (ver utils/contornoMapa.js) — puede ser más ancho que la pantalla,
              por eso el scroll horizontal acá en vez de encogerlo (encogerlo
              desalinearía las cajas, que están en px "reales" del proyectado). */}
          <div className="pi-mapa-plano-scroll">
          <div
            className={`canvas-plano ${modoDiseno ? 'canvas-activo' : ''}`}
            style={proyeccion ? { width: `${proyeccion.ancho}px`, height: `${proyeccion.alto}px` } : undefined}
            onPointerMove={moverAccion}
            onPointerUp={soltarAccion}
            onPointerLeave={soltarAccion}
          >
            {proyeccion && (
              <svg className="contorno-svg-fondo" viewBox={`0 0 ${proyeccion.ancho} ${proyeccion.alto}`} preserveAspectRatio="none" aria-hidden="true">
                <polygon points={proyeccion.puntos.map(([x, y]) => `${x},${y}`).join(' ')} />
              </svg>
            )}

            {puestos.filter(p => p.estadoActivo).map((puesto) => (
              <div
                key={puesto.id}
                onPointerDown={(e) => iniciarArrastre(e, 'puesto', puesto)}
                className={`puesto-box-dinamico ${modoDiseno ? 'arrastrable' : ''} ${(itemArrastrado?.tipo === 'puesto' && itemArrastrado.id === puesto.id) || (itemRedimensionando?.tipo === 'puesto' && itemRedimensionando.id === puesto.id) ? 'activo-top' : ''}`}
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
                    onPointerDown={(e) => iniciarRedimension(e, 'puesto', puesto)}
                  />
                )}

              </div>
            ))}

            {elementos.map((elemento) => {
              const info = tipoElementoInfo(elemento.tipo);
              const Icono = info.Icono;
              return (
                <div
                  key={elemento.id}
                  onPointerDown={(e) => iniciarArrastre(e, 'elemento', elemento)}
                  className={`puesto-box-dinamico elemento-zona ${modoDiseno ? 'arrastrable' : ''} ${(itemArrastrado?.tipo === 'elemento' && itemArrastrado.id === elemento.id) || (itemRedimensionando?.tipo === 'elemento' && itemRedimensionando.id === elemento.id) ? 'activo-top' : ''}`}
                  style={{
                    left: `${elemento.x}px`, top: `${elemento.y}px`,
                    width: `${elemento.ancho}px`, height: `${elemento.alto}px`
                  }}
                >
                  <div className="box-fondo-color">
                    <Icono className="puesto-icon-dinamico" />
                    <strong>{elemento.nombre}</strong>
                    <span>{info.etiqueta}</span>
                  </div>

                  {modoDiseno && (
                    <div
                      className="resize-handle"
                      onPointerDown={(e) => iniciarRedimension(e, 'elemento', elemento)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: TAMAÑO DE PUESTO
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

      {/* =======================================================
          MODAL: AGREGAR ZONA (elemento que no es un negocio)
      ======================================================= */}
      {mostrarModalZona && (
        <Modal
          titulo={<><FaPlus color="var(--indigo-profundo)" aria-hidden="true" /> Agregar zona al plano</>}
          onCerrar={() => setMostrarModalZona(false)}
        >
          <form onSubmit={crearElementoZona} className="formulario">
            <p className="info-text"><FaInfoCircle aria-hidden="true" /> Se agrega centrada en el plano; después la arrastrás a su lugar.</p>

            <div className="input-group">
              <label htmlFor="zona-tipo">Tipo</label>
              <select
                id="zona-tipo" className="pi-select-rol" value={formZona.tipo}
                onChange={(e) => cambiarTipoZona(e.target.value)}
              >
                {TIPOS_ELEMENTO_MAPA.map(t => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="zona-nombre">Nombre</label>
              <input
                id="zona-nombre" type="text" value={formZona.nombre}
                onChange={(e) => setFormZona(f => ({ ...f, nombre: e.target.value, nombreTocado: true }))}
                placeholder="Ej: Entrada Norte" required
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancelar" onClick={() => setMostrarModalZona(false)}>Cancelar</button>
              <button type="submit" className="btn-primario"><FaSave /> Agregar</button>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}

    </div>
  );
}
