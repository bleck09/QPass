import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation } from 'react-router-dom';
import {
  FaSearch, FaPlus, FaTimes, FaArrowLeft, FaMapMarkerAlt,
  FaUsers, FaTrash, FaUserPlus, FaTicketAlt, FaCog, FaMapMarkedAlt, FaImage, FaQrcode,
  FaCheckCircle, FaBan, FaFileAlt, FaClipboardList, FaArchive, FaUndo, FaExclamationTriangle, FaPen
} from 'react-icons/fa';
import { ROLE_LABELS } from '../../constants/roles.js';
import api from '../../api/index.js';
import { formatearFecha, estadoEvento } from '../../utils/eventos.js';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import MapaSelector from '../../components/MapaSelector.jsx';
import AdminCrearTickets from './AdminCrearTickets.jsx';
import AdminCrearQr from './AdminCrearQr.jsx';
import AdminConfigurarPagina from './AdminConfigurarPagina.jsx';
import Mapa from './Mapa.jsx';
import Admin from './Admin.jsx';
import './AdminGestionEventos.css';

// Pestañas del detalle de evento (todo se ve acá mismo, sin cambiar de página).
const PESTANAS = [
  { id: 'asignados', label: 'Usuarios asignados', icono: <FaUsers /> },
  { id: 'tickets', label: 'Tickets del Evento', icono: <FaTicketAlt /> },
  { id: 'solicitudes', label: 'Solicitudes de Entradas', icono: <FaClipboardList /> },
  { id: 'reportes', label: 'Reportes', icono: <FaExclamationTriangle /> },
  { id: 'qr', label: 'Generar QR', icono: <FaQrcode /> },
  { id: 'config', label: 'Configurar Página', icono: <FaCog /> },
  { id: 'mapa', label: 'Mapa', icono: <FaMapMarkedAlt /> },
];

const ROLES_ASIGNABLES = ['Cliente', 'Supervisor', 'UsuarioNegocio', 'Recargador', 'Devolucion'];
const FORM_EVENTO_VACIO = { nombre: '', lugar: '', coordenadas: '', fecha: '', fechaFin: '', imagen: '' };
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
      api.eventos.listar(),
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
  // Helpers para conservar las actualizaciones optimistas que había con setState.
  const setEventos = (fn) => setDatos(d => ({ ...d, eventos: typeof fn === 'function' ? fn(d.eventos) : fn }));
  const setAsignaciones = (fn) => setDatos(d => ({ ...d, asignaciones: typeof fn === 'function' ? fn(d.asignaciones) : fn }));
  const setSolicitudes = (fn) => setDatos(d => ({ ...d, solicitudes: typeof fn === 'function' ? fn(d.solicitudes) : fn }));

  const [busqueda, setBusqueda] = useState('');
  // Al volver desde una subpágina se llega con location.state.eventoId -> abrimos
  // ese evento directo, no la lista.
  const [eventoIdDetalle, setEventoIdDetalle] = useState(location.state?.eventoId ?? null);
  const [pestana, setPestana] = useState('asignados');

  const abrirDetalle = (id) => {
    setEventoIdDetalle(id);
    setPestana('asignados');
  };
  const [modalEventoAbierto, setModalEventoAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // null = crear; id = editar
  const [confirmar, DialogoConfirmar] = useConfirmar();

  // Foco del modal de crear/editar evento (A1 / Manual 8.6)
  const modalCrearRef = useRef(null);
  useFocoModal(modalCrearRef, modalEventoAbierto);

  // Modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  useEffect(() => {
    if (!modalEventoAbierto) return;
    const alTecla = (e) => { if (e.key === "Escape") setModalEventoAbierto(false); };
    window.addEventListener("keydown", alTecla);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", alTecla); document.body.style.overflow = ""; };
  }, [modalEventoAbierto]);
  const [formEvento, setFormEvento] = useState(FORM_EVENTO_VACIO);
  const [errorImagen, setErrorImagen] = useState('');
  const [previewFallo, setPreviewFallo] = useState(false);

  const abrirCrearEvento = () => {
    setEditandoId(null);
    setErrorImagen('');
    setPreviewFallo(false);
    setFormEvento(FORM_EVENTO_VACIO);
    setModalEventoAbierto(true);
  };

  const abrirEditarEvento = (ev) => {
    setEditandoId(ev.id);
    setErrorImagen('');
    setPreviewFallo(false);
    setFormEvento({
      nombre: ev.nombre || '',
      lugar: ev.lugar || '',
      coordenadas: ev.coordenadas || '',
      imagen: ev.imagen || '',
      fecha: isoADatetimeLocal(ev.fecha),
      fechaFin: isoADatetimeLocal(ev.fechaFin),
    });
    setModalEventoAbierto(true);
  };
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

  const aprobarSolicitud = async (s) => {
    const ok = await confirmar({
      titulo: '¿Aprobar la solicitud?',
      mensaje: `Se creará el evento real "${s.nombreEvento}" a partir de esta solicitud.`,
      textoConfirmar: 'Aprobar y crear',
    });
    if (!ok) return;
    const nuevo = await api.solicitudesEvento.aprobar(s.id);
    setEventos(prev => [nuevo, ...prev]);
    setSolicitudes(prev => prev.filter(x => x.id !== s.id));
    abrirDetalle(nuevo.id);
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

  const eventosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase();
    return eventos.filter(ev =>
      ev.nombre.toLowerCase().includes(termino) ||
      ev.lugar.toLowerCase().includes(termino)
    );
  }, [eventos, busqueda]);

  const eventoDetalle = eventos.find(ev => ev.id === eventoIdDetalle) || null;

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

  // La imagen se sube como archivo y se guarda en base64 (mismo criterio que el
  // resto del panel: logos, fotos de perfil, portada de la página pública).
  const handleImagenUpload = (e) => {
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
    const reader = new FileReader();
    reader.onloadend = () => {
      setErrorImagen('');
      setPreviewFallo(false);
      setFormEvento(f => ({ ...f, imagen: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarEvento = async (e) => {
    e.preventDefault();
    if (!formEvento.nombre.trim() || !formEvento.lugar.trim() || !formEvento.fecha || !formEvento.fechaFin) return;

    if (editandoId) {
      const actualizado = await api.eventos.actualizar(editandoId, formEvento);
      setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
      setModalEventoAbierto(false);
      return;
    }

    const nuevo = await api.eventos.crear(formEvento);
    setEventos(prev => [nuevo, ...prev]);
    setFormEvento(FORM_EVENTO_VACIO);
    setModalEventoAbierto(false);
    abrirDetalle(nuevo.id);
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
      {eventoDetalle ? (
        <>
          <button type="button" className="pi-ges-btn-volver" onClick={() => setEventoIdDetalle(null)}>
            <FaArrowLeft /> Volver a Gestión de Eventos
          </button>

          <div className="pi-ges-detalle-header">
            <img width="96" height="96" src={eventoDetalle.imagen} alt={eventoDetalle.nombre} className="pi-ges-detalle-imagen" />
            <div className="pi-ges-detalle-info">
              <h1>{eventoDetalle.nombre} <BadgeEstadoEvento evento={eventoDetalle} /></h1>
              <span>
                <FaMapMarkerAlt /> {eventoDetalle.lugar}
                {eventoDetalle.coordenadas ? ` (${eventoDetalle.coordenadas})` : ''} · {formatearFecha(eventoDetalle.fecha)}
              </span>
            </div>
            <div className="pi-ges-detalle-acciones">
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

          {pestana === 'tickets' && <AdminCrearTickets eventoId={eventoDetalle.id} embebido />}
          {pestana === 'solicitudes' && <Admin eventoIdFijo={eventoDetalle.id} vistaFija="solicitudesEntradas" />}
          {pestana === 'reportes' && <Admin eventoIdFijo={eventoDetalle.id} vistaFija="incidencias" />}
          {pestana === 'qr' && <AdminCrearQr eventoId={eventoDetalle.id} embebido />}
          {pestana === 'config' && <AdminConfigurarPagina eventoId={eventoDetalle.id} embebido />}
          {pestana === 'mapa' && <Mapa eventoId={eventoDetalle.id} embebido />}

          {pestana === 'asignados' && (
          <section className="pi-ges-seccion">
            <h3 className="pi-ges-seccion-titulo"><FaUsers /> Usuarios asignados</h3>

            <div className="pi-ges-tabla-wrapper">
              <table className="pi-ges-tabla">
                <thead>
                  <tr><th scope="col">Usuario</th><th scope="col">Correo</th><th scope="col">Rol en el evento</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {asignacionesDelEvento.map(a => {
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
                  })}
                  {asignacionesDelEvento.length === 0 && (
                    <tr><td colSpan={4} className="pi-ges-sin-resultados">Aún no hay usuarios asignados a este evento.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pi-ges-asignar-panel">
              <h4 className="pi-ges-asignar-titulo"><FaUserPlus /> Asignar usuario al evento</h4>
              <p className="pi-ges-asignar-ayuda">
                El rol en el evento es el mismo rol de la cuenta. Elegí a la persona.
              </p>

              <div className="pi-ges-asignar-filtros">
                <div className="pi-ges-buscador">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o correo..."
                    value={busquedaUsuario}
                    onChange={(e) => setBusquedaUsuario(e.target.value)}
                  />
                </div>
                <div className="pi-ges-asignar-chips">
                  <button
                    type="button"
                    className={`pi-ges-chip${!filtroRolAsignar ? ' activo' : ''}`}
                    onClick={() => setFiltroRolAsignar('')}
                  >
                    Todos
                  </button>
                  {ROLES_ASIGNABLES.map(rol => (
                    <button
                      key={rol}
                      type="button"
                      className={`pi-ges-chip${filtroRolAsignar === rol ? ' activo' : ''}`}
                      onClick={() => setFiltroRolAsignar(f => (f === rol ? '' : rol))}
                    >
                      {ROLE_LABELS[rol] || rol}
                    </button>
                  ))}
                </div>
              </div>

              <ul className="pi-ges-asignar-lista">
                {usuariosAsignables.map(u => (
                  <li key={u.id} className="pi-ges-asignar-item">
                    <div className="pi-ges-asignar-item-info">
                      <strong>{u.nombre}</strong>
                      <span>{u.email}</span>
                    </div>
                    <span className="pi-ges-badge">{ROLE_LABELS[u.rol] || u.rol}</span>
                    <button
                      type="button"
                      className="pi-ges-btn-asignar"
                      onClick={() => handleAsignar(u)}
                    >
                      <FaUserPlus /> Asignar
                    </button>
                  </li>
                ))}
                {usuariosAsignables.length === 0 && (
                  <li className="pi-ges-sin-resultados">
                    No hay usuarios que coincidan (o ya están todos asignados).
                  </li>
                )}
              </ul>
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
            <button type="button" className="pi-ges-btn-crear" onClick={abrirCrearEvento}>
              <FaPlus /> Crear Evento
            </button>
          </div>

          {solicitudes.length > 0 && (
            <section className="pi-ges-seccion">
              <h3 className="pi-ges-seccion-titulo"><FaFileAlt /> Solicitudes de Clientes pendientes</h3>
              <div className="pi-ges-tabla-wrapper">
                <table className="pi-ges-tabla">
                  <thead>
                    <tr><th scope="col">Evento propuesto</th><th scope="col">Cliente</th><th scope="col">Lugar</th><th scope="col">Fecha</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
                  </thead>
                  <tbody>
                    {solicitudes.map(s => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="pi-ges-buscador">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar evento por nombre o lugar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="pi-ges-eventos-grid">
            {eventosFiltrados.map(ev => (
              <button type="button" key={ev.id} className="pi-ges-evento-card" onClick={() => abrirDetalle(ev.id)}>
                <img src={ev.imagen} alt={ev.nombre} width="320" height="120" loading="lazy" className="pi-ges-evento-imagen" />
                <div className="pi-ges-evento-info">
                  <strong>{ev.nombre} <BadgeEstadoEvento evento={ev} /></strong>
                  <span><FaMapMarkerAlt /> {ev.lugar} · {formatearFecha(ev.fecha)}</span>
                  <span className="pi-ges-evento-usuarios"><FaUsers /> {contarAsignados(ev.id)} usuarios asignados</span>
                </div>
              </button>
            ))}
            {eventosFiltrados.length === 0 && (
              <p className="pi-ges-sin-resultados">No se encontraron eventos.</p>
            )}
          </div>
        </>
      )}

      {modalEventoAbierto && (
        <div className="pi-ges-modal-overlay" onClick={() => setModalEventoAbierto(false)}>
          <div ref={modalCrearRef} tabIndex={-1} className="pi-ges-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ges-modal-titulo">
            <div className="pi-ges-modal-header">
              <h2 id="ges-modal-titulo">
                {editandoId ? <><FaPen aria-hidden="true" /> Editar Evento</> : <><FaPlus aria-hidden="true" /> Crear Evento</>}
              </h2>
              <button type="button" className="pi-ges-btn-close-modal" onClick={() => setModalEventoAbierto(false)} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <div className="pi-ges-modal-body">
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
                  <label>Ubicación en el mapa (opcional)</label>
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
                  <label htmlFor="ev-imagen">Imagen del evento (opcional)</label>
                  <div className="pi-ges-image-upload">
                    <label htmlFor="ev-imagen" className="pi-ges-btn-upload">
                      <FaImage aria-hidden="true" /> {formEvento.imagen ? 'Cambiar imagen' : 'Subir imagen'}
                    </label>
                    <input
                      id="ev-imagen" type="file" accept="image/*" onChange={handleImagenUpload} hidden
                    />
                    {formEvento.imagen && (
                      <button
                        type="button"
                        className="pi-ges-btn-quitar-imagen"
                        onClick={() => { setErrorImagen(''); setFormEvento(f => ({ ...f, imagen: '' })); }}
                      >
                        <FaTimes aria-hidden="true" /> Quitar
                      </button>
                    )}
                  </div>
                  {errorImagen && <p className="pi-ges-error-imagen">{errorImagen}</p>}
                  {formEvento.imagen && !previewFallo && (
                    <img
                      width="320" height="100" src={formEvento.imagen} alt="Vista previa"
                      className="pi-ges-imagen-preview"
                      onError={() => setPreviewFallo(true)}
                      onLoad={() => setPreviewFallo(false)}
                    />
                  )}
                  {formEvento.imagen && previewFallo && (
                    <p className="pi-ges-error-imagen">
                      No se puede mostrar esta imagen. Probá con otra en formato JPG o PNG.
                    </p>
                  )}
                </div>

                <div className="pi-ges-modal-actions">
                  <button type="button" className="pi-ges-btn-cancelar" onClick={() => setModalEventoAbierto(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="pi-ges-btn-guardar">
                    {editandoId ? 'Guardar cambios' : 'Crear Evento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {DialogoConfirmar}
    </div>
  );
}
