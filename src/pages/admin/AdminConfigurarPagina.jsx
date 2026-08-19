import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FaPlus, FaTrash, FaSave, FaEye, FaImage, FaUpload,
  FaPalette, FaTextHeight, FaListUl, FaRegCalendarAlt, FaUndo,
  FaTicketAlt, FaChartLine, FaExchangeAlt, FaStore, FaQrcode,
  FaTimes, FaClock, FaCalendarAlt
} from 'react-icons/fa';
import { leerEventos } from '../../data/eventosAdmin';
import { leerConfig, guardarConfig } from '../../data/landingConfig';
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

export default function AdminConfigurarPagina() {
  const location = useLocation();
  const eventosDisponibles = useMemo(() => leerEventos(), []);

  const [eventoId, setEventoId] = useState(location.state?.eventoId || eventosDisponibles[0]?.id);
  const [config, setConfig] = useState(() => normalizarConfig(leerConfig(eventoId, defaultLandingConfig)));

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [showPreview, setShowPreview] = useState(false);

  const cambiarEvento = (nuevoId) => {
    setEventoId(nuevoId);
    setConfig(normalizarConfig(leerConfig(nuevoId, defaultLandingConfig)));
  };

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, imagen: reader.result });
      };
      reader.readAsDataURL(file);
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

  const guardarConfiguracion = () => {
    guardarConfig(eventoId, config);
    setMensaje({ texto: '¡Página de inicio actualizada con éxito!', tipo: 'exito' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const restablecerValores = () => {
    if (window.confirm("¿Estás seguro de que deseas volver a los valores originales del diseño moderno?")) {
      setConfig(defaultLandingConfig);
      guardarConfig(eventoId, defaultLandingConfig);
      setMensaje({ texto: 'Se han restaurado los valores por defecto.', tipo: 'aviso' });
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    }
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
      
      <div className="pi-admin-header">
        <h2>Gestión de la Landing Page</h2>
        <div className="pi-admin-selector-evento">
          <FaCalendarAlt />
          <select value={eventoId} onChange={(e) => cambiarEvento(e.target.value)}>
            {eventosDisponibles.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>
        <div className="pi-admin-header-actions">
          <button className="pi-admin-btn-reset" onClick={restablecerValores}>
            <FaUndo /> Restablecer
          </button>
          
          <button className="pi-admin-btn-preview" onClick={() => setShowPreview(true)}>
            <FaEye /> Vista Previa Completa
          </button>
          <button className="pi-admin-btn-save" onClick={guardarConfiguracion}>
            <FaSave /> Guardar Cambios
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`pi-admin-alert ${mensaje.tipo === 'aviso' ? 'pi-admin-alert-aviso' : ''}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="pi-admin-grid">
        
        {/* SECCIÓN 1: COLORES */}
        <div className="pi-admin-card">
          <h3><FaPalette color="var(--cian-digital-texto)" /> Apariencia y Colores</h3>
          <p className="texto-ayuda">Edita la paleta de colores de tu página principal.</p>
          <div className="pi-admin-colors-grid">
            <div className="pi-admin-form-group">
              <label>Color de Acento (Detalles)</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorPrimario" value={config.colorPrimario} onChange={handleChange} />
                <span className="hex-label">{config.colorPrimario.toUpperCase()}</span>
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label>Botón Principal</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorBoton" value={config.colorBoton} onChange={handleChange} />
                <span className="hex-label">{config.colorBoton.toUpperCase()}</span>
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label>Fondo de la Página</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorFondo" value={config.colorFondo} onChange={handleChange} />
                <span className="hex-label">{config.colorFondo.toUpperCase()}</span>
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label>Textos de Títulos</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorTextoTitulo" value={config.colorTextoTitulo} onChange={handleChange} />
                <span className="hex-label">{config.colorTextoTitulo.toUpperCase()}</span>
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label>Textos Generales</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorTextoP" value={config.colorTextoP} onChange={handleChange} />
                <span className="hex-label">{config.colorTextoP.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: TEXTOS E IMAGEN */}
        <div className="pi-admin-card">
          <h3><FaTextHeight color="var(--cian-digital-texto)" /> Textos Principales e Imagen</h3>
          
          <div className="pi-admin-form-group">
            <label>Título Principal</label>
            <input type="text" name="titulo" value={config.titulo} onChange={handleChange} />
          </div>

          <div className="pi-admin-form-group">
            <label>Información / Descripción</label>
            <textarea name="informacion" rows="3" value={config.informacion} onChange={handleChange} />
          </div>

          <div className="pi-admin-form-group">
            <label><FaImage /> Imagen de Portada</label>
            <div className="pi-admin-image-upload-wrapper">
              <label htmlFor="file-upload" className="pi-admin-btn-upload">
                <FaUpload /> Subir imagen
              </label>
              <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} hidden />
              <span className="texto-ayuda" style={{ marginLeft: '10px' }}>o pega una URL abajo:</span>
            </div>
            <input type="text" name="imagen" value={config.imagen} onChange={handleChange} placeholder="https://..." style={{ marginTop: '8px' }} />
            {config.imagen && <img src={config.imagen} alt="Vista previa" className="pi-admin-preview-img" />}
          </div>
        </div>

        {/* SECCIÓN 3: ACTIVIDADES */}
        <div className="pi-admin-card">
          <div className="pi-admin-card-header">
            <h3><FaListUl color="var(--cian-digital-texto)" /> Actividades Destacadas</h3>
            <button className="pi-admin-btn-add" onClick={() => addToArray('actividades', { icono: 'ticket', titulo: '', descripcion: '' })}>
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
              <button className="pi-admin-btn-delete" onClick={() => removeFromArray('actividades', index)}><FaTrash /></button>
            </div>
          ))}
        </div>

        {/* SECCIÓN 4: CRONOGRAMA */}
        <div className="pi-admin-card">
          <div className="pi-admin-card-header">
            <h3><FaRegCalendarAlt color="var(--cian-digital-texto)" /> Cronograma</h3>
            <button className="pi-admin-btn-add" onClick={() => addToArray('cronograma', { hora: '', actividad: '' })}>
              <FaPlus /> Añadir Fila
            </button>
          </div>
          {config.cronograma.map((item, index) => (
            <div key={index} className="pi-admin-dynamic-row">
              <input type="time" value={item.hora} onChange={(e) => updateArray('cronograma', index, 'hora', e.target.value)} className="pi-admin-time-input" />
              <input type="text" placeholder="¿Qué sucederá a esta hora?" value={item.actividad} style={{ flex: 1 }} onChange={(e) => updateArray('cronograma', index, 'actividad', e.target.value)} />
              <button className="pi-admin-btn-delete" onClick={() => removeFromArray('cronograma', index)}><FaTrash /></button>
            </div>
          ))}
        </div>

      </div>

      {/* --- MODAL DE VISTA PREVIA COMPLETA --- */}
      {showPreview && (
        <div className="pi-admin-modal-overlay">
          <div className="pi-admin-modal dark-glass-preview">
            
            <div className="pi-admin-modal-header dark-header">
              <h3 style={{color: 'white', margin: 0}}>👀 Vista Previa (Modo Real)</h3>
              <button className="pi-admin-btn-close-dark" onClick={() => setShowPreview(false)}><FaTimes /></button>
            </div>
            
            <div className="pi-admin-modal-body modal-scrollable" style={{ backgroundColor: config.colorFondo }}>
              
              {/* 1. SECCIÓN HERO PREVIEW */}
              <div className="pi-admin-modal-content-flex">
                <div className="pi-admin-modal-text">
                  <h1 style={{ color: config.colorTextoTitulo, fontSize: '32px', fontWeight: '800', marginBottom: '20px', lineHeight: '1.2' }}>
                    {config.titulo}
                  </h1>
                  <p style={{ color: config.colorTextoP, fontSize: '15px', marginBottom: '30px', lineHeight: '1.6' }}>
                    {config.informacion}
                  </p>
                  <button style={{ 
                    backgroundColor: config.colorBoton, 
                    color: config.colorFondo, 
                    padding: '12px 28px', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '15px'
                  }}>
                    Ingresar al Portal
                  </button>
                </div>
                <div className="pi-admin-modal-image">
                  {config.imagen ? (
                    <img src={config.imagen} alt="Preview" style={{ borderRadius: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }} />
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
    </div>
  );
}