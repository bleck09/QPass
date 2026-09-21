import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useModal } from '../../utils/useModal.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import BotonVolver from '../../components/BotonVolver.jsx';
import {
  FaPlus, FaTrash, FaSave, FaEye, FaImage, FaUpload, FaPalette, FaTextHeight,
  FaListUl, FaRegCalendarAlt, FaUndo, FaTimes, FaCalendarAlt, FaDesktop,
  FaMobileAlt, FaArrowUp, FaArrowDown, FaSortAmountDown, FaCheckCircle,
  FaExclamationTriangle, FaMagic, FaExpand,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import { contraste } from '../../utils/contraste.js';
import {
  ICONOS_ACTIVIDAD, ACTIVIDADES_POR_DEFECTO, PALETAS_LANDING, iconoActividad, esAjusteDefecto,
} from '../../constants/landingEvento.js';
import VistaPreviaPagina from './VistaPreviaPagina.jsx';
import AjusteImagen from './AjusteImagen.jsx';
import './AdminConfigurarPagina.css';
import './ConfigurarPaginaEditor.css';

// Selector de color: un cuadrado grande clickeable (el <input type="color">
// nativo va invisible encima, mismo truco que .upload-input-hidden) + un
// campo de texto para tipear/pegar el código hex directo.
function ColorField({ id, label, value, onChange }) {
  return (
    <div className="pi-admin-form-group">
      <label htmlFor={id}>{label}</label>
      <div className="pi-admin-color-picker">
        <span className="pi-admin-color-swatch" style={{ backgroundColor: value }}>
          <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </span>
        <input
          type="text"
          className="pi-admin-color-hex"
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          aria-label={`${label} (código hex)`}
        />
      </div>
    </div>
  );
}

// Base para un evento sin config propia y para "Restablecer": sin texto ni
// imagen de relleno (el título es el nombre del evento y sin imagen propia se
// usa la portada del evento). Los colores son la paleta "Noche cian".
const [PALETA_BASE] = PALETAS_LANDING;
const defaultLandingConfig = {
  informacion: '',
  imagen: '',
  imagenAjuste: null, // encuadre/zoom/oscurecido/desenfoque; null = sin ajustar
  colorPrimario: PALETA_BASE.colorPrimario,
  colorBoton: PALETA_BASE.colorBoton,
  colorFondo: PALETA_BASE.colorFondo,
  colorTextoTitulo: PALETA_BASE.colorTextoTitulo,
  colorTextoP: PALETA_BASE.colorTextoP,
  actividades: ACTIVIDADES_POR_DEFECTO,
  cronograma: [
    { hora: '20:00', actividad: 'Apertura de puertas' },
    { hora: '21:30', actividad: 'Inicio de shows en vivo' },
    { hora: '02:00', actividad: 'Cierre del evento' },
  ],
};

const CLAVES_COLOR = ['colorPrimario', 'colorBoton', 'colorFondo', 'colorTextoTitulo', 'colorTextoP'];
const DESCRIPCION_IDEAL = 220; // caracteres: más largo se corta mal en el hero

const normalizarConfig = (config) => ({
  ...defaultLandingConfig,
  ...config,
  colorBoton: config.colorBoton || defaultLandingConfig.colorBoton,
  actividades: config.actividades ?? [],
  cronograma: config.cronograma ?? [],
  imagenAjuste: config.imagenAjuste ?? null,
});

const mismaPaleta = (config, paleta) =>
  CLAVES_COLOR.every((k) => String(config[k]).toUpperCase() === paleta[k].toUpperCase());

// Hora siguiente sugerida para una fila nueva del cronograma: +1 h de la última.
const horaSiguiente = (cronograma) => {
  const ultima = cronograma[cronograma.length - 1]?.hora;
  if (!/^\d{2}:\d{2}$/.test(ultima || '')) return '';
  const [h, m] = ultima.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function AdminConfigurarPagina({
  eventoId: eventoIdProp = null,
  eventoNombre: eventoNombreProp = null,
  eventoImagen: eventoImagenProp = null,
  evento: eventoProp = null,
  embebido = false,
} = {}) {
  useTituloPagina('Configurar página del evento', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(eventoIdProp || location.state?.eventoId || '');
  // El nombre del evento ES el título de la landing (no se edita acá) y su
  // portada se usa si no se sube una específica para la landing.
  const eventoSeleccionado = eventoProp ?? eventosDisponibles.find(ev => ev.id === eventoId);
  const eventoNombre = eventoNombreProp ?? eventoSeleccionado?.nombre ?? '';
  const eventoImagen = eventoImagenProp ?? eventoSeleccionado?.imagen ?? '';
  const eventoParaPreview = { ...eventoSeleccionado, nombre: eventoNombre, imagen: eventoImagen };

  // Si la petición falla se cae a los valores por defecto: la página siempre es usable.
  const cargarConfig = useCallback(
    () => api.landingConfig.obtener(eventoId).then(normalizarConfig).catch(() => defaultLandingConfig),
    [eventoId],
  );
  const {
    data: config,
    setData: setConfig,
    cargando: cargandoConfig,
  } = useApi(cargarConfig, { inicial: defaultLandingConfig, activo: !!eventoId });

  // "Cambios sin guardar": se compara contra la última versión cargada o
  // guardada. Se toma la foto al terminar de cargar cada evento (ajuste de
  // estado durante el render, sin efecto).
  const [base, setBase] = useState({ id: null, json: '' });
  if (!cargandoConfig && eventoId && base.id !== eventoId) {
    setBase({ id: eventoId, json: JSON.stringify(config) });
  }
  const hayCambios = base.id === eventoId && JSON.stringify(config) !== base.json;

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [guardando, setGuardando] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dispositivo, setDispositivo] = useState('escritorio');
  const [resaltar, setResaltar] = useState(null);
  const [iconosAbiertos, setIconosAbiertos] = useState(null); // índice de la actividad
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const modalPreviewRef = useModal(showPreview, () => setShowPreview(false));

  useEffect(() => {
    if (embebido) return;
    api.eventos.listarTodos().then(lista => {
      setEventosDisponibles(lista);
      setEventoId(prev => prev || lista[0]?.id);
    });
  }, [embebido]);

  // Aviso al cerrar la pestaña del navegador con cambios pendientes.
  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  const eventoBloqueado = embebido || !!location.state?.eventoId;

  const avisar = (texto, tipo = 'exito') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const cambiar = (campo, valor) => setConfig(c => ({ ...c, [campo]: valor }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'landing');
      // Foto nueva: el encuadre de la anterior ya no aplica.
      setConfig(c => ({ ...c, imagen: url, imagenAjuste: null }));
    } catch (err) {
      avisar(err.message, 'aviso');
    }
  };

  // --- Listas (actividades / cronograma), sin mutar los objetos existentes ---
  const actualizarFila = (clave, index, campo, valor) =>
    setConfig(c => ({ ...c, [clave]: c[clave].map((f, i) => (i === index ? { ...f, [campo]: valor } : f)) }));
  const agregarFila = (clave, fila) => setConfig(c => ({ ...c, [clave]: [...c[clave], fila] }));
  const quitarFila = (clave, index) => setConfig(c => ({ ...c, [clave]: c[clave].filter((_, i) => i !== index) }));
  const moverFila = (clave, index, delta) => setConfig(c => {
    const lista = [...c[clave]];
    const destino = index + delta;
    if (destino < 0 || destino >= lista.length) return c;
    [lista[index], lista[destino]] = [lista[destino], lista[index]];
    return { ...c, [clave]: lista };
  });
  const ordenarCronograma = () => setConfig(c => ({
    ...c,
    cronograma: [...c.cronograma].sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99')),
  }));

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      // El backend todavía guarda un "titulo": se manda el nombre del evento.
      const guardada = normalizarConfig(await api.landingConfig.guardar(eventoId, { ...config, titulo: eventoNombre }));
      setConfig(guardada);
      setBase({ id: eventoId, json: JSON.stringify(guardada) });
      avisar('¡Página del evento actualizada!');
    } catch (err) {
      avisar(err.message || 'No se pudo guardar. Probá de nuevo.', 'aviso');
    } finally {
      setGuardando(false);
    }
  };

  const restablecerValores = async () => {
    const ok = await confirmar({
      titulo: '¿Restablecer el diseño?',
      mensaje: 'Se descartan tus cambios y la página vuelve al diseño por defecto (paleta, actividades y cronograma de ejemplo).',
      textoConfirmar: 'Restablecer',
      peligroso: true,
    });
    if (!ok) return;
    const guardada = normalizarConfig(await api.landingConfig.guardar(eventoId, { ...defaultLandingConfig, titulo: eventoNombre }));
    setConfig(guardada);
    setBase({ id: eventoId, json: JSON.stringify(guardada) });
    avisar('Se restauraron los valores por defecto.', 'aviso');
  };

  // Contraste de lo que se va a leer (WCAG: 4.5:1 para texto normal).
  const chequeos = [
    { etiqueta: 'Títulos sobre el fondo', valor: contraste(config.colorTextoTitulo, config.colorFondo) },
    { etiqueta: 'Textos sobre el fondo', valor: contraste(config.colorTextoP, config.colorFondo) },
    { etiqueta: 'Texto del botón', valor: contraste(config.colorFondo, config.colorBoton) },
  ];
  const problemasContraste = chequeos.filter(c => c.valor != null && c.valor < 4.5).length;

  // Props para que cada sección del editor resalte su zona en la vista previa.
  const zona = (id) => ({
    onPointerEnter: () => setResaltar(id),
    onPointerLeave: () => setResaltar(null),
    onFocus: () => setResaltar(id),
    onBlur: () => setResaltar(null),
  });

  return (
    <div className="pi-admin-container">

      {!embebido && (
        <BotonVolver onClick={() => navigate('/admin/eventos', { state: { eventoId } })}>
          Volver al evento
        </BotonVolver>
      )}

      {!embebido && (
        <div className="pi-admin-header">
          <h1>Página del evento</h1>
          <div className="pi-admin-selector-evento">
            <FaCalendarAlt />
            {eventoBloqueado ? (
              <strong>{eventoNombre || 'Evento'}</strong>
            ) : (
              <select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                {eventosDisponibles.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* ---------- Barra de acciones (fija arriba al bajar) ---------- */}
      <div className={`pi-cfg-barra${hayCambios ? ' hay-cambios' : ''}`}>
        <span className="pi-cfg-estado" role="status">
          {hayCambios
            ? <><span className="pi-cfg-punto" aria-hidden="true" /> Cambios sin guardar</>
            : <><FaCheckCircle aria-hidden="true" /> Todo guardado</>}
        </span>
        <div className="pi-cfg-barra-acciones">
          <button type="button" className="pi-admin-btn-reset" onClick={restablecerValores}>
            <FaUndo aria-hidden="true" /> Restablecer
          </button>
          <button type="button" className="pi-admin-btn-preview" onClick={() => setShowPreview(true)}>
            <FaExpand aria-hidden="true" /> Vista completa
          </button>
          <button type="button" className="pi-admin-btn-save" onClick={guardarConfiguracion} disabled={guardando || !hayCambios}>
            <FaSave aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`pi-admin-alert ${mensaje.tipo === 'aviso' ? 'pi-admin-alert-aviso' : ''}`} role="status">
          {mensaje.texto}
        </div>
      )}

      {cargandoConfig ? (
        <EstadoCarga filas={6} etiqueta="Cargando configuración…" />
      ) : (
      <div className="pi-cfg-layout">
        <div className="pi-cfg-editor">

          {/* ===== 1. COLORES ===== */}
          <section className="pi-admin-card pi-cfg-seccion" {...zona('colores')}>
            <h3><span className="pi-cfg-num">1</span><FaPalette aria-hidden="true" /> Colores</h3>

            <p className="texto-ayuda"><FaMagic aria-hidden="true" /> Elegí una paleta lista o ajustá cada color a mano.</p>
            <div className="pi-cfg-paletas">
              {PALETAS_LANDING.map((p) => (
                <button
                  key={p.nombre}
                  type="button"
                  className={`pi-cfg-paleta${mismaPaleta(config, p) ? ' activa' : ''}`}
                  onClick={() => setConfig(c => ({ ...c, ...Object.fromEntries(CLAVES_COLOR.map(k => [k, p[k]])) }))}
                  aria-pressed={mismaPaleta(config, p)}
                >
                  <span className="pi-cfg-paleta-muestra" style={{ background: p.colorFondo }} aria-hidden="true">
                    <i style={{ background: p.colorTextoTitulo }} />
                    <i style={{ background: p.colorPrimario }} />
                    <i style={{ background: p.colorBoton }} />
                  </span>
                  {p.nombre}
                </button>
              ))}
            </div>

            <div className="pi-admin-colors-grid">
              <ColorField id="cfg-colorFondo" label="Fondo de la página" value={config.colorFondo} onChange={(v) => cambiar('colorFondo', v)} />
              <ColorField id="cfg-colorTextoTitulo" label="Títulos" value={config.colorTextoTitulo} onChange={(v) => cambiar('colorTextoTitulo', v)} />
              <ColorField id="cfg-colorTextoP" label="Textos generales" value={config.colorTextoP} onChange={(v) => cambiar('colorTextoP', v)} />
              <ColorField id="cfg-colorPrimario" label="Acento (íconos, detalles)" value={config.colorPrimario} onChange={(v) => cambiar('colorPrimario', v)} />
              <ColorField id="cfg-colorBoton" label="Botón principal" value={config.colorBoton} onChange={(v) => cambiar('colorBoton', v)} />
            </div>

            <ul className="pi-cfg-contraste" aria-label="Legibilidad de los colores">
              {chequeos.map(({ etiqueta, valor }) => {
                const ok = valor == null || valor >= 4.5;
                return (
                  <li key={etiqueta} className={ok ? 'ok' : 'mal'}>
                    {ok ? <FaCheckCircle aria-hidden="true" /> : <FaExclamationTriangle aria-hidden="true" />}
                    <span>{etiqueta}</span>
                    <b>{valor ? `${valor.toFixed(1)}:1` : '—'}</b>
                    <em>{ok ? 'Se lee bien' : 'Poco contraste'}</em>
                  </li>
                );
              })}
            </ul>
            {problemasContraste > 0 && (
              <p className="pi-cfg-aviso">
                <FaExclamationTriangle aria-hidden="true" /> Algunos textos pueden costar leerse. Probá un fondo más oscuro o textos más claros (mínimo recomendado 4.5:1).
              </p>
            )}
          </section>

          {/* ===== 2. TEXTOS E IMAGEN ===== */}
          <section className="pi-admin-card pi-cfg-seccion" {...zona('textos')}>
            <h3><span className="pi-cfg-num">2</span><FaTextHeight aria-hidden="true" /> Textos e imagen</h3>

            <div className="pi-admin-form-group">
              <label>Título principal</label>
              <p className="pi-admin-titulo-fijo">{eventoNombre || '(nombre del evento)'}</p>
              <p className="texto-ayuda">Es el nombre del evento: se edita en "Editar evento", no acá.</p>
            </div>

            <div className="pi-admin-form-group">
              <label htmlFor="cfg-informacion">Descripción</label>
              <textarea
                id="cfg-informacion" rows="4" value={config.informacion}
                onChange={(e) => cambiar('informacion', e.target.value)}
                placeholder="Contale a la gente de qué se trata: artistas, ambiente, qué incluye…"
              />
              <span className={`pi-cfg-contador${config.informacion.length > DESCRIPCION_IDEAL ? ' largo' : ''}`}>
                {config.informacion.length} / {DESCRIPCION_IDEAL} recomendados
              </span>
            </div>

            <div className="pi-admin-form-group">
              <label><FaImage aria-hidden="true" /> Imagen de fondo del encabezado</label>
              {config.imagen ? (
                <div className="pi-cfg-imagen">
                  <img width="480" height="200" src={config.imagen} alt="Imagen de la página" />
                  <span className="pi-cfg-imagen-tag">Imagen propia de la página</span>
                  <button type="button" className="btn-quitar-imagen" onClick={() => setConfig(c => ({ ...c, imagen: '', imagenAjuste: null }))}>
                    <FaTimes aria-hidden="true" /> Quitar (usar la del evento)
                  </button>
                </div>
              ) : (
                <div className="pi-cfg-imagen-doble">
                  {eventoImagen && (
                    <div className="pi-cfg-imagen">
                      <img width="480" height="200" src={eventoImagen} alt="Portada del evento" />
                      <span className="pi-cfg-imagen-tag">En uso: portada del evento</span>
                    </div>
                  )}
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" aria-hidden="true" />
                    <span className="upload-text">Subí una foto distinta para la página</span>
                    <span className="upload-subtext">Clic o arrastrar · PNG/JPG hasta 3MB · horizontal queda mejor</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" aria-label="Subir imagen de la página" />
                  </div>
                </div>
              )}

              {(config.imagen || eventoImagen) && (
                <AjusteImagen
                  imagen={config.imagen || eventoImagen}
                  ajuste={config.imagenAjuste}
                  // Sin ajuste real se guarda null: no marca "cambios" de más.
                  onChange={(v) => cambiar('imagenAjuste', v && !esAjusteDefecto(v) ? v : null)}
                />
              )}
            </div>
          </section>

          {/* ===== 3. ACTIVIDADES ===== */}
          <section className="pi-admin-card pi-cfg-seccion" {...zona('actividades')}>
            <div className="pi-admin-card-header">
              <h3><span className="pi-cfg-num">3</span><FaListUl aria-hidden="true" /> Servicios / actividades</h3>
              <button type="button" className="pi-admin-btn-add" onClick={() => agregarFila('actividades', { icono: 'music', titulo: '', descripcion: '' })}>
                <FaPlus aria-hidden="true" /> Añadir
              </button>
            </div>
            <p className="texto-ayuda">Lo que el asistente va a encontrar: música, comida, zona VIP, estacionamiento…</p>

            {config.actividades.length === 0 && (
              <div className="pi-cfg-vacio">
                <p>No hay actividades cargadas.</p>
                <button type="button" className="pi-admin-btn-add" onClick={() => cambiar('actividades', ACTIVIDADES_POR_DEFECTO)}>
                  <FaMagic aria-hidden="true" /> Usar las sugeridas
                </button>
              </div>
            )}

            {config.actividades.map((act, index) => {
              const Icono = iconoActividad(act.icono);
              const abierto = iconosAbiertos === index;
              return (
                <div key={index} className="pi-cfg-fila">
                  <button
                    type="button"
                    className="pi-cfg-icono-btn"
                    style={{ color: config.colorPrimario, background: config.colorFondo }}
                    onClick={() => setIconosAbiertos(abierto ? null : index)}
                    aria-expanded={abierto}
                    aria-label={`Ícono: ${ICONOS_ACTIVIDAD[act.icono]?.etiqueta ?? 'QR'}. Cambiar`}
                  >
                    <Icono aria-hidden="true" />
                  </button>
                  <div className="pi-admin-dynamic-inputs">
                    <input type="text" placeholder="Título (ej. Música en vivo)" value={act.titulo} onChange={(e) => actualizarFila('actividades', index, 'titulo', e.target.value)} aria-label={`Título de la actividad ${index + 1}`} />
                    <input type="text" placeholder="Descripción corta" value={act.descripcion} onChange={(e) => actualizarFila('actividades', index, 'descripcion', e.target.value)} aria-label={`Descripción de la actividad ${index + 1}`} />
                  </div>
                  <div className="pi-cfg-fila-acciones">
                    <button type="button" onClick={() => moverFila('actividades', index, -1)} disabled={index === 0} aria-label="Subir"><FaArrowUp aria-hidden="true" /></button>
                    <button type="button" onClick={() => moverFila('actividades', index, 1)} disabled={index === config.actividades.length - 1} aria-label="Bajar"><FaArrowDown aria-hidden="true" /></button>
                    <button type="button" className="borrar" onClick={() => { setIconosAbiertos(null); quitarFila('actividades', index); }} aria-label="Quitar"><FaTrash aria-hidden="true" /></button>
                  </div>

                  {abierto && (
                    <div className="pi-cfg-iconos" role="group" aria-label="Elegir ícono">
                      {Object.entries(ICONOS_ACTIVIDAD).map(([clave, { Icono: Ic, etiqueta }]) => (
                        <button
                          key={clave}
                          type="button"
                          className={act.icono === clave ? 'activo' : ''}
                          onClick={() => { actualizarFila('actividades', index, 'icono', clave); setIconosAbiertos(null); }}
                          aria-pressed={act.icono === clave}
                        >
                          <Ic aria-hidden="true" />
                          <span>{etiqueta}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* ===== 4. CRONOGRAMA ===== */}
          <section className="pi-admin-card pi-cfg-seccion" {...zona('cronograma')}>
            <div className="pi-admin-card-header">
              <h3><span className="pi-cfg-num">4</span><FaRegCalendarAlt aria-hidden="true" /> Cronograma</h3>
              <div className="pi-cfg-header-btns">
                {config.cronograma.length > 1 && (
                  <button type="button" className="pi-admin-btn-add pi-cfg-btn-sec" onClick={ordenarCronograma}>
                    <FaSortAmountDown aria-hidden="true" /> Ordenar por hora
                  </button>
                )}
                <button type="button" className="pi-admin-btn-add" onClick={() => agregarFila('cronograma', { hora: horaSiguiente(config.cronograma), actividad: '' })}>
                  <FaPlus aria-hidden="true" /> Añadir
                </button>
              </div>
            </div>
            <p className="texto-ayuda">Los primeros 4 se ven en el encabezado; el resto, en "Ver todas las actividades".</p>

            {config.cronograma.length === 0 && <p className="pi-cfg-vacio">Todavía no hay horarios cargados.</p>}

            <ol className="pi-cfg-crono">
              {config.cronograma.map((item, index) => (
                <li key={index} className="pi-cfg-fila">
                  <span className="pi-cfg-crono-punto" aria-hidden="true" />
                  <input type="time" value={item.hora} onChange={(e) => actualizarFila('cronograma', index, 'hora', e.target.value)} className="pi-admin-time-input" aria-label={`Hora ${index + 1}`} />
                  <input type="text" placeholder="¿Qué pasa a esta hora?" value={item.actividad} className="pi-cfg-crono-texto" onChange={(e) => actualizarFila('cronograma', index, 'actividad', e.target.value)} aria-label={`Actividad ${index + 1}`} />
                  <div className="pi-cfg-fila-acciones">
                    <button type="button" onClick={() => moverFila('cronograma', index, -1)} disabled={index === 0} aria-label="Subir"><FaArrowUp aria-hidden="true" /></button>
                    <button type="button" onClick={() => moverFila('cronograma', index, 1)} disabled={index === config.cronograma.length - 1} aria-label="Bajar"><FaArrowDown aria-hidden="true" /></button>
                    <button type="button" className="borrar" onClick={() => quitarFila('cronograma', index)} aria-label="Quitar"><FaTrash aria-hidden="true" /></button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ---------- Vista previa en vivo ---------- */}
        <aside className="pi-cfg-preview" aria-label="Vista previa en vivo">
          <div className="pi-cfg-preview-barra">
            <span><FaEye aria-hidden="true" /> Vista previa en vivo</span>
            <div className="pi-cfg-dispositivos" role="group" aria-label="Tamaño de la vista previa">
              <button type="button" className={dispositivo === 'escritorio' ? 'activo' : ''} onClick={() => setDispositivo('escritorio')} aria-pressed={dispositivo === 'escritorio'} aria-label="Escritorio">
                <FaDesktop aria-hidden="true" />
              </button>
              <button type="button" className={dispositivo === 'celular' ? 'activo' : ''} onClick={() => setDispositivo('celular')} aria-pressed={dispositivo === 'celular'} aria-label="Celular">
                <FaMobileAlt aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={`pi-cfg-marco pi-cfg-marco--${dispositivo}`}>
            <VistaPreviaPagina config={config} evento={eventoParaPreview} resaltar={resaltar} />
          </div>
          <p className="pi-cfg-preview-nota">Pasá el mouse por una sección del editor para ver dónde aparece.</p>
        </aside>
      </div>
      )}

      {/* ---------- Vista completa ---------- */}
      {showPreview && createPortal(
        <div className="pi-admin-modal-overlay pi-cfg-modal-overlay" onClick={() => setShowPreview(false)}>
          <div
            ref={modalPreviewRef}
            tabIndex={-1}
            className="pi-cfg-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cfg-preview-titulo"
          >
            <div className="pi-cfg-modal-header">
              <h3 id="cfg-preview-titulo">Vista completa · {eventoNombre}</h3>
              <button type="button" className="pi-admin-btn-close-dark" onClick={() => setShowPreview(false)} aria-label="Cerrar"><FaTimes aria-hidden="true" /></button>
            </div>
            <div className="pi-cfg-modal-body">
              <VistaPreviaPagina config={config} evento={eventoParaPreview} />
            </div>
          </div>
        </div>,
        document.body,
      )}

      {DialogoConfirmar}
    </div>
  );
}
