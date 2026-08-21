import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaPalette, FaImage, FaMapMarkedAlt, FaMapMarkerAlt,
  FaListUl, FaClock, FaPlus, FaTrash, FaPaperPlane,
  FaUpload, FaTimes, FaEye, FaFileAlt, FaChartPie, FaCheckCircle, FaHourglassHalf, FaExclamationTriangle
} from 'react-icons/fa';
import Admin from '../admin/Admin.jsx';
import { leerSesion } from '../../api/client.js';
import api from '../../api/index.js';
import './Cliente.css';

const SOLICITUD_VACIA = {
  nombreEvento: '', lugar: '', fecha: '', fechaFin: '', descripcion: '',
  colorPrimario: '#1A2B6B', colorBoton: '#FFFFFF', colorFondo: '#F5F7FB',
  colorTextoTitulo: '#0A0E27', colorTextoP: '#8A94A6',
  imagenPortada: '', mapaLugar: '',
  actividades: [{ titulo: '', descripcion: '' }],
  cronograma: [{ hora: '', actividad: '' }],
};

// Los inputs datetime-local necesitan "YYYY-MM-DDTHH:mm"; el backend devuelve ISO completo.
const paraInputFecha = (iso) => (iso ? iso.slice(0, 16) : '');

export default function Cliente() {
  const location = useLocation();
  const navigate = useNavigate();
  const sesion = leerSesion();
  // /Cliente/dashboard entra directo a la pestaña Dashboard General (accesible también
  // desde el menú lateral), sin pasar por la pestaña de Propuesta.
  const pestana = location.pathname.endsWith('/dashboard') ? 'dashboard' : 'propuesta';

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [showPreview, setShowPreview] = useState(false);

  // Eventos ya aprobados a los que este Cliente quedó asignado (para el Dashboard General).
  const [eventosPermitidos, setEventosPermitidos] = useState([]);

  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [solicitudId, setSolicitudId] = useState(null); // null = formulario en blanco (nueva)
  const [solicitud, setSolicitud] = useState(SOLICITUD_VACIA);

  const recargarSolicitudes = () => api.solicitudesEvento.listar().then(setMisSolicitudes);

  useEffect(() => {
    if (!sesion) return;
    api.asignaciones.listar().then(todas => {
      setEventosPermitidos([...new Set(todas.filter(a => a.usuarioId === sesion.id).map(a => a.eventoId))]);
    });
    recargarSolicitudes();
  }, []);

  const abrirSolicitud = (s) => {
    setSolicitudId(s.id);
    setSolicitud({ ...s, fecha: paraInputFecha(s.fecha), fechaFin: paraInputFecha(s.fechaFin) });
  };

  const nuevaSolicitud = () => {
    setSolicitudId(null);
    setSolicitud(SOLICITUD_VACIA);
  };

  const handleChange = (e) => {
    setSolicitud({ ...solicitud, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e, campo) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSolicitud({ ...solicitud, [campo]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const quitarImagen = (campo) => {
    setSolicitud({ ...solicitud, [campo]: '' });
  };

  const updateArray = (key, index, campo, valor) => {
    const newArray = [...solicitud[key]];
    newArray[index][campo] = valor;
    setSolicitud({ ...solicitud, [key]: newArray });
  };

  const addToArray = (key, defaultItem) => {
    setSolicitud({ ...solicitud, [key]: [...solicitud[key], defaultItem] });
  };

  const removeFromArray = (key, index) => {
    setSolicitud({ ...solicitud, [key]: solicitud[key].filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { id, clienteId, estado, motivoRechazo, eventoId, resueltoPorId, resueltoEn, createdAt, updatedAt, ...datos } = solicitud;

    const guardada = solicitudId
      ? await api.solicitudesEvento.actualizar(solicitudId, datos)
      : await api.solicitudesEvento.crear(datos);

    abrirSolicitud(guardada);
    await recargarSolicitudes();
    setMensaje({
      texto: '¡Solicitud enviada con éxito! El Administrador la revisará y creará la página del evento al aprobarla.',
      tipo: 'exito'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 5000);
  };

  const soloLectura = solicitudId && solicitud.estado !== 'pendiente';

  return (
    <div className="pi-cliente-container">

      {/* Pestañas: Propuesta del evento / Dashboard General (solo lectura) */}
      <div className="pi-cliente-tabs">
        <button
          className={`tab-btn ${pestana === 'propuesta' ? 'active' : ''}`}
          onClick={() => navigate('/Cliente')}
        >
          <FaFileAlt /> Mis Propuestas
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
      {misSolicitudes.length > 0 && (
        <div className="pi-cliente-card" style={{ marginBottom: '20px' }}>
          <h3><FaFileAlt className="icon-card" /> Tus solicitudes</h3>
          <div className="listas-dinamicas">
            {misSolicitudes.map(s => (
              <div key={s.id} className="fila-dinamica" style={{ cursor: 'pointer' }} onClick={() => abrirSolicitud(s)}>
                <div className="fila-inputs">
                  <strong>{s.nombreEvento}</strong>
                  {s.estado === 'pendiente' && <span className="pi-usr-badge pi-usr-badge-pend"><FaHourglassHalf /> Pendiente</span>}
                  {s.estado === 'aprobado' && <span className="pi-usr-badge pi-usr-badge-ok"><FaCheckCircle /> Aprobada</span>}
                  {s.estado === 'rechazado' && <span className="pi-usr-badge pi-usr-badge-pend"><FaExclamationTriangle /> Rechazada{s.motivoRechazo ? `: ${s.motivoRechazo}` : ''}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cabecera con Botones */}
      <div className="pi-cliente-header">
        <div>
          <h2>{solicitudId ? 'Editar Solicitud de Evento' : 'Nueva Solicitud de Evento'}</h2>
          <p>Propón tu evento. El Administrador la revisará y, al aprobarla, crea la página web real.</p>
        </div>
        <div className="pi-cliente-header-actions">
          {solicitudId && (
            <button className="btn-secundario" onClick={nuevaSolicitud}>
              <FaPlus /> Nueva Solicitud
            </button>
          )}
          <button className="btn-secundario" onClick={() => setShowPreview(true)}>
            <FaEye /> Vista Previa
          </button>
          {!soloLectura && (
            <button className="btn-primario" onClick={handleSubmit}>
              <FaPaperPlane /> {solicitudId ? 'Guardar Cambios' : 'Enviar Solicitud'}
            </button>
          )}
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
                type="text" name="nombreEvento" value={solicitud.nombreEvento} onChange={handleChange}
                placeholder="Ej: Gran Feria Gastronómica 2026" disabled={soloLectura} required
              />
            </div>

            <div className="input-group">
              <label><FaMapMarkerAlt style={{marginRight: '6px'}}/> Lugar</label>
              <input
                type="text" name="lugar" value={solicitud.lugar} onChange={handleChange}
                placeholder="Ej: Campo Ferial, Cochabamba" disabled={soloLectura} required
              />
            </div>

            <div className="input-group">
              <label>Fecha y hora de inicio</label>
              <input
                type="datetime-local" name="fecha" value={solicitud.fecha} onChange={handleChange}
                disabled={soloLectura} required
              />
            </div>

            <div className="input-group">
              <label>Fecha y hora de cierre</label>
              <input
                type="datetime-local" name="fechaFin" value={solicitud.fechaFin} onChange={handleChange}
                min={solicitud.fecha || undefined} disabled={soloLectura} required
              />
            </div>

            <div className="input-group">
              <label>Descripción / Objetivo</label>
              <textarea
                name="descripcion" value={solicitud.descripcion} onChange={handleChange} rows="3"
                placeholder="Describe de qué trata el evento, qué encontrarán los invitados..." disabled={soloLectura} required
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
                  <input type="color" name="colorPrimario" value={solicitud.colorPrimario} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorPrimario.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Texto del Botón</label>
                <div className="color-picker-wrapper">
                  <input type="color" name="colorBoton" value={solicitud.colorBoton} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorBoton.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Fondo Superior</label>
                <div className="color-picker-wrapper">
                  <input type="color" name="colorFondo" value={solicitud.colorFondo} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorFondo.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Color del Título</label>
                <div className="color-picker-wrapper">
                  <input type="color" name="colorTextoTitulo" value={solicitud.colorTextoTitulo} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorTextoTitulo.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Color de Párrafos</label>
                <div className="color-picker-wrapper">
                  <input type="color" name="colorTextoP" value={solicitud.colorTextoP} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorTextoP.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pi-cliente-card">
            <h3><FaMapMarkedAlt className="icon-card" /> Multimedia y Distribución</h3>

            <div className="input-group">
              <label><FaImage style={{marginRight: '6px'}}/> Foto de Portada</label>
              {!solicitud.imagenPortada ? (
                <div className="upload-zone">
                  <FaUpload className="upload-icon" />
                  <span className="upload-text">Subir foto de portada</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imagenPortada')} className="upload-input-hidden" disabled={soloLectura} />
                </div>
              ) : (
                <div className="preview-zone">
                  <img src={solicitud.imagenPortada} alt="Portada" className="img-preview-rect" />
                  {!soloLectura && (
                    <button type="button" className="btn-quitar-imagen" onClick={() => quitarImagen('imagenPortada')}><FaTimes /> Quitar foto</button>
                  )}
                </div>
              )}
            </div>

            <div className="input-group mt-20">
              <label><FaMapMarkedAlt style={{marginRight: '6px'}}/> Boceto o Mapa del Lugar</label>
              <p className="texto-ayuda" style={{marginBottom:'10px'}}>Sube el plano mostrando los puestos, el escenario, baños y estacionamiento.</p>
              {!solicitud.mapaLugar ? (
                <div className="upload-zone">
                  <FaUpload className="upload-icon" />
                  <span className="upload-text">Subir mapa o boceto</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'mapaLugar')} className="upload-input-hidden" disabled={soloLectura} />
                </div>
              ) : (
                <div className="preview-zone">
                  <img src={solicitud.mapaLugar} alt="Mapa del Lugar" className="img-preview-rect" />
                  {!soloLectura && (
                    <button type="button" className="btn-quitar-imagen" onClick={() => quitarImagen('mapaLugar')}><FaTimes /> Quitar mapa</button>
                  )}
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
              {!soloLectura && (
                <button type="button" className="btn-añadir-sm" onClick={() => addToArray('actividades', { titulo: '', descripcion: '' })}>
                  <FaPlus /> Fila
                </button>
              )}
            </div>
            <p className="texto-ayuda">Enumera las atracciones principales que tendrá el evento.</p>

            <div className="listas-dinamicas">
              {solicitud.actividades.map((act, index) => (
                <div key={index} className="fila-dinamica">
                  <div className="fila-inputs">
                    <input
                      type="text" placeholder="Título (Ej: Concierto en vivo)"
                      value={act.titulo} onChange={(e) => updateArray('actividades', index, 'titulo', e.target.value)}
                      disabled={soloLectura}
                    />
                    <input
                      type="text" placeholder="Breve descripción..."
                      value={act.descripcion} onChange={(e) => updateArray('actividades', index, 'descripcion', e.target.value)}
                      disabled={soloLectura}
                    />
                  </div>
                  {!soloLectura && (
                    <button type="button" className="btn-eliminar-fila" onClick={() => removeFromArray('actividades', index)}>
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pi-cliente-card">
            <div className="card-header-flex">
              <h3><FaClock className="icon-card" /> Cronograma de Horarios</h3>
              {!soloLectura && (
                <button type="button" className="btn-añadir-sm" onClick={() => addToArray('cronograma', { hora: '', actividad: '' })}>
                  <FaPlus /> Fila
                </button>
              )}
            </div>
            <p className="texto-ayuda">Define las horas clave desde que abren puertas hasta que cierran.</p>

            <div className="listas-dinamicas">
              {solicitud.cronograma.map((item, index) => (
                <div key={index} className="fila-dinamica">
                  <div className="fila-inputs flex-hora">
                    <input
                      type="time"
                      value={item.hora} onChange={(e) => updateArray('cronograma', index, 'hora', e.target.value)}
                      disabled={soloLectura}
                    />
                    <input
                      type="text" placeholder="¿Qué sucederá a esta hora?"
                      value={item.actividad} onChange={(e) => updateArray('cronograma', index, 'actividad', e.target.value)}
                      disabled={soloLectura}
                    />
                  </div>
                  {!soloLectura && (
                    <button type="button" className="btn-eliminar-fila" onClick={() => removeFromArray('cronograma', index)}>
                      <FaTrash />
                    </button>
                  )}
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

            <div className="modal-body preview-container" style={{ backgroundColor: solicitud.colorFondo }}>
              <div className="preview-text">
                <h1 style={{ color: solicitud.colorTextoTitulo, fontSize: '32px', marginBottom: '16px', lineHeight: '1.2' }}>
                  {solicitud.nombreEvento || 'Título del Evento'}
                </h1>
                <p style={{ color: solicitud.colorTextoP, fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
                  {solicitud.descripcion || 'Descripción del evento...'}
                </p>
                <button style={{ backgroundColor: solicitud.colorPrimario, color: solicitud.colorBoton, padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Ingresar al Evento
                </button>
              </div>
              <div className="preview-image">
                {solicitud.imagenPortada ? (
                  <img src={solicitud.imagenPortada} alt="Preview" />
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
