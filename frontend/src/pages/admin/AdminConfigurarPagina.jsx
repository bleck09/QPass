import { useCallback, useEffect, useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
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

// Configuración por defecto (Estilo Dark / Glassmorphism)
const defaultLandingConfig = {
  titulo: 'Innovación. Control. Resultados.',
  informacion: 'Sistema centralizado para el control, monitoreo y auditoría de ingresos diarios. Optimiza los procesos de recarga mediante pulseras QR con total transparencia y datos en tiempo real.',
  imagen: 'https://purovinotinto.com/wp-content/uploads/2022/12/Tomorrowland.jpg',
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

export default function AdminConfigurarPagina({ eventoId: eventoIdProp = null, embebido = false } = {}) {
  useTituloPagina('Configurar página del evento', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(eventoIdProp || location.state?.eventoId || '');

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

  // Foco del modal de vista previa (A1 / Manual 8.6)
  const modalPreviewRef = useRef(null);
  useFocoModal(modalPreviewRef, showPreview);

  // Modal de vista previa: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  useEffect(() => {
    if (!showPreview) return;
    const alTecla = (e) => { if (e.key === "Escape") setShowPreview(false); };
    window.addEventListener("keydown", alTecla);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", alTecla); document.body.style.overflow = ""; };
  }, [showPreview]);

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
    const guardada = await api.landingConfig.guardar(eventoId, config);
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
    const guardada = await api.landingConfig.guardar(eventoId, defaultLandingConfig);
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
            <div className="pi-admin-form-group">
              <label htmlFor="cfg-colorPrimario">Color de acento (detalles)</label>
              <div className="pi-admin-color-picker">
                <input id="cfg-colorPrimario" type="color" name="colorPrimario" value={config.colorPrimario} onChange={handleChange} />
                <span className="hex-label">{config.colorPrimario.toUpperCase()}</span>
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label htmlFor="cfg-colorBoton">Botón principal</label>
              <div className="pi-admin-color-picker">
                <input id="cfg-colorBoton" type="color" name="colorBoton" value={config.colorBoton} onChange={handleChange} />
                <span className="hex-label">{config.colorBoton.toUpperCase()}</span>
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label htmlFor="cfg-colorFondo">Fondo de la página</label>
              <div className="pi-admin-color-picker">
                <input id="cfg-colorFondo" type="color" name="colorFondo" value={config.colorFondo} onChange={handleChange} />
                <span className="hex-label">{config.colorFondo.toUpperCase()}</span>
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label htmlFor="cfg-colorTextoTitulo">Textos de títulos</label>
              <div className="pi-admin-color-picker">
                <input id="cfg-colorTextoTitulo" type="color" name="colorTextoTitulo" value={config.colorTextoTitulo} onChange={handleChange} />
                <span className="hex-label">{config.colorTextoTitulo.toUpperCase()}</span>
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label htmlFor="cfg-colorTextoP">Textos generales</label>
              <div className="pi-admin-color-picker">
                <input id="cfg-colorTextoP" type="color" name="colorTextoP" value={config.colorTextoP} onChange={handleChange} />
                <span className="hex-label">{config.colorTextoP.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: TEXTOS E IMAGEN */}
        <div className="pi-admin-card">
          <h3><FaTextHeight color="var(--cian-digital-texto)" /> Textos Principales e Imagen</h3>
          
          <div className="pi-admin-form-group">
            <label htmlFor="cfg-titulo">Título principal</label>
            <input id="cfg-titulo" type="text" name="titulo" value={config.titulo} onChange={handleChange} />
          </div>

          <div className="pi-admin-form-group">
            <label htmlFor="cfg-informacion">Información / descripción</label>
            <textarea id="cfg-informacion" name="informacion" rows="3" value={config.informacion} onChange={handleChange} />
          </div>

          <div className="pi-admin-form-group">
            <label htmlFor="cfg-imagen"><FaImage aria-hidden="true" /> Imagen de portada</label>
            <div className="pi-admin-image-upload-wrapper">
              <label htmlFor="file-upload" className="pi-admin-btn-upload">
                <FaUpload /> Subir imagen
              </label>
              <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} hidden />
              <span className="texto-ayuda" style={{ marginLeft: '10px' }}>o pega una URL abajo:</span>
            </div>
            <input id="cfg-imagen" type="text" name="imagen" value={config.imagen} onChange={handleChange} placeholder="https://..." style={{ marginTop: '8px' }} />
            {config.imagen && <img width="480" height="200" src={config.imagen} alt="Vista previa" className="pi-admin-preview-img" />}
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
                    {config.titulo}
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
                  {config.imagen ? (
                    <img width="400" height="225" src={config.imagen} alt="Preview" style={{ borderRadius: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }} />
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