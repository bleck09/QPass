import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaPalette, FaImage, FaMapMarkedAlt,
  FaListUl, FaClock, FaPlus, FaTrash, FaPaperPlane,
  FaUpload, FaTimes, FaEye, FaFileAlt, FaChartPie
} from 'react-icons/fa';
import Admin from '../admin/Admin.jsx';
import { leerUsuarios } from '../../data/usuarios';
import { leerAsignaciones } from '../../data/asignacionesEventos';
import './Cliente.css';

export default function Cliente() {
  const location = useLocation();
  const navigate = useNavigate();
  // /Cliente/dashboard entra directo a la pestaña Dashboard General (accesible también
  // desde el menú lateral), sin pasar por la pestaña de Propuesta. Se deriva de la URL en
  // cada render (no de useState) para que el enlace del menú lateral funcione aunque
  // React Router no vuelva a montar el componente al navegar entre ambas rutas.
  const pestana = location.pathname.endsWith('/dashboard') ? 'dashboard' : 'propuesta';

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [showPreview, setShowPreview] = useState(false); // Estado para la Vista Previa

  // Eventos a los que este Cliente tiene acceso (asignados desde Gestión de Eventos, Admin).
  const eventosPermitidos = useMemo(() => {
    const sesion = JSON.parse(localStorage.getItem('usuarioProyectoIngresos') || 'null');
    if (!sesion?.email) return [];
    const usuario = leerUsuarios().find(u => u.email === sesion.email);
    if (!usuario) return [];
    const ids = leerAsignaciones()
      .filter(a => a.usuarioId === usuario.id)
      .map(a => a.eventoId);
    return [...new Set(ids)];
  }, []);

  // Estado principal extendido con los 4 colores
  const [propuesta, setPropuesta] = useState({
    nombreEvento: 'Gran Feria Gastronómica 2026',
    descripcion: 'Un evento diseñado para reunir a los mejores exponentes de la comida local. Habrá música en vivo, sorteos y actividades para toda la familia.',
    colorPrimario: '#1A2B6B',
    colorFondo: '#F5F7FB',
    colorTextoTitulo: '#0A0E27',
    colorTextoP: '#8A94A6',
    imagenPortada: '',
    mapaLugar: '', 
    actividades: [
      { titulo: '', descripcion: '' }
    ],
    cronograma: [
      { hora: '', actividad: '' }
    ]
  });

  const handleChange = (e) => {
    setPropuesta({ ...propuesta, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e, campo) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPropuesta({ ...propuesta, [campo]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const quitarImagen = (campo) => {
    setPropuesta({ ...propuesta, [campo]: '' });
  };

  const updateArray = (key, index, campo, valor) => {
    const newArray = [...propuesta[key]];
    newArray[index][campo] = valor;
    setPropuesta({ ...propuesta, [key]: newArray });
  };

  const addToArray = (key, defaultItem) => {
    setPropuesta({ ...propuesta, [key]: [...propuesta[key], defaultItem] });
  };

  const removeFromArray = (key, index) => {
    setPropuesta({ ...propuesta, [key]: propuesta[key].filter((_, i) => i !== index) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('propuesta_cliente_evento', JSON.stringify(propuesta));
    setMensaje({ 
      texto: '¡Información enviada con éxito! El Administrador revisará tus datos para armar la página web del evento.', 
      tipo: 'exito' 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 5000);
  };

  return (
    <div className="pi-cliente-container">

      {/* Pestañas: Propuesta del evento / Dashboard General (solo lectura) */}
      <div className="pi-cliente-tabs">
        <button
          className={`tab-btn ${pestana === 'propuesta' ? 'active' : ''}`}
          onClick={() => navigate('/Cliente')}
        >
          <FaFileAlt /> Mi Propuesta
        </button>
        <button
          className={`tab-btn ${pestana === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigate('/Cliente/dashboard')}
        >
          <FaChartPie /> Dashboard General
        </button>
      </div>

      {pestana === 'dashboard' && (
        <Admin soloLectura eventosPermitidos={eventosPermitidos} />
      )}

      {pestana === 'propuesta' && (
      <>
      {/* Cabecera con Botones */}
      <div className="pi-cliente-header">
        <div>
          <h2>Formulario de Propuesta del Evento</h2>
          <p>Diseña la experiencia de tu evento. El Administrador publicará la página web basándose en estos datos.</p>
        </div>
        <div className="pi-cliente-header-actions">
          <button className="btn-secundario" onClick={() => setShowPreview(true)}>
            <FaEye /> Vista Previa
          </button>
          <button className="btn-primario" onClick={handleSubmit}>
            <FaPaperPlane /> Enviar Propuesta
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`alerta-mensaje ${mensaje.tipo === 'exito' ? 'alerta-exito' : ''}`}>
          {mensaje.texto}
        </div>
      )}

      <form className="pi-cliente-grid">

        {/* COLUMNA IZQUIERDA */}
        <div className="pi-cliente-columna">
          
          <div className="pi-cliente-card">
            <h3><FaCalendarAlt className="icon-card" /> Información Principal</h3>
            
            <div className="input-group">
              <label>Nombre del Evento</label>
              <input 
                type="text" name="nombreEvento" value={propuesta.nombreEvento} onChange={handleChange} 
                placeholder="Ej: Gran Feria Gastronómica 2026" required 
              />
            </div>

            <div className="input-group">
              <label>Descripción / Objetivo</label>
              <textarea 
                name="descripcion" value={propuesta.descripcion} onChange={handleChange} rows="3"
                placeholder="Describe de qué trata el evento, qué encontrarán los invitados..." required 
              />
            </div>
          </div>

          <div className="pi-cliente-card">
            <h3><FaPalette className="icon-card" /> Apariencia y Colores</h3>
            <p className="texto-ayuda">Define la paleta de colores para que la página coincida con tu marca.</p>
            
            <div className="colores-grid">
              <div className="input-group">
                <label>Principal (Botones)</label>
                <div className="color-picker-wrapper">
                  <input type="color" name="colorPrimario" value={propuesta.colorPrimario} onChange={handleChange} />
                  <span className="hex-text">{propuesta.colorPrimario.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Fondo Superior</label>
                <div className="color-picker-wrapper">
                  <input type="color" name="colorFondo" value={propuesta.colorFondo} onChange={handleChange} />
                  <span className="hex-text">{propuesta.colorFondo.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Color del Título</label>
                <div className="color-picker-wrapper">
                  <input type="color" name="colorTextoTitulo" value={propuesta.colorTextoTitulo} onChange={handleChange} />
                  <span className="hex-text">{propuesta.colorTextoTitulo.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Color de Párrafos</label>
                <div className="color-picker-wrapper">
                  <input type="color" name="colorTextoP" value={propuesta.colorTextoP} onChange={handleChange} />
                  <span className="hex-text">{propuesta.colorTextoP.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pi-cliente-card">
            <h3><FaMapMarkedAlt className="icon-card" /> Multimedia y Distribución</h3>
            
            <div className="input-group">
              <label><FaImage style={{marginRight: '6px'}}/> Foto de Portada</label>
              {!propuesta.imagenPortada ? (
                <div className="upload-zone">
                  <FaUpload className="upload-icon" />
                  <span className="upload-text">Subir foto de portada</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imagenPortada')} className="upload-input-hidden" />
                </div>
              ) : (
                <div className="preview-zone">
                  <img src={propuesta.imagenPortada} alt="Portada" className="img-preview-rect" />
                  <button type="button" className="btn-quitar-imagen" onClick={() => quitarImagen('imagenPortada')}><FaTimes /> Quitar foto</button>
                </div>
              )}
            </div>

            <div className="input-group mt-20">
              <label><FaMapMarkedAlt style={{marginRight: '6px'}}/> Boceto o Mapa del Lugar</label>
              <p className="texto-ayuda" style={{marginBottom:'10px'}}>Sube el plano mostrando los puestos, el escenario, baños y estacionamiento.</p>
              {!propuesta.mapaLugar ? (
                <div className="upload-zone">
                  <FaUpload className="upload-icon" />
                  <span className="upload-text">Subir mapa o boceto</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'mapaLugar')} className="upload-input-hidden" />
                </div>
              ) : (
                <div className="preview-zone">
                  <img src={propuesta.mapaLugar} alt="Mapa del Lugar" className="img-preview-rect" />
                  <button type="button" className="btn-quitar-imagen" onClick={() => quitarImagen('mapaLugar')}><FaTimes /> Quitar mapa</button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA */}
        <div className="pi-cliente-columna">
          
          <div className="pi-cliente-card">
            <div className="card-header-flex">
              <h3><FaListUl className="icon-card" /> Actividades Principales</h3>
              <button type="button" className="btn-añadir-sm" onClick={() => addToArray('actividades', { titulo: '', descripcion: '' })}>
                <FaPlus /> Fila
              </button>
            </div>
            <p className="texto-ayuda">Enumera las atracciones principales que tendrá el evento.</p>

            <div className="listas-dinamicas">
              {propuesta.actividades.map((act, index) => (
                <div key={index} className="fila-dinamica">
                  <div className="fila-inputs">
                    <input 
                      type="text" placeholder="Título (Ej: Concierto en vivo)" 
                      value={act.titulo} onChange={(e) => updateArray('actividades', index, 'titulo', e.target.value)}
                    />
                    <input 
                      type="text" placeholder="Breve descripción..." 
                      value={act.descripcion} onChange={(e) => updateArray('actividades', index, 'descripcion', e.target.value)}
                    />
                  </div>
                  <button type="button" className="btn-eliminar-fila" onClick={() => removeFromArray('actividades', index)}>
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pi-cliente-card">
            <div className="card-header-flex">
              <h3><FaClock className="icon-card" /> Cronograma de Horarios</h3>
              <button type="button" className="btn-añadir-sm" onClick={() => addToArray('cronograma', { hora: '', actividad: '' })}>
                <FaPlus /> Fila
              </button>
            </div>
            <p className="texto-ayuda">Define las horas clave desde que abren puertas hasta que cierran.</p>

            <div className="listas-dinamicas">
              {propuesta.cronograma.map((item, index) => (
                <div key={index} className="fila-dinamica">
                  <div className="fila-inputs flex-hora">
                    <input 
                      type="time" 
                      value={item.hora} onChange={(e) => updateArray('cronograma', index, 'hora', e.target.value)}
                    />
                    <input 
                      type="text" placeholder="¿Qué sucederá a esta hora?" 
                      value={item.actividad} onChange={(e) => updateArray('cronograma', index, 'actividad', e.target.value)}
                    />
                  </div>
                  <button type="button" className="btn-eliminar-fila" onClick={() => removeFromArray('cronograma', index)}>
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </form>

      {/* --- MODAL DE VISTA PREVIA --- */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="modal modal-preview">
            <div className="modal-header">
              <h2><FaEye color="var(--indigo-profundo)" /> Así lucirá la Landing Page</h2>
              <button className="btn-close-modal" onClick={() => setShowPreview(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body preview-container" style={{ backgroundColor: propuesta.colorFondo }}>
              <div className="preview-text">
                <h1 style={{ color: propuesta.colorTextoTitulo, fontSize: '32px', marginBottom: '16px', lineHeight: '1.2' }}>
                  {propuesta.nombreEvento || 'Título del Evento'}
                </h1>
                <p style={{ color: propuesta.colorTextoP, fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
                  {propuesta.descripcion || 'Descripción del evento...'}
                </p>
                <button style={{ backgroundColor: propuesta.colorPrimario, color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Ingresar al Evento
                </button>
              </div>
              <div className="preview-image">
                {propuesta.imagenPortada ? (
                  <img src={propuesta.imagenPortada} alt="Preview" />
                ) : (
                  <div className="no-img-preview">Sin imagen de portada</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}

    </div>
  );
}