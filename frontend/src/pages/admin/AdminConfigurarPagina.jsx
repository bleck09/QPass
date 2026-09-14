import { useCallback, useEffect, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useModal } from '../../utils/useModal.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import BotonVolver from '../../components/BotonVolver.jsx';
import {
  FaPlus, FaTrash, FaSave, FaEye, FaImage, FaUpload,
  FaPalette, FaTextHeight, FaListUl, FaRegCalendarAlt, FaUndo,
  FaTicketAlt, FaChartLine, FaExchangeAlt, FaStore, FaQrcode,
  FaTimes, FaClock, FaCalendarAlt
} from 'react-icons/fa';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import './AdminConfigurarPagina.css';

// Selector de color: un cuadrado grande clickeable (el <input type="color">
// nativo va invisible encima, mismo truco que .upload-input-hidden) + un
// campo de texto para tipear/pegar el código hex directo — antes era un
// cuadradito nativo del navegador solo, chico e incómodo de usar.
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

// Base para un evento que todavía no tiene landing config propia, y para
// "Restablecer": SIN texto/imagen de relleno (antes traían un párrafo y una
// foto de stock fijos, que se veían como si ya fueran el contenido real del
// evento) — el título es siempre el nombre del evento (ver `eventoNombre`,
// no es un campo editable acá) y sin imagen propia cae en la portada del
// evento (ver `eventoImagen`). Los colores sí son un punto de partida real
// (una paleta, no "contenido"), y actividades/cronograma quedan como
// ejemplo editable de las filas que se pueden agregar.
const defaultLandingConfig = {
  informacion: '',
  imagen: '',
  colorPrimario: '#00B4D8',
  colorBoton: '#FFFFFF',        
  colorFondo: '#0b1120',        
  colorTextoTitulo: '#FFFFFF',  
  colorTextoP: '#94A3B8',       
  actividades: [
    { icono: 'ticket', titulo: 'Recaudación Diaria', descripcion: 'Registro exacto de ingresos.' },
    { icono: 'chart', titulo: 'Auditoría Continua', descripcion: 'Supervisión en tiempo real.' },
    { icono: 'sync', titulo: 'Devoluciones', descripcion: 'Reembolsos rápidos y seguros.' },
    { icono: 'store', titulo: 'Gestión de Puestos', descripcion: 'Control total de inventario.' }
  ],
  cronograma: [
    { hora: '08:00', actividad: 'Apertura de puertas y entrega de pulseras QR' },
    { hora: '13:00', actividad: 'Inicio de shows en vivo y apertura de patios de comida' },
    { hora: '23:30', actividad: 'Cierre del evento y balance de cajas' }
  ]
};

const opcionesIconos = [
  { valor: 'ticket', etiqueta: 'Ticket / Entrada' },
  { valor: 'chart', etiqueta: 'Gráfico / Finanzas' },
  { valor: 'sync', etiqueta: 'Sincronizar / Devolución' },
  { valor: 'store', etiqueta: 'Tienda / Puesto' },
  { valor: 'qrcode', etiqueta: 'Código QR' }
];

const normalizarConfig = (config) => {
  if (!config.colorBoton) config.colorBoton = defaultLandingConfig.colorBoton;
  return config;
};

export default function AdminConfigurarPagina({
  eventoId: eventoIdProp = null,
  eventoNombre: eventoNombreProp = null,
  eventoImagen: eventoImagenProp = null,
  embebido = false,
} = {}) {
  useTituloPagina('Configurar página del evento', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(eventoIdProp || location.state?.eventoId || '');
  // El nombre del evento ES el título principal de la landing (no hay un
  // campo de título aparte para editar) y su foto de portada es la que se
  // usa acá si no se sube una específica para la landing. Si no vienen por
  // props (uso standalone, sin AdminGestionEventos de por medio), se sacan
  // del selector de eventos ya cargado más abajo.
  const eventoSeleccionado = eventosDisponibles.find(ev => ev.id === eventoId);
  const eventoNombre = eventoNombreProp ?? eventoSeleccionado?.nombre ?? '';
  const eventoImagen = eventoImagenProp ?? eventoSeleccionado?.imagen ?? '';

  // Config de la landing con estado de carga (Manual 8.9). Si la petición falla
  // se cae a los valores por defecto (comportamiento previo), por eso no hay
  // estado de "error" visible: la página siempre es usable.
  const cargarConfig = useCallback(
    () => api.landingConfig.obtener(eventoId).then(normalizarConfig).catch(() => defaultLandingConfig),
    [eventoId],
  );
  const {
    data: config,
    setData: setConfig,
    cargando: cargandoConfig,
  } = useApi(cargarConfig, { inicial: defaultLandingConfig, activo: !!eventoId });

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [confirmar, DialogoConfirmar] = useConfirmar();

  // Modal de vista previa (look propio "dark glass"): foco + ESC + scroll-lock.
  const modalPreviewRef = useModal(showPreview, () => setShowPreview(false));

  useEffect(() => {
    if (embebido) return;
    api.eventos.listarTodos().then(lista => {
      setEventosDisponibles(lista);
      setEventoId(prev => prev || lista[0]?.id);
    });
  }, [embebido]);

  const cambiarEvento = (nuevoId) => setEventoId(nuevoId);
  // Embebido o llegado desde Gestión de Eventos: evento fijo (sin selector/volver).
  const eventoBloqueado = embebido || !!location.state?.eventoId;

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'landing');
      setConfig({ ...config, imagen: url });
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'aviso' });
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    }
  };

  const updateArray = (key, index, campo, valor) => {
    const newArray = [...config[key]];
    newArray[index][campo] = valor;
    setConfig({ ...config, [key]: newArray });
  };

  const addToArray = (key, defaultItem) => {
    setConfig({ ...config, [key]: [...config[key], defaultItem] });
  };

  const removeFromArray = (key, index) => {
    setConfig({ ...config, [key]: config[key].filter((_, i) => i !== index) });
  };

  const guardarConfiguracion = async () => {
    // El backend todavía guarda un "titulo" — se manda el nombre del evento
    // sin mostrar el campo (no hay dos títulos que editar por separado).
    const guardada = await api.landingConfig.guardar(eventoId, { ...config, titulo: eventoNombre });
    setConfig(normalizarConfig(guardada));
    setMensaje({ texto: '¡Página de inicio actualizada con éxito!', tipo: 'exito' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const restablecerValores = async () => {
    const ok = await confirmar({
      titulo: '¿Restablecer el diseño?',
      mensaje: 'Se descartarán tus cambios y la página volverá a los valores originales del diseño por defecto.',
      textoConfirmar: 'Restablecer',
      peligroso: true,
    });
    if (!ok) return;
    const guardada = await api.landingConfig.guardar(eventoId, { ...defaultLandingConfig, titulo: eventoNombre });
    setConfig(normalizarConfig(guardada));
    setMensaje({ texto: 'Se han restaurado los valores por defecto.', tipo: 'aviso' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const renderIconoPrevio = (valor) => {
    switch(valor) {
      case 'ticket': return <FaTicketAlt />;
      case 'chart': return <FaChartLine />;
      case 'sync': return <FaExchangeAlt />;
      case 'store': return <FaStore />;
      default: return <FaQrcode />;
    }
  };

  return (
    <div className="pi-admin-container">

      {!embebido && (
        <BotonVolver onClick={() => navigate('/admin/eventos', { state: { eventoId } })}>
          Volver al evento
        </BotonVolver>
      )}

      <div className="pi-admin-header">
        {!embebido && <h1>Gestión de la landing page</h1>}
        {!embebido && (
          <div className="pi-admin-selector-evento">
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
        <div className="pi-admin-header-actions">
          <button type="button" className="pi-admin-btn-reset" onClick={restablecerValores}>
            <FaUndo /> Restablecer
          </button>
          
          <button type="button" className="pi-admin-btn-preview" onClick={() => setShowPreview(true)}>
            <FaEye /> Vista Previa Completa
          </button>
          <button type="button" className="pi-admin-btn-save" onClick={guardarConfiguracion}>
            <FaSave /> Guardar Cambios
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`pi-admin-alert ${mensaje.tipo === 'aviso' ? 'pi-admin-alert-aviso' : ''}`}>
          {mensaje.texto}
        </div>
      )}

      {cargandoConfig ? (
        <EstadoCarga filas={6} etiqueta="Cargando configuración…" />
      ) : (
      <div className="pi-admin-grid">

        {/* SECCIÓN 1: COLORES */}
        <div className="pi-admin-card">
          <h3><FaPalette color="var(--cian-digital-texto)" /> Apariencia y Colores</h3>
          <p className="texto-ayuda">Edita la paleta de colores de tu página principal.</p>
          <div className="pi-admin-colors-grid">
            <ColorField id="cfg-colorPrimario" label="Color de acento (detalles)" value={config.colorPrimario} onChange={(v) => setConfig({ ...config, colorPrimario: v })} />
            <ColorField id="cfg-colorBoton" label="Botón principal" value={config.colorBoton} onChange={(v) => setConfig({ ...config, colorBoton: v })} />
            <ColorField id="cfg-colorFondo" label="Fondo de la página" value={config.colorFondo} onChange={(v) => setConfig({ ...config, colorFondo: v })} />
            <ColorField id="cfg-colorTextoTitulo" label="Textos de títulos" value={config.colorTextoTitulo} onChange={(v) => setConfig({ ...config, colorTextoTitulo: v })} />
            <ColorField id="cfg-colorTextoP" label="Textos generales" value={config.colorTextoP} onChange={(v) => setConfig({ ...config, colorTextoP: v })} />
          </div>
        </div>

        {/* SECCIÓN 2: TEXTOS E IMAGEN */}
        <div className="pi-admin-card">
          <h3><FaTextHeight color="var(--cian-digital-texto)" /> Textos Principales e Imagen</h3>

          <div className="pi-admin-form-group">
            <label>Título principal</label>
            <p className="pi-admin-titulo-fijo">{eventoNombre || '(nombre del evento)'}</p>
            <p className="texto-ayuda">Es el nombre del evento — se edita en Gestión de Eventos, no acá.</p>
          </div>

          <div className="pi-admin-form-group">
            <label htmlFor="cfg-informacion">Información / descripción</label>
            <textarea
              id="cfg-informacion" name="informacion" rows="3" value={config.informacion} onChange={handleChange}
              placeholder="Contale a la gente de qué se trata el evento…"
            />
          </div>

          <div className="pi-admin-form-group">
            <label><FaImage aria-hidden="true" /> Imagen de portada de la landing</label>
            <p className="texto-ayuda">Si no subís una acá, se usa la foto de portada del evento.</p>
            {config.imagen ? (
              <div className="preview-zone">
                <img width="480" height="200" src={config.imagen} alt="Vista previa" className="pi-admin-preview-img" />
                <button type="button" className="btn-quitar-imagen" onClick={() => setConfig({ ...config, imagen: '' })}>
                  <FaTimes aria-hidden="true" /> Quitar (usar la del evento)
                </button>
              </div>
            ) : (
              <>
                {eventoImagen && (
                  <img width="480" height="200" src={eventoImagen} alt="Portada del evento" className="pi-admin-preview-img" />
                )}
                <div className="upload-zone">
                  <FaUpload className="upload-icon" aria-hidden="true" />
                  <span className="upload-text">Hacé clic para subir una foto distinta para la landing</span>
                  <span className="upload-subtext">PNG, JPG hasta 3MB</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECCIÓN 3: ACTIVIDADES */}
        <div className="pi-admin-card">
          <div className="pi-admin-card-header">
            <h3><FaListUl color="var(--cian-digital-texto)" /> Actividades Destacadas</h3>
            <button type="button" className="pi-admin-btn-add" onClick={() => addToArray('actividades', { icono: 'ticket', titulo: '', descripcion: '' })}>
              <FaPlus /> Añadir Fila
            </button>
          </div>
          {config.actividades.map((act, index) => (
            <div key={index} className="pi-admin-dynamic-row">
              <div className="icon-selector-wrapper">
                <span className="icon-preview" style={{ color: config.colorPrimario }}>{renderIconoPrevio(act.icono)}</span>
                <select value={act.icono} onChange={(e) => updateArray('actividades', index, 'icono', e.target.value)} className="pi-admin-select-icon">
                  {opcionesIconos.map(opc => <option key={opc.valor} value={opc.valor}>{opc.etiqueta}</option>)}
                </select>
              </div>
              <div className="pi-admin-dynamic-inputs">
                <input type="text" placeholder="Título" value={act.titulo} onChange={(e) => updateArray('actividades', index, 'titulo', e.target.value)} />
                <input type="text" placeholder="Descripción" value={act.descripcion} onChange={(e) => updateArray('actividades', index, 'descripcion', e.target.value)} />
              </div>
              <button type="button" className="pi-admin-btn-delete" onClick={() => removeFromArray('actividades', index)}><FaTrash /></button>
            </div>
          ))}
        </div>

        {/* SECCIÓN 4: CRONOGRAMA */}
        <div className="pi-admin-card">
          <div className="pi-admin-card-header">
            <h3><FaRegCalendarAlt color="var(--cian-digital-texto)" /> Cronograma</h3>
            <button type="button" className="pi-admin-btn-add" onClick={() => addToArray('cronograma', { hora: '', actividad: '' })}>
              <FaPlus /> Añadir Fila
            </button>
          </div>
          {config.cronograma.map((item, index) => (
            <div key={index} className="pi-admin-dynamic-row">
              <input type="time" value={item.hora} onChange={(e) => updateArray('cronograma', index, 'hora', e.target.value)} className="pi-admin-time-input" />
              <input type="text" placeholder="¿Qué sucederá a esta hora?" value={item.actividad} style={{ flex: 1 }} onChange={(e) => updateArray('cronograma', index, 'actividad', e.target.value)} />
              <button type="button" className="pi-admin-btn-delete" onClick={() => removeFromArray('cronograma', index)}><FaTrash /></button>
            </div>
          ))}
        </div>

      </div>
      )}

      {/* --- MODAL DE VISTA PREVIA COMPLETA --- */}
      {showPreview && (
        <div className="pi-admin-modal-overlay" onClick={() => setShowPreview(false)}>
          <div ref={modalPreviewRef} tabIndex={-1} className="pi-admin-modal dark-glass-preview" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cfg-preview-titulo">
            
            <div className="pi-admin-modal-header dark-header">
              <h3 id="cfg-preview-titulo" style={{color: "white", margin: 0}}>Vista Previa (Modo Real)</h3>
              <button type="button" className="pi-admin-btn-close-dark" onClick={() => setShowPreview(false)} aria-label="Cerrar"><FaTimes aria-hidden="true" /></button>
            </div>
            
            <div className="pi-admin-modal-body modal-scrollable" style={{ backgroundColor: config.colorFondo }}>
              
              {/* 1. SECCIÓN HERO PREVIEW */}
              <div className="pi-admin-modal-content-flex">
                <div className="pi-admin-modal-text">
                  {/* Vista previa de la landing: no es un encabezado real de esta pantalla,
                      por eso es <div> y no <h1> (la pantalla ya tiene su único h1 arriba) */}
                  <div style={{ color: config.colorTextoTitulo, fontSize: '32px', fontWeight: '800', marginBottom: '20px', lineHeight: '1.2' }}>
                    {eventoNombre}
                  </div>
                  <p style={{ color: config.colorTextoP, fontSize: '15px', marginBottom: '30px', lineHeight: '1.6' }}>
                    {config.informacion}
                  </p>
                  <button type="button" style={{ 
                    backgroundColor: config.colorBoton, 
                    color: config.colorFondo, 
                    padding: '12px 28px', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '15px'
                  }}>
                    Ingresar al Portal
                  </button>
                </div>
                <div className="pi-admin-modal-image">
                  {(config.imagen || eventoImagen) ? (
                    <img width="400" height="225" src={config.imagen || eventoImagen} alt="Preview" style={{ borderRadius: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }} />
                  ) : (
                    <div className="no-img">Sin imagen</div>
                  )}
                </div>
              </div>

              <div className="preview-divider"></div>

              {/* 2. SECCIÓN ACTIVIDADES PREVIEW */}
              <h3 style={{ color: config.colorTextoTitulo, fontSize: '22px', textAlign: 'center', margin: '40px 0 20px 0' }}>Servicios Destacados</h3>
              <div className="preview-grid-actividades">
                {config.actividades.map((act, idx) => (
                  <div key={idx} className="preview-glass-card">
                    <div className="preview-icon-box" style={{ color: config.colorPrimario }}>
                      {renderIconoPrevio(act.icono)}
                    </div>
                    <h4 style={{ color: config.colorTextoTitulo, margin: '10px 0' }}>{act.titulo}</h4>
                    <p style={{ color: config.colorTextoP, fontSize: '13px', lineHeight: '1.4' }}>{act.descripcion}</p>
                  </div>
                ))}
              </div>

              <div className="preview-divider"></div>

              {/* 3. SECCIÓN CRONOGRAMA PREVIEW */}
              <h3 style={{ color: config.colorTextoTitulo, fontSize: '22px', textAlign: 'center', margin: '40px 0 20px 0' }}>Cronograma</h3>
              <div className="preview-cronograma-box">
                {config.cronograma.map((item, idx) => (
                  <div key={idx} className="preview-cronograma-item">
                    <span className="preview-badge-hora" style={{ color: config.colorPrimario }}>
                      <FaClock /> {item.hora}
                    </span>
                    <span style={{ color: config.colorTextoTitulo, fontWeight: '600' }}>{item.actividad}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {DialogoConfirmar}
    </div>
  );
}