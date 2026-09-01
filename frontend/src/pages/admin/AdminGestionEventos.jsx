import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch, FaPlus, FaTimes, FaArrowLeft, FaMapMarkerAlt,
  FaUsers, FaTrash, FaUserPlus, FaTicketAlt, FaCog, FaMapMarkedAlt, FaImage, FaQrcode,
  FaCheckCircle, FaBan, FaFileAlt, FaClipboardList
} from 'react-icons/fa';
import { ROLE_LABELS } from '../../constants/roles.js';
import api from '../../api/index.js';
import { formatearFecha } from '../../utils/eventos.js';
import './AdminGestionEventos.css';

const ROLES_ASIGNABLES = ['Cliente', 'Supervisor', 'UsuarioNegocio', 'Recargador', 'Devolucion'];
const FORM_EVENTO_VACIO = { nombre: '', lugar: '', fecha: '', fechaFin: '', imagen: '' };

export default function AdminGestionEventos() {
  useTituloPagina('Gestión de eventos');
  const navigate = useNavigate();

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
  const [eventoIdDetalle, setEventoIdDetalle] = useState(null);
  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [confirmar, DialogoConfirmar] = useConfirmar();

  // Foco del modal de crear evento (A1 / Manual 8.6)
  const modalCrearRef = useRef(null);
  useFocoModal(modalCrearRef, mostrarFormCrear);

  // Modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  useEffect(() => {
    if (!mostrarFormCrear) return;
    const alTecla = (e) => { if (e.key === "Escape") setMostrarFormCrear(false); };
    window.addEventListener("keydown", alTecla);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", alTecla); document.body.style.overflow = ""; };
  }, [mostrarFormCrear]);
  const [formEvento, setFormEvento] = useState(FORM_EVENTO_VACIO);
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
    setEventoIdDetalle(nuevo.id);
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

  const handleCrearEvento = async (e) => {
    e.preventDefault();
    if (!formEvento.nombre.trim() || !formEvento.lugar.trim() || !formEvento.fecha || !formEvento.fechaFin) return;

    const nuevo = await api.eventos.crear(formEvento);
    setEventos(prev => [nuevo, ...prev]);
    setFormEvento(FORM_EVENTO_VACIO);
    setMostrarFormCrear(false);
    setEventoIdDetalle(nuevo.id);
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
              <h1>{eventoDetalle.nombre}</h1>
              <span><FaMapMarkerAlt /> {eventoDetalle.lugar} · {formatearFecha(eventoDetalle.fecha)}</span>
            </div>
          </div>

          <div className="pi-ges-accesos-rapidos">
            <button type="button" onClick={() => navigate('/AdminCrearTickets', { state: { eventoId: eventoDetalle.id } })}>
              <FaTicketAlt /> Tickets del Evento
            </button>
            <button type="button" onClick={() => navigate('/admin/solicitudes', { state: { eventoId: eventoDetalle.id } })}>
              <FaClipboardList /> Solicitudes de Entradas
              {comprasPendientes > 0 && <span className="pi-ges-badge-contador">{comprasPendientes}</span>}
            </button>
            <button type="button" onClick={() => navigate('/admin/qr', { state: { eventoId: eventoDetalle.id } })}>
              <FaQrcode /> Generar QR
            </button>
            <button type="button" onClick={() => navigate('/admin/config', { state: { eventoId: eventoDetalle.id } })}>
              <FaCog /> Configurar Página
            </button>
            <button type="button" onClick={() => navigate('/Mapa', { state: { eventoId: eventoDetalle.id } })}>
              <FaMapMarkedAlt /> Mapa
            </button>
          </div>

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
        </>
      ) : (
        <>
          <div className="pi-ges-header">
            <div>
              <h1>Gestión de eventos</h1>
              <p>Crea eventos y asigna usuarios con su rol para cada uno.</p>
            </div>
            <button type="button" className="pi-ges-btn-crear" onClick={() => setMostrarFormCrear(true)}>
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
              <button type="button" key={ev.id} className="pi-ges-evento-card" onClick={() => setEventoIdDetalle(ev.id)}>
                <img src={ev.imagen} alt={ev.nombre} width="320" height="120" loading="lazy" className="pi-ges-evento-imagen" />
                <div className="pi-ges-evento-info">
                  <strong>{ev.nombre}</strong>
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

      {mostrarFormCrear && (
        <div className="pi-ges-modal-overlay" onClick={() => setMostrarFormCrear(false)}>
          <div ref={modalCrearRef} tabIndex={-1} className="pi-ges-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ges-modal-titulo">
            <div className="pi-ges-modal-header">
              <h2 id="ges-modal-titulo"><FaPlus aria-hidden="true" /> Crear Evento</h2>
              <button type="button" className="pi-ges-btn-close-modal" onClick={() => setMostrarFormCrear(false)} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <div className="pi-ges-modal-body">
              <form className="pi-ges-form" onSubmit={handleCrearEvento}>
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
                  <label htmlFor="ev-imagen">Imagen (URL, opcional)</label>
                  <div className="pi-ges-input-wrapper">
                    <FaImage className="pi-ges-input-icon" aria-hidden="true" />
                    <input
                      id="ev-imagen" type="text" name="imagen" value={formEvento.imagen} onChange={handleChangeFormEvento}
                      placeholder="https://..."
                    />
                  </div>
                  {formEvento.imagen && (
                    <img width="320" height="100" src={formEvento.imagen} alt="Vista previa" className="pi-ges-imagen-preview" />
                  )}
                </div>

                <div className="pi-ges-modal-actions">
                  <button type="button" className="pi-ges-btn-cancelar" onClick={() => setMostrarFormCrear(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="pi-ges-btn-guardar">Crear Evento</button>
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
