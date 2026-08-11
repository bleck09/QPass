import { useState } from 'react';
import { 
  FaPlus, FaTrash, FaSave, FaEye, FaImage, FaUpload, 
  FaPalette, FaTextHeight, FaListUl, FaRegCalendarAlt, FaUndo 
} from 'react-icons/fa';
import './Admin.css';

// Configuración extendida con la paleta de colores de alto contraste por defecto
const defaultLandingConfig = {
  titulo: 'Plataforma de Gestión Financiera',
  informacion: 'Sistema centralizado para el control, monitoreo y auditoría de ingresos diarios. Optimiza los procesos de recarga y devoluciones con total transparencia y eficacia en tiempo real.',
  imagen: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  colorPrimario: '#2563eb',     // Azul Rey (Botones)
  colorFondo: '#f8fafc',        // Gris ultra claro
  colorTextoTitulo: '#0f172a',  // Azul oscuro (Casi negro)
  colorTextoP: '#334155',       // Gris oscuro
  actividades: [
    { icono: '💵', titulo: 'Recaudación Diaria', descripcion: 'Registro exacto de todos los ingresos generados en los puntos de recarga.' },
    { icono: '📊', titulo: 'Auditoría Continua', descripcion: 'Supervisión de transacciones para garantizar que no existan descuadres.' },
    { icono: '🔁', titulo: 'Gestión de Devoluciones', descripcion: 'Proceso rápido y documentado para cualquier ajuste o reembolso necesario.' }
  ],
  cronograma: [
    { hora: '08:00', actividad: 'Apertura del sistema y asignación de saldos iniciales' },
    { hora: '13:00', actividad: 'Arqueo de caja y revisión de medio turno' }
  ]
};

export default function Admin() {
  const [config, setConfig] = useState(() => {
    const dataGuardada = localStorage.getItem('pi_landing_config');
    return dataGuardada ? JSON.parse(dataGuardada) : defaultLandingConfig;
  });
  
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // Mejor manejo de mensajes (éxito o aviso)
  const [showPreview, setShowPreview] = useState(false);

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
    localStorage.setItem('pi_landing_config', JSON.stringify(config));
    setMensaje({ texto: '¡Página de inicio actualizada con éxito!', tipo: 'exito' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000); 
  };

  // --- NUEVA FUNCIÓN: RESTABLECER VALORES POR DEFECTO ---
  const restablecerValores = () => {
    if (window.confirm("¿Estás seguro de que deseas volver a los valores originales? Esto sobrescribirá tus cambios actuales.")) {
      setConfig(defaultLandingConfig);
      localStorage.setItem('pi_landing_config', JSON.stringify(defaultLandingConfig));
      setMensaje({ texto: 'Se han restaurado los valores por defecto.', tipo: 'aviso' });
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000); 
    }
  };

  return (
    <div className="pi-admin-container">
      
      <div className="pi-admin-header">
        <h2>Gestión de la Landing Page</h2>
        <div className="pi-admin-header-actions">
          {/* NUEVO BOTÓN: RESTABLECER */}
          <button className="pi-admin-btn-reset" onClick={restablecerValores}>
            <FaUndo /> Restablecer
          </button>
          
          <button className="pi-admin-btn-preview" onClick={() => setShowPreview(true)}>
            <FaEye /> Vista Previa
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
          <h3><FaPalette color="#0284c7" /> Apariencia y Colores</h3>
          <div className="pi-admin-colors-grid">
            <div className="pi-admin-form-group">
              <label>Principal (Botones)</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorPrimario" value={config.colorPrimario} onChange={handleChange} />
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label>Fondo Superior</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorFondo" value={config.colorFondo} onChange={handleChange} />
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label>Color del Título</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorTextoTitulo" value={config.colorTextoTitulo} onChange={handleChange} />
              </div>
            </div>
            <div className="pi-admin-form-group">
              <label>Color de Párrafos</label>
              <div className="pi-admin-color-picker">
                <input type="color" name="colorTextoP" value={config.colorTextoP} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: TEXTOS E IMAGEN */}
        <div className="pi-admin-card">
          <h3><FaTextHeight color="#0284c7" /> Textos Principales e Imagen</h3>
          
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
                <FaUpload /> Subir imagen desde la PC
              </label>
              <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} hidden />
              
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '10px' }}>
                o pega una URL abajo:
              </span>
            </div>
            
            <input 
              type="text" name="imagen" value={config.imagen} onChange={handleChange} 
              placeholder="https://..." style={{ marginTop: '8px' }}
            />
            {config.imagen && (
              <img src={config.imagen} alt="Vista previa" className="pi-admin-preview-img" />
            )}
          </div>
        </div>

        {/* SECCIÓN 3: ACTIVIDADES */}
        <div className="pi-admin-card">
          <div className="pi-admin-card-header">
            <h3><FaListUl color="#0284c7" /> Actividades</h3>
            <button className="pi-admin-btn-add" onClick={() => addToArray('actividades', { icono: '📌', titulo: '', descripcion: '' })}>
              <FaPlus /> Añadir
            </button>
          </div>
          {config.actividades.map((act, index) => (
            <div key={index} className="pi-admin-dynamic-row">
              <input type="text" value={act.icono} onChange={(e) => updateArray('actividades', index, 'icono', e.target.value)} className="pi-admin-input-small" />
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
            <h3><FaRegCalendarAlt color="#0284c7" /> Cronograma</h3>
            <button className="pi-admin-btn-add" onClick={() => addToArray('cronograma', { hora: '', actividad: '' })}>
              <FaPlus /> Añadir
            </button>
          </div>
          {config.cronograma.map((item, index) => (
            <div key={index} className="pi-admin-dynamic-row">
              <input type="time" value={item.hora} onChange={(e) => updateArray('cronograma', index, 'hora', e.target.value)} />
              <input type="text" placeholder="Actividad" value={item.actividad} style={{ flex: 1 }} onChange={(e) => updateArray('cronograma', index, 'actividad', e.target.value)} />
              <button className="pi-admin-btn-delete" onClick={() => removeFromArray('cronograma', index)}><FaTrash /></button>
            </div>
          ))}
        </div>

      </div>

      {/* --- MODAL DE VISTA PREVIA --- */}
      {showPreview && (
        <div className="pi-admin-modal-overlay">
          <div className="pi-admin-modal">
            <div className="pi-admin-modal-header">
              <h3>👀 Así se verá tu página</h3>
              <button className="pi-admin-btn-close" onClick={() => setShowPreview(false)}>Cerrar</button>
            </div>
            
            <div className="pi-admin-modal-body" style={{ backgroundColor: config.colorFondo }}>
              <div className="pi-admin-modal-text">
                <h1 style={{ color: config.colorTextoTitulo, fontSize: '28px', marginBottom: '15px' }}>
                  {config.titulo}
                </h1>
                <p style={{ color: config.colorTextoP, fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                  {config.informacion}
                </p>
                <button style={{ backgroundColor: config.colorPrimario, color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px' }}>
                  Ingresar al Portal
                </button>
              </div>
              <div className="pi-admin-modal-image">
                {config.imagen ? <img src={config.imagen} alt="Preview" /> : <div className="no-img">Sin imagen</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}