import { useCallback, useEffect, useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaPalette, FaImage, FaMapMarkedAlt, FaMapMarkerAlt,
  FaListUl, FaClock, FaPlus, FaTrash, FaPaperPlane,
  FaUpload, FaTimes, FaEye, FaFileAlt, FaChartPie, FaCheckCircle, FaHourglassHalf, FaExclamationTriangle
} from 'react-icons/fa';
import Admin from '../admin/Admin.jsx';
import { leerSesion } from '../../api/client.js';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
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
  useTituloPagina('Mis eventos');
  const location = useLocation();
  const navigate = useNavigate();
  const sesion = leerSesion();
  // /Cliente/dashboard entra directo a la pestaña Dashboard General (accesible también
  // desde el menú lateral), sin pasar por la pestaña de Propuesta.
  const pestana = location.pathname.endsWith('/dashboard') ? 'dashboard' : 'propuesta';

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [showPreview, setShowPreview] = useState(false);

  // Foco del modal de vista previa (A1 / Manual 8.6)
  const modalPreviewRef = useRef(null);
  useFocoModal(modalPreviewRef, showPreview);

  const [solicitudId, setSolicitudId] = useState(null); // null = formulario en blanco (nueva)
  const [solicitud, setSolicitud] = useState(SOLICITUD_VACIA);

  // Carga primaria (mis solicitudes + eventos donde quedé asignado) con
  // estados cargando/error/reintentar (Manual 8.9).
  const cargarDatos = useCallback(async () => {
    const [solicitudes, asignaciones] = await Promise.all([
      api.solicitudesEvento.listar(),
      api.asignaciones.listar(),
    ]);
    const idSesion = sesion?.id;
    const eventosPermitidos = idSesion
      ? [...new Set(asignaciones.filter(a => a.usuarioId === idSesion).map(a => a.eventoId))]
      : [];
    return { solicitudes, eventosPermitidos };
  }, [sesion?.id]);
  const {
    data: datos,
    cargando: cargandoDatos,
    error: errorDatos,
    recargar: recargarSolicitudes,
  } = useApi(cargarDatos, { inicial: { solicitudes: [], eventosPermitidos: [] } });
  const misSolicitudes = datos.solicitudes;
  const eventosPermitidos = datos.eventosPermitidos;

  // Modal de vista previa: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  useEffect(() => {
    if (!showPreview) return;
    const alTecla = (e) => { if (e.key === 'Escape') setShowPreview(false); };
    window.addEventListener('keydown', alTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTecla);
      document.body.style.overflow = '';
    };
  }, [showPreview]);


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

  const handleImageUpload = async (e, campo) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'solicitudes-evento');
      setSolicitud(s => ({ ...s, [campo]: url }));
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
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
          type="button"
          className={`tab-btn ${pestana === 'propuesta' ? 'active' : ''}`}
          aria-current={pestana === 'propuesta' ? 'page' : undefined}
          onClick={() => navigate('/Cliente')}
        >
          <FaFileAlt aria-hidden="true" /> Mis Propuestas
        </button>
        <button
          type="button"
          className={`tab-btn ${pestana === 'dashboard' ? 'active' : ''}`}
          aria-current={pestana === 'dashboard' ? 'page' : undefined}
          onClick={() => navigate('/Cliente/dashboard')}
        >
          <FaChartPie aria-hidden="true" /> Dashboard General
        </button>
      </div>

      {pestana === 'dashboard' && (
        <Admin soloLectura eventosPermitidos={eventosPermitidos} />
      )}

      {pestana === 'propuesta' && (
      <>
      {errorDatos && <EstadoError onReintentar={recargarSolicitudes} />}
      {!errorDatos && cargandoDatos && <EstadoCarga filas={3} />}
      {!errorDatos && !cargandoDatos && misSolicitudes.length > 0 && (
        <div className="pi-cliente-card" style={{ marginBottom: '20px' }}>
          <h3><FaFileAlt className="icon-card" /> Tus solicitudes</h3>
          <div className="listas-dinamicas">
            {misSolicitudes.map(s => (
              <button
                type="button"
                key={s.id}
                className="fila-dinamica"
                onClick={() => abrirSolicitud(s)}
              >
                <div className="fila-inputs">
                  <strong>{s.nombreEvento}</strong>
                  {s.estado === 'pendiente' && <span className="pi-usr-badge pi-usr-badge-pend"><FaHourglassHalf aria-hidden="true" /> Pendiente</span>}
                  {s.estado === 'aprobado' && <span className="pi-usr-badge pi-usr-badge-ok"><FaCheckCircle aria-hidden="true" /> Aprobada</span>}
                  {s.estado === 'rechazado' && <span className="pi-usr-badge pi-usr-badge-pend"><FaExclamationTriangle aria-hidden="true" /> Rechazada{s.motivoRechazo ? `: ${s.motivoRechazo}` : ''}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cabecera con Botones */}
      <div className="pi-cliente-header">
        <div>
          <h1>{solicitudId ? 'Editar solicitud de evento' : 'Nueva solicitud de evento'}</h1>
          <p>Propón tu evento. El Administrador la revisará y, al aprobarla, crea la página web real.</p>
        </div>
        <div className="pi-cliente-header-actions">
          {solicitudId && (
            <button type="button" className="btn-secundario" onClick={nuevaSolicitud}>
              <FaPlus /> Nueva Solicitud
            </button>
          )}
          <button type="button" className="btn-secundario" onClick={() => setShowPreview(true)}>
            <FaEye /> Vista Previa
          </button>
          {!soloLectura && (
            <button type="button" className="btn-primario" onClick={handleSubmit}>
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
              <label htmlFor="sol-nombreEvento">Nombre del evento</label>
              <input
                id="sol-nombreEvento"
                type="text" name="nombreEvento" value={solicitud.nombreEvento} onChange={handleChange}
                placeholder="Ej: Gran Feria Gastronómica 2026" disabled={soloLectura} required
              />
            </div>

            <div className="input-group">
              <label htmlFor="sol-lugar"><FaMapMarkerAlt style={{marginRight: '6px'}} aria-hidden="true"/> Lugar</label>
              <input
                id="sol-lugar"
                type="text" name="lugar" value={solicitud.lugar} onChange={handleChange}
                placeholder="Ej: Campo Ferial, Cochabamba" disabled={soloLectura} required
              />
            </div>

            <div className="input-group">
              <label htmlFor="sol-fecha">Fecha y hora de inicio</label>
              <input
                id="sol-fecha"
                type="datetime-local" name="fecha" value={solicitud.fecha} onChange={handleChange}
                disabled={soloLectura} required
              />
            </div>

            <div className="input-group">
              <label htmlFor="sol-fechaFin">Fecha y hora de cierre</label>
              <input
                id="sol-fechaFin"
                type="datetime-local" name="fechaFin" value={solicitud.fechaFin} onChange={handleChange}
                min={solicitud.fecha || undefined} disabled={soloLectura} required
              />
            </div>

            <div className="input-group">
              <label htmlFor="sol-descripcion">Descripción / objetivo</label>
              <textarea
                id="sol-descripcion"
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
                <label htmlFor="sol-colorPrimario">Principal (Botones)</label>
                <div className="color-picker-wrapper">
                  <input id="sol-colorPrimario" type="color" name="colorPrimario" value={solicitud.colorPrimario} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorPrimario.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="sol-colorBoton">Texto del Botón</label>
                <div className="color-picker-wrapper">
                  <input id="sol-colorBoton" type="color" name="colorBoton" value={solicitud.colorBoton} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorBoton.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="sol-colorFondo">Fondo Superior</label>
                <div className="color-picker-wrapper">
                  <input id="sol-colorFondo" type="color" name="colorFondo" value={solicitud.colorFondo} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorFondo.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="sol-colorTextoTitulo">Color del Título</label>
                <div className="color-picker-wrapper">
                  <input id="sol-colorTextoTitulo" type="color" name="colorTextoTitulo" value={solicitud.colorTextoTitulo} onChange={handleChange} disabled={soloLectura} />
                  <span className="hex-text">{solicitud.colorTextoTitulo.toUpperCase()}</span>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="sol-colorTextoP">Color de Párrafos</label>
                <div className="color-picker-wrapper">
                  <input id="sol-colorTextoP" type="color" name="colorTextoP" value={solicitud.colorTextoP} onChange={handleChange} disabled={soloLectura} />
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
                  <img width="640" height="360" src={solicitud.imagenPortada} alt="Portada" className="img-preview-rect" />
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
                  <img width="640" height="360" src={solicitud.mapaLugar} alt="Mapa del Lugar" className="img-preview-rect" />
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
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div
            ref={modalPreviewRef}
            tabIndex={-1}
            className="modal modal-preview"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cliente-preview-titulo"
          >
            <div className="modal-header">
              <h2 id="cliente-preview-titulo"><FaEye color="var(--indigo-profundo)" aria-hidden="true" /> Así lucirá la Landing Page</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowPreview(false)} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <div className="modal-body preview-container" style={{ backgroundColor: solicitud.colorFondo }}>
              <div className="preview-text">
                {/* Vista previa de la landing, no es encabezado real de la pantalla → <div> */}
                <div style={{ color: solicitud.colorTextoTitulo, fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.2' }}>
                  {solicitud.nombreEvento || 'Título del Evento'}
                </div>
                <p style={{ color: solicitud.colorTextoP, fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
                  {solicitud.descripcion || 'Descripción del evento...'}
                </p>
                <button style={{ backgroundColor: solicitud.colorPrimario, color: solicitud.colorBoton, padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Ingresar al Evento
                </button>
              </div>
              <div className="preview-image">
                {solicitud.imagenPortada ? (
                  <img width="400" height="225" src={solicitud.imagenPortada} alt="Preview" />
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
