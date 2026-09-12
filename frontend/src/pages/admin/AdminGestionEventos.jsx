import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import CalendarioEventos from '../../components/CalendarioEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation } from 'react-router-dom';
import {
  FaPlus, FaTimes, FaArrowLeft, FaMapMarkerAlt,
  FaUsers, FaTrash, FaUserPlus, FaTicketAlt, FaCog, FaMapMarkedAlt, FaImage, FaUpload, FaQrcode,
  FaCheckCircle, FaBan, FaFileAlt, FaClipboardList, FaArchive, FaUndo, FaExclamationTriangle, FaPen,
  FaRegCircle, FaRocket, FaEyeSlash, FaCalendarAlt, FaListUl
} from 'react-icons/fa';
import { ROLE_LABELS } from '../../constants/roles.js';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import { formatearFecha, estadoEvento, filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import { useDetalleUrl } from '../../utils/useDetalleUrl.js';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import MapaSelector from '../../components/MapaSelector.jsx';
import AdminCrearTickets from './AdminCrearTickets.jsx';
import AdminJornadas from './AdminJornadas.jsx';
import AdminCrearQr from './AdminCrearQr.jsx';
import AdminConfigurarPagina from './AdminConfigurarPagina.jsx';
import Mapa from './Mapa.jsx';
import Admin from './Admin.jsx';
import './AdminGestionEventos.css';

// Pestañas del detalle de evento (todo se ve acá mismo, sin cambiar de página).
const PESTANAS = [
  { id: 'asignados', label: 'Usuarios asignados', icono: <FaUsers /> },
  { id: 'jornadas', label: 'Jornadas', icono: <FaCalendarAlt /> },
  { id: 'tickets', label: 'Tickets del Evento', icono: <FaTicketAlt /> },
  { id: 'solicitudes', label: 'Solicitudes de Entradas', icono: <FaClipboardList /> },
  { id: 'reportes', label: 'Reportes', icono: <FaExclamationTriangle /> },
  { id: 'qr', label: 'Generar QR', icono: <FaQrcode /> },
  { id: 'config', label: 'Configurar Página', icono: <FaCog /> },
  { id: 'mapa', label: 'Mapa', icono: <FaMapMarkedAlt /> },
];

const ROLES_ASIGNABLES = ['Cliente', 'Supervisor', 'UsuarioNegocio', 'Recargador', 'Devolucion'];
const FORM_EVENTO_VACIO = { nombre: '', lugar: '', coordenadas: '', fecha: '', fechaFin: '', imagen: '', tipoManilla: 'fisica', clienteId: '', diasParaRetiro: '' };
const MAX_IMAGEN_BYTES = 3 * 1024 * 1024; // 3 MB

// ISO -> valor para <input type="datetime-local"> (YYYY-MM-DDTHH:mm, hora local).
const isoADatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminGestionEventos() {
  useTituloPagina('Gestión de eventos');
  const location = useLocation();

  // Carga primaria (4 listas en paralelo) con cargando/error/reintentar (Manual 8.9).
  const cargarTodo = useCallback(async () => {
    const [eventos, usuarios, asignaciones, solicitudes] = await Promise.all([
      api.eventos.listarTodos(),
      api.usuarios.listar(),
      api.asignaciones.listar(),
      api.solicitudesEvento.listar({ estado: 'pendiente' }),
    ]);
    return { eventos, usuarios, asignaciones, solicitudes };
  }, []);
  const {
    data: datos,
    setData: setDatos,
    cargando: cargandoDatos,
    error: errorDatos,
    recargar: recargarDatos,
  } = useApi(cargarTodo, { inicial: { eventos: [], usuarios: [], asignaciones: [], solicitudes: [] } });
  const { eventos, usuarios, asignaciones, solicitudes } = datos;
  const clientes = usuarios.filter(u => u.rol === 'Cliente');
  // Helpers para conservar las actualizaciones optimistas que había con setState.
  const setEventos = (fn) => setDatos(d => ({ ...d, eventos: typeof fn === 'function' ? fn(d.eventos) : fn }));
  const setAsignaciones = (fn) => setDatos(d => ({ ...d, asignaciones: typeof fn === 'function' ? fn(d.asignaciones) : fn }));
  const setSolicitudes = (fn) => setDatos(d => ({ ...d, solicitudes: typeof fn === 'function' ? fn(d.solicitudes) : fn }));

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoEvento, setFiltroEstadoEvento] = useState('todos');
  // El detalle de evento vive en la URL (?evento=<id>): así el botón "Atrás" del
  // navegador vuelve a la lista en vez de salir de la página, y el enlace es
  // compartible / sobrevive un refresco.
  const [eventoIdDetalle, abrirEventoUrl, cerrarDetalle] = useDetalleUrl('evento');
  const [pestana, setPestana] = useState('asignados');
  // Crear/editar evento vivía en un modal; ahora es su propia vista de página
  // (?formulario=crear o ?formulario=<id>), con el mismo soporte de "Atrás".
  const [formularioParam, abrirFormularioUrl, cerrarFormularioUrl] = useDetalleUrl('formulario');
  const editandoId = formularioParam && formularioParam !== 'crear' ? formularioParam : null;

  // Compat.: si se llega con location.state.eventoId (accesos rápidos de otra
  // página) y aún no está en la URL, lo abrimos.
  useEffect(() => {
    if (location.state?.eventoId && !eventoIdDetalle) abrirEventoUrl(location.state.eventoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirDetalle = (id) => {
    setPestana('asignados');
    abrirEventoUrl(id);
  };
  const [modalSolicitudesAbierto, setModalSolicitudesAbierto] = useState(false);
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const [formEvento, setFormEvento] = useState(FORM_EVENTO_VACIO);
  const [errorImagen, setErrorImagen] = useState('');
  const [errorFormEvento, setErrorFormEvento] = useState('');
  const [previewFallo, setPreviewFallo] = useState(false);

  const abrirCrearEvento = () => abrirFormularioUrl('crear');
  const abrirEditarEvento = (ev) => abrirFormularioUrl(ev.id);

  // Sincroniza el formulario con la URL DURANTE EL RENDER (no en un efecto —
  // "adjusting state when a prop changes", ver docs de React): así el
  // formulario también se puebla solo si se llega directo por link o refresco,
  // sin esperar a que `eventos` termine de cargar (reintenta en cada render
  // hasta encontrar el evento).
  const [formularioParamAplicado, setFormularioParamAplicado] = useState(formularioParam);
  if (formularioParam !== formularioParamAplicado) {
    if (formularioParam === 'crear') {
      setFormularioParamAplicado(formularioParam);
      setFormEvento(FORM_EVENTO_VACIO);
      setErrorImagen('');
      setErrorFormEvento('');
      setPreviewFallo(false);
    } else if (formularioParam) {
      const ev = eventos.find(e => e.id === formularioParam);
      if (ev) {
        setFormularioParamAplicado(formularioParam);
        setFormEvento({
          nombre: ev.nombre || '',
          lugar: ev.lugar || '',
          coordenadas: ev.coordenadas || '',
          imagen: ev.imagen || '',
          tipoManilla: ev.tipoManilla || 'fisica',
          fecha: isoADatetimeLocal(ev.fecha),
          fechaFin: isoADatetimeLocal(ev.fechaFin),
          clienteId: ev.clienteId != null ? String(ev.clienteId) : '',
          diasParaRetiro: ev.diasParaRetiro != null ? String(ev.diasParaRetiro) : '',
        });
        setErrorImagen('');
        setErrorFormEvento('');
        setPreviewFallo(false);
      }
      // si el evento todavía no está en `eventos` (aún cargando), no se marca
      // aplicado: se reintenta en el próximo render.
    } else {
      setFormularioParamAplicado(formularioParam); // formulario cerrado
    }
  }
  // Panel de asignar: filtro por rol + búsqueda por nombre/correo (ya no se elige rol).
  const [filtroRolAsignar, setFiltroRolAsignar] = useState('');
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [comprasPendientes, setComprasPendientes] = useState(0);

  useEffect(() => {
    if (!eventoIdDetalle) return;
    api.compras.listar({ eventoId: eventoIdDetalle }).then(lista =>
      setComprasPendientes(lista.filter(c => c.estado === 'pendiente').length)
    );
  }, [eventoIdDetalle]);

  const [errorSolicitudes, setErrorSolicitudes] = useState('');

  const aprobarSolicitud = async (s) => {
    const ok = await confirmar({
      titulo: '¿Aprobar la solicitud?',
      mensaje: `Se creará el evento real "${s.nombreEvento}" a partir de esta solicitud.`,
      textoConfirmar: 'Aprobar y crear',
    });
    if (!ok) return;
    setErrorSolicitudes('');
    try {
      const nuevo = await api.solicitudesEvento.aprobar(s.id);
      setEventos(prev => [nuevo, ...prev]);
      setSolicitudes(prev => prev.filter(x => x.id !== s.id));
      abrirDetalle(nuevo.id);
    } catch (err) {
      // Ej.: las fechas propuestas se cruzan con otro evento activo ("un
      // evento a la vez") — hay que editar la solicitud o rechazarla.
      setErrorSolicitudes(err.message);
    }
  };

  const rechazarSolicitud = async (s) => {
    const motivo = await confirmar({
      titulo: '¿Rechazar la solicitud?',
      mensaje: `Se rechazará "${s.nombreEvento}". El cliente verá el motivo que escribas.`,
      campoNota: { etiqueta: 'Motivo del rechazo', placeholder: 'Ej. faltan datos del lugar y la fecha', requerido: true },
      textoConfirmar: 'Rechazar solicitud',
      peligroso: true,
    });
    if (motivo === null) return;
    await api.solicitudesEvento.rechazar(s.id, motivo);
    setSolicitudes(prev => prev.filter(x => x.id !== s.id));
  };

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busqueda, filtroEstadoEvento),
    [eventos, busqueda, filtroEstadoEvento],
  );
  const [vistaEventos, setVistaEventos] = useState('lista'); // 'lista' | 'calendario'

  const eventoDetalle = eventos.find(ev => ev.id === eventoIdDetalle) || null;

  // Qué le falta al evento para poder publicarse (tickets, QR, página, mapa).
  // Se recarga cada vez que se cambia de pestaña: es el punto natural en el que
  // el admin "vuelve" después de completar un paso en otra pestaña.
  const cargarProgreso = useCallback(async () => {
    if (!eventoDetalle) return null;
    return api.eventos.progreso(eventoDetalle.id).catch(() => null);
  }, [eventoDetalle?.id]);
  const { data: progresoEvento, recargar: recargarProgreso } = useApi(cargarProgreso, {
    inicial: null,
    activo: !!eventoDetalle,
  });
  useEffect(() => { recargarProgreso(); }, [pestana, recargarProgreso]);

  const asignacionesDelEvento = useMemo(
    () => asignaciones.filter(a => a.eventoId === eventoIdDetalle),
    [asignaciones, eventoIdDetalle]
  );

  const contarAsignados = (eventoId) => asignaciones.filter(a => a.eventoId === eventoId).length;

  // Candidatos para asignar: solo roles operativos, que no estén ya en el evento,
  // filtrados por el rol elegido y por el texto de búsqueda.
  const usuariosAsignables = useMemo(() => {
    const idsYaEnEvento = new Set(asignacionesDelEvento.map(a => a.usuarioId));
    const termino = busquedaUsuario.trim().toLowerCase();
    return usuarios
      .filter(u => ROLES_ASIGNABLES.includes(u.rol))
      .filter(u => !idsYaEnEvento.has(u.id))
      .filter(u => !filtroRolAsignar || u.rol === filtroRolAsignar)
      .filter(u =>
        !termino ||
        u.nombre.toLowerCase().includes(termino) ||
        (u.email || '').toLowerCase().includes(termino)
      );
  }, [usuarios, asignacionesDelEvento, filtroRolAsignar, busquedaUsuario]);

  const handleChangeFormEvento = (e) => {
    setFormEvento({ ...formEvento, [e.target.name]: e.target.value });
  };

  // La imagen se sube como archivo real a /uploads y en el formulario solo se guarda
  // la URL devuelta (antes se codificaba entera en base64 dentro del propio formulario).
  const handleImagenUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorImagen('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > MAX_IMAGEN_BYTES) {
      setErrorImagen('La imagen no debe superar los 3 MB.');
      return;
    }
    try {
      setErrorImagen('Subiendo imagen...');
      const url = await subirImagenDeInput(file, 'eventos');
      setErrorImagen('');
      setPreviewFallo(false);
      setFormEvento(f => ({ ...f, imagen: url }));
    } catch (err) {
      setErrorImagen(err.message);
    }
  };

  const handleGuardarEvento = async (e) => {
    e.preventDefault();
    if (!formEvento.nombre.trim() || !formEvento.lugar.trim() || !formEvento.fecha || !formEvento.fechaFin) return;
    if (!formEvento.coordenadas) {
      setErrorFormEvento('Marcá la ubicación del evento en el mapa: es obligatoria (se muestra en la página pública y sirve de base para el plano del recinto).');
      return;
    }
    setErrorFormEvento('');

    // clienteId / diasParaRetiro vacíos -> se omiten (el backend usa el default).
    const { clienteId, diasParaRetiro, ...resto } = formEvento;
    const payload = {
      ...resto,
      ...(clienteId ? { clienteId: Number(clienteId) } : {}),
      ...(diasParaRetiro ? { diasParaRetiro: Number(diasParaRetiro) } : {}),
    };

    try {
      if (editandoId) {
        const actualizado = await api.eventos.actualizar(editandoId, payload);
        setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
        cerrarFormularioUrl();
        return;
      }

      const nuevo = await api.eventos.crear(payload);
      setEventos(prev => [nuevo, ...prev]);
      setFormEvento(FORM_EVENTO_VACIO);
      cerrarFormularioUrl();
      abrirDetalle(nuevo.id);
    } catch (err) {
      // El backend rechaza fechas que se cruzan con otro evento activo ("un
      // evento a la vez"): el mensaje ya viene listo para mostrar tal cual.
      setErrorFormEvento(err.message);
    }
  };

  const handleAsignar = async (usuario) => {
    if (!eventoIdDetalle) return;
    // El backend deriva el rol del evento del rol de la cuenta; se manda igual por compat.
    await api.asignaciones.asignar({ eventoId: eventoIdDetalle, usuarioId: usuario.id, rol: usuario.rol });
    setAsignaciones(await api.asignaciones.listar());
  };

  const handleQuitarAsignacion = async (id) => {
    const ok = await confirmar({
      titulo: '¿Quitar al usuario?',
      mensaje: 'Este usuario dejará de tener acceso a este evento con su rol asignado.',
      textoConfirmar: 'Quitar del evento',
      peligroso: true,
    });
    if (!ok) return;
    await api.asignaciones.quitar(id);
    setAsignaciones(prev => prev.filter(a => a.id !== id));
  };

  const handleArchivar = async () => {
    if (!eventoDetalle) return;
    const ok = await confirmar({
      titulo: '¿Archivar este evento?',
      mensaje: `"${eventoDetalle.nombre}" quedará de SOLO LECTURA: nadie podrá registrar recargas, devoluciones, ingresos, incidencias ni editar nada. Se puede desarchivar después.`,
      textoConfirmar: 'Archivar evento',
      peligroso: true,
    });
    if (!ok) return;
    const actualizado = await api.eventos.archivar(eventoDetalle.id);
    setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
  };

  const handleDesarchivar = async () => {
    if (!eventoDetalle) return;
    const ok = await confirmar({
      titulo: '¿Desarchivar este evento?',
      mensaje: `"${eventoDetalle.nombre}" volverá a admitir cambios.`,
      textoConfirmar: 'Desarchivar',
    });
    if (!ok) return;
    const actualizado = await api.eventos.desarchivar(eventoDetalle.id);
    setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
  };

  const [errorPublicar, setErrorPublicar] = useState('');

  const handlePublicar = async () => {
    if (!eventoDetalle) return;
    setErrorPublicar('');
    try {
      const actualizado = await api.eventos.publicar(eventoDetalle.id);
      setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
    } catch (err) {
      setErrorPublicar(err.message);
    }
  };

  const handleDespublicar = async () => {
    if (!eventoDetalle) return;
    const ok = await confirmar({
      titulo: '¿Volver a borrador?',
      mensaje: `"${eventoDetalle.nombre}" dejará de verse en la página pública y no se podrán comprar más entradas hasta que lo publiques de nuevo.`,
      textoConfirmar: 'Volver a borrador',
      peligroso: true,
    });
    if (!ok) return;
    const actualizado = await api.eventos.despublicar(eventoDetalle.id);
    setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
  };

  if (errorDatos) {
    return (
      <div className="pi-ges-container">
        <div className="pi-ges-header"><h1>Gestión de eventos</h1></div>
        <EstadoError onReintentar={recargarDatos} />
      </div>
    );
  }
  if (cargandoDatos) {
    return (
      <div className="pi-ges-container">
        <div className="pi-ges-header"><h1>Gestión de eventos</h1></div>
        <EstadoCarga filas={5} />
      </div>
    );
  }

  return (
    <div className="pi-ges-container">
      {formularioParam ? (
        <>
          <button type="button" className="pi-ges-btn-volver" onClick={cerrarFormularioUrl}>
            <FaArrowLeft /> {editandoId ? 'Volver al evento' : 'Volver a Gestión de Eventos'}
          </button>

          <div className="pi-ges-header">
            <div>
              <h1>{editandoId ? <><FaPen aria-hidden="true" /> Editar Evento</> : <><FaPlus aria-hidden="true" /> Crear Evento</>}</h1>
              <p>{editandoId ? `Estás editando "${formEvento.nombre}".` : 'Completa los datos para crear un evento nuevo.'}</p>
            </div>
          </div>

          <section className="pi-ges-seccion pi-ges-form-pagina">
            <form className="pi-ges-form" onSubmit={handleGuardarEvento}>
              <div className="pi-ges-input-group">
                <label htmlFor="ev-nombre">Nombre del evento</label>
                <input
                  id="ev-nombre" type="text" name="nombre" value={formEvento.nombre} onChange={handleChangeFormEvento}
                  placeholder="Ej: Festival de Verano 2027" required
                />
              </div>
              <div className="pi-ges-input-group">
                <label htmlFor="ev-lugar">Lugar</label>
                <input
                  id="ev-lugar" type="text" name="lugar" value={formEvento.lugar} onChange={handleChangeFormEvento}
                  placeholder="Ej: Campo Ferial, Cbba" required
                />
              </div>
              <div className="pi-ges-input-group">
                <label htmlFor="ev-tipo-manilla">Tipo de manilla / control de acceso</label>
                <select
                  id="ev-tipo-manilla" name="tipoManilla" value={formEvento.tipoManilla} onChange={handleChangeFormEvento}
                >
                  <option value="fisica">Física — Supervisor entrega y vincula la manilla</option>
                  <option value="digital">Digital — el QR se asigna solo al aprobar la compra</option>
                </select>
                <p className="pi-ges-ayuda-campo">
                  {formEvento.tipoManilla === 'digital'
                    ? 'Cada asistente ve su código QR en su perfil apenas se aprueba su compra; entra mostrándolo desde el celular. No hace falta imprimir ni entregar nada en Gestión de Entrega.'
                    : 'Admin genera un lote de códigos QR imprimibles y Supervisor entrega + vincula la manilla física a cada asistente en Gestión de Entrega.'}
                </p>
              </div>
              <div className="pi-ges-input-group">
                <label htmlFor="ev-cliente">Cliente organizador (opcional)</label>
                <select
                  id="ev-cliente" name="clienteId" value={formEvento.clienteId} onChange={handleChangeFormEvento}
                >
                  <option value="">Sin cliente asignado</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div className="pi-ges-input-group">
                <label htmlFor="ev-retiro">Días para retirar el saldo tras el cierre</label>
                <input
                  id="ev-retiro" type="number" min="1" step="1" name="diasParaRetiro"
                  value={formEvento.diasParaRetiro} onChange={handleChangeFormEvento}
                  placeholder="30 (por defecto)"
                />
              </div>
              <div className="pi-ges-input-group">
                <label>Ubicación en el mapa</label>
                <MapaSelector
                  value={formEvento.coordenadas}
                  onChange={(coords) => setFormEvento(f => ({ ...f, coordenadas: coords }))}
                />
              </div>
              <div className="pi-ges-input-group">
                <label htmlFor="ev-fecha">Fecha y hora de inicio</label>
                <input
                  id="ev-fecha" type="datetime-local" name="fecha" value={formEvento.fecha} onChange={handleChangeFormEvento}
                  required
                />
              </div>
              <div className="pi-ges-input-group">
                <label htmlFor="ev-fechaFin">Fecha y hora de cierre</label>
                <input
                  id="ev-fechaFin" type="datetime-local" name="fechaFin" value={formEvento.fechaFin} onChange={handleChangeFormEvento}
                  min={formEvento.fecha || undefined} required
                />
              </div>
              <div className="pi-ges-input-group">
                <label htmlFor="ev-imagen"><FaImage aria-hidden="true" /> Imagen del evento (opcional)</label>
                {!formEvento.imagen ? (
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" aria-hidden="true" />
                    <span className="upload-text">Haz clic para subir una foto</span>
                    <span className="upload-subtext">PNG, JPG hasta 3MB</span>
                    <input id="ev-imagen" type="file" accept="image/*" onChange={handleImagenUpload} className="upload-input-hidden" />
                  </div>
                ) : previewFallo ? (
                  <p className="pi-ges-error-imagen">
                    No se puede mostrar esta imagen. Probá con otra en formato JPG o PNG.
                  </p>
                ) : (
                  <div className="preview-zone">
                    <img
                      width="320" height="100" src={formEvento.imagen} alt="Vista previa"
                      className="pi-ges-imagen-preview"
                      onError={() => setPreviewFallo(true)}
                      onLoad={() => setPreviewFallo(false)}
                    />
                    <button
                      type="button"
                      className="btn-quitar-imagen"
                      onClick={() => { setErrorImagen(''); setFormEvento(f => ({ ...f, imagen: '' })); }}
                    >
                      <FaTimes aria-hidden="true" /> Quitar imagen
                    </button>
                  </div>
                )}
                {errorImagen && <p className="pi-ges-error-imagen">{errorImagen}</p>}
              </div>

              {errorFormEvento && (
                <p className="pi-ges-error-fechas"><FaExclamationTriangle aria-hidden="true" /> {errorFormEvento}</p>
              )}

              <div className="pi-ges-modal-actions">
                <button type="button" className="pi-ges-btn-cancelar" onClick={cerrarFormularioUrl}>
                  Cancelar
                </button>
                <button type="submit" className="pi-ges-btn-guardar">
                  {editandoId ? 'Guardar cambios' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : eventoDetalle ? (
        <>
          <button type="button" className="pi-ges-btn-volver" onClick={cerrarDetalle}>
            <FaArrowLeft /> Volver a Gestión de Eventos
          </button>

          <div className="pi-ges-detalle-header">
            <img width="96" height="96" src={eventoDetalle.imagen} alt={eventoDetalle.nombre} className="pi-ges-detalle-imagen" />
            <div className="pi-ges-detalle-info">
              <h1>
                {eventoDetalle.nombre} <BadgeEstadoEvento evento={eventoDetalle} />{' '}
                <span className={`pi-ges-badge-publicacion ${eventoDetalle.publicadoEn ? 'publicado' : 'borrador'}`}>
                  {eventoDetalle.publicadoEn ? <><FaCheckCircle /> Publicado</> : <><FaEyeSlash /> Borrador</>}
                </span>{' '}
                <span className="pi-ges-badge-manilla">
                  {eventoDetalle.tipoManilla === 'digital' ? <><FaQrcode /> Manilla digital</> : <><FaTicketAlt /> Manilla física</>}
                </span>
              </h1>
              <span>
                <FaMapMarkerAlt /> {eventoDetalle.lugar}
                {eventoDetalle.coordenadas ? ` (${eventoDetalle.coordenadas})` : ''} · {formatearFecha(eventoDetalle.fecha)}
              </span>
            </div>
            <div className="pi-ges-detalle-acciones">
              {!eventoDetalle.archivadoEn && (
                eventoDetalle.publicadoEn ? (
                  <button type="button" className="pi-ges-btn-despublicar" onClick={handleDespublicar}>
                    <FaEyeSlash /> Volver a borrador
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pi-ges-btn-publicar"
                    onClick={handlePublicar}
                    disabled={progresoEvento ? !progresoEvento.listoParaPublicar : true}
                    title={progresoEvento && !progresoEvento.listoParaPublicar ? 'Completa los pasos de abajo antes de publicar' : undefined}
                  >
                    <FaRocket /> Publicar evento
                  </button>
                )
              )}
              {!eventoDetalle.archivadoEn && (
                <button type="button" className="pi-ges-btn-editar" onClick={() => abrirEditarEvento(eventoDetalle)}>
                  <FaPen /> Editar
                </button>
              )}
              {eventoDetalle.archivadoEn ? (
                <button type="button" className="pi-ges-btn-desarchivar" onClick={handleDesarchivar}>
                  <FaUndo /> Desarchivar
                </button>
              ) : (
                <button
                  type="button"
                  className="pi-ges-btn-archivar"
                  onClick={handleArchivar}
                  disabled={estadoEvento(eventoDetalle) !== 'finalizado'}
                  title={estadoEvento(eventoDetalle) !== 'finalizado' ? 'Solo se archiva un evento finalizado' : undefined}
                >
                  <FaArchive /> Archivar
                </button>
              )}
            </div>
          </div>

          {eventoDetalle.archivadoEn && (
            <p className="pi-ges-aviso-archivado">
              <FaArchive /> Evento archivado — solo lectura. Desarchívalo para volver a hacer cambios.
            </p>
          )}

          {!eventoDetalle.archivadoEn && !eventoDetalle.publicadoEn && progresoEvento && (
            <div className="pi-ges-progreso">
              <div className="pi-ges-progreso-encabezado">
                <p className="pi-ges-progreso-titulo">
                  Este evento está en <strong>borrador</strong>: nadie lo ve en la página pública ni puede comprar
                  entradas hasta que lo publiques.
                </p>
                <span className="pi-ges-progreso-fraccion">
                  {Object.values(progresoEvento.pasos).filter(Boolean).length} de {Object.keys(progresoEvento.pasos).length}
                </span>
              </div>
              <div className="pi-ges-progreso-barra">
                <div
                  className="pi-ges-progreso-barra-relleno"
                  style={{
                    width: `${(Object.values(progresoEvento.pasos).filter(Boolean).length / Object.keys(progresoEvento.pasos).length) * 100}%`,
                  }}
                />
              </div>
              <ul className="pi-ges-progreso-lista">
                <li className={progresoEvento.pasos.tickets ? 'listo' : ''}>
                  {progresoEvento.pasos.tickets ? <FaCheckCircle /> : <FaRegCircle />} Crear al menos un tipo de entrada
                </li>
                <li className={progresoEvento.pasos.qr ? 'listo' : ''}>
                  {progresoEvento.pasos.qr ? <FaCheckCircle /> : <FaRegCircle />}{' '}
                  {eventoDetalle.tipoManilla === 'digital'
                    ? 'Códigos QR: automáticos (manilla digital, no hace falta generarlos)'
                    : 'Generar los códigos QR'}
                </li>
                <li className={progresoEvento.pasos.landing ? 'listo' : ''}>
                  {progresoEvento.pasos.landing ? <FaCheckCircle /> : <FaRegCircle />} Configurar la página del evento
                </li>
              </ul>
              <p className="pi-ges-progreso-nota">
                El mapa es opcional: los puestos los activa cada Usuario Negocio y podés armarlo
                antes o después de publicar. Si queda sin configurar, simplemente no se muestra en la página del evento.
              </p>
              {errorPublicar && (
                <p className="pi-ges-progreso-error"><FaExclamationTriangle /> {errorPublicar}</p>
              )}
            </div>
          )}

          <div className="pi-ges-tabs" role="tablist" aria-label="Secciones del evento">
            {PESTANAS.map(p => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pestana === p.id}
                className={`pi-ges-tab${pestana === p.id ? ' activo' : ''}`}
                onClick={() => setPestana(p.id)}
              >
                {p.icono} {p.label}
                {p.id === 'solicitudes' && comprasPendientes > 0 && (
                  <span className="pi-ges-badge-contador">{comprasPendientes}</span>
                )}
              </button>
            ))}
          </div>

          {pestana === 'jornadas' && <AdminJornadas eventoId={eventoDetalle.id} soloLectura={!!eventoDetalle.archivadoEn} />}
          {pestana === 'tickets' && <AdminCrearTickets eventoId={eventoDetalle.id} embebido />}
          {pestana === 'solicitudes' && <Admin eventoIdFijo={eventoDetalle.id} vistaFija="solicitudesEntradas" />}
          {pestana === 'reportes' && <Admin eventoIdFijo={eventoDetalle.id} vistaFija="incidencias" />}
          {pestana === 'qr' && <AdminCrearQr eventoId={eventoDetalle.id} tipoManilla={eventoDetalle.tipoManilla} embebido />}
          {pestana === 'config' && <AdminConfigurarPagina eventoId={eventoDetalle.id} embebido />}
          {pestana === 'mapa' && <Mapa eventoId={eventoDetalle.id} embebido />}

          {pestana === 'asignados' && (
          <section className="pi-ges-seccion">
            <h3 className="pi-ges-seccion-titulo"><FaUsers /> Usuarios asignados</h3>

            <Tabla
              columnas={['Usuario', 'Correo', 'Rol en el evento', { texto: 'Acciones', srOnly: true }]}
              datos={asignacionesDelEvento}
              vacio="Aún no hay usuarios asignados a este evento."
              renderFila={a => {
                const usuario = usuarios.find(u => u.id === a.usuarioId);
                if (!usuario) return null;
                return (
                  <tr key={a.id}>
                    <td>{usuario.nombre}</td>
                    <td>{usuario.email}</td>
                    <td><span className="pi-ges-badge">{ROLE_LABELS[a.rol] || a.rol}</span></td>
                    <td>
                      <button type="button" className="pi-ges-btn-quitar" onClick={() => handleQuitarAsignacion(a.id)} title="Quitar del evento">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              }}
            />

            <div className="pi-ges-asignar-panel">
              <h4 className="pi-ges-asignar-titulo"><FaUserPlus /> Asignar usuario al evento</h4>
              <p className="pi-ges-asignar-ayuda">
                El rol en el evento es el mismo rol de la cuenta. Elegí a la persona.
              </p>

              <Buscador
                valor={busquedaUsuario}
                onCambio={setBusquedaUsuario}
                placeholder="Buscar por nombre o correo…"
                etiquetaFiltros="Filtrar por rol"
                filtroActivo={filtroRolAsignar}
                onFiltro={(v) => setFiltroRolAsignar(f => (f === v ? '' : v))}
                filtros={[
                  { valor: '', texto: 'Todos' },
                  ...ROLES_ASIGNABLES.map(rol => ({ valor: rol, texto: ROLE_LABELS[rol] || rol })),
                ]}
              />

              <Tabla
                columnas={['Usuario', 'Correo', 'Rol', { texto: 'Acciones', srOnly: true }]}
                datos={usuariosAsignables}
                porPagina={8}
                vacio="No hay usuarios que coincidan (o ya están todos asignados)."
                renderFila={u => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    <td><span className="pi-ges-badge">{ROLE_LABELS[u.rol] || u.rol}</span></td>
                    <td>
                      <button type="button" className="pi-ges-btn-asignar" onClick={() => handleAsignar(u)}>
                        <FaUserPlus /> Asignar
                      </button>
                    </td>
                  </tr>
                )}
              />
            </div>
          </section>
          )}
        </>
      ) : (
        <>
          <div className="pi-ges-header">
            <div>
              <h1>Gestión de eventos</h1>
              <p>Crea eventos y asigna usuarios con su rol para cada uno.</p>
            </div>
            <div className="pi-ges-header-acciones">
              {solicitudes.length > 0 && (
                <button
                  type="button"
                  className="pi-ges-btn-solicitudes"
                  onClick={() => { setErrorSolicitudes(''); setModalSolicitudesAbierto(true); }}
                >
                  <FaFileAlt /> Solicitudes de clientes
                  <span className="pi-ges-solicitudes-contador">{solicitudes.length}</span>
                </button>
              )}
              <button type="button" className="pi-ges-btn-crear" onClick={abrirCrearEvento}>
                <FaPlus /> Crear Evento
              </button>
            </div>
          </div>

          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            placeholder="Buscar evento por nombre o lugar…"
            filtros={FILTROS_ESTADO_EVENTO}
            filtroActivo={filtroEstadoEvento}
            onFiltro={setFiltroEstadoEvento}
            etiquetaFiltros="Filtrar eventos por estado"
          />

          <div className="pi-ges-vista-tabs" role="group" aria-label="Vista de eventos">
            <button type="button" className={vistaEventos === 'lista' ? 'activo' : ''} onClick={() => setVistaEventos('lista')}>
              <FaListUl aria-hidden="true" /> Lista
            </button>
            <button type="button" className={vistaEventos === 'calendario' ? 'activo' : ''} onClick={() => setVistaEventos('calendario')}>
              <FaCalendarAlt aria-hidden="true" /> Calendario
            </button>
          </div>

          {vistaEventos === 'calendario' ? (
            <CalendarioEventos eventos={eventosFiltrados} onSeleccionar={abrirDetalle} />
          ) : (
            <GrillaEventos
              eventos={eventosFiltrados}
              gridClassName="pi-ges-eventos-grid"
              vacio="No se encontraron eventos."
            >
              {ev => (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  onClick={() => abrirDetalle(ev.id)}
                  cta="Gestionar"
                  badges={
                    <span className={`pi-ges-badge-publicacion ${ev.publicadoEn ? 'publicado' : 'borrador'}`}>
                      {ev.publicadoEn ? <><FaCheckCircle /> Publicado</> : <><FaEyeSlash /> Borrador</>}
                    </span>
                  }
                  meta={<><FaUsers /> {contarAsignados(ev.id)} usuarios asignados</>}
                />
              )}
            </GrillaEventos>
          )}
        </>
      )}

      {modalSolicitudesAbierto && (
        <Modal
          titulo={<><FaFileAlt aria-hidden="true" /> Solicitudes de clientes pendientes</>}
          onCerrar={() => setModalSolicitudesAbierto(false)}
          tamano="lg"
        >
          {errorSolicitudes && (
            <p className="pi-ges-error-fechas"><FaExclamationTriangle aria-hidden="true" /> {errorSolicitudes}</p>
          )}
          {solicitudes.length === 0 ? (
            <p className="pi-ges-modal-vacio">No hay solicitudes pendientes.</p>
          ) : (
            <Tabla
              columnas={['Evento propuesto', 'Cliente', 'Lugar', 'Fecha', { texto: 'Acciones', srOnly: true }]}
              datos={solicitudes}
              porPagina={8}
              renderFila={s => (
                <tr key={s.id}>
                  <td>{s.nombreEvento}</td>
                  <td>{s.cliente?.nombre} ({s.cliente?.email})</td>
                  <td>{s.lugar}</td>
                  <td>{formatearFecha(s.fecha)}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="pi-ges-btn-asignar" onClick={() => aprobarSolicitud(s)}>
                      <FaCheckCircle /> Aprobar
                    </button>
                    <button type="button" className="pi-ges-btn-quitar" onClick={() => rechazarSolicitud(s)} title="Rechazar">
                      <FaBan />
                    </button>
                  </td>
                </tr>
              )}
            />
          )}
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
