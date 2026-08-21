import { useEffect, useMemo, useState } from 'react';
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
const FORM_ASIGNAR_VACIO = { usuarioId: '', rol: ROLES_ASIGNABLES[0] };

export default function AdminGestionEventos() {
  const navigate = useNavigate();

  const [eventos, setEventos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [eventoIdDetalle, setEventoIdDetalle] = useState(null);
  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [formEvento, setFormEvento] = useState(FORM_EVENTO_VACIO);
  const [formAsignar, setFormAsignar] = useState(FORM_ASIGNAR_VACIO);
  const [comprasPendientes, setComprasPendientes] = useState(0);

  useEffect(() => {
    if (!eventoIdDetalle) return;
    api.compras.listar({ eventoId: eventoIdDetalle }).then(lista =>
      setComprasPendientes(lista.filter(c => c.estado === 'pendiente').length)
    );
  }, [eventoIdDetalle]);

  useEffect(() => {
    api.eventos.listar().then(setEventos);
    api.usuarios.listar().then(setUsuarios);
    api.asignaciones.listar().then(setAsignaciones);
    api.solicitudesEvento.listar({ estado: 'pendiente' }).then(setSolicitudes);
  }, []);

  const aprobarSolicitud = async (s) => {
    if (!window.confirm(`¿Aprobar "${s.nombreEvento}" y crear el evento real?`)) return;
    const nuevo = await api.solicitudesEvento.aprobar(s.id);
    setEventos(prev => [nuevo, ...prev]);
    setSolicitudes(prev => prev.filter(x => x.id !== s.id));
    setEventoIdDetalle(nuevo.id);
  };

  const rechazarSolicitud = async (s) => {
    const motivo = window.prompt('¿Por qué se rechaza esta solicitud? (el cliente lo verá)');
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

  const handleAsignar = async (e) => {
    e.preventDefault();
    if (!formAsignar.usuarioId || !eventoIdDetalle) return;

    await api.asignaciones.asignar({ eventoId: eventoIdDetalle, usuarioId: Number(formAsignar.usuarioId), rol: formAsignar.rol });
    setAsignaciones(await api.asignaciones.listar());
    setFormAsignar(FORM_ASIGNAR_VACIO);
  };

  const handleQuitarAsignacion = async (id) => {
    if (!window.confirm('¿Quitar a este usuario del evento?')) return;
    await api.asignaciones.quitar(id);
    setAsignaciones(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="pi-ges-container">
      {eventoDetalle ? (
        <>
          <button className="pi-ges-btn-volver" onClick={() => setEventoIdDetalle(null)}>
            <FaArrowLeft /> Volver a Gestión de Eventos
          </button>

          <div className="pi-ges-detalle-header">
            <img src={eventoDetalle.imagen} alt={eventoDetalle.nombre} className="pi-ges-detalle-imagen" />
            <div className="pi-ges-detalle-info">
              <h2>{eventoDetalle.nombre}</h2>
              <span><FaMapMarkerAlt /> {eventoDetalle.lugar} · {formatearFecha(eventoDetalle.fecha)}</span>
            </div>
          </div>

          <div className="pi-ges-accesos-rapidos">
            <button onClick={() => navigate('/AdminCrearTickets', { state: { eventoId: eventoDetalle.id } })}>
              <FaTicketAlt /> Tickets del Evento
            </button>
            <button onClick={() => navigate('/admin/solicitudes', { state: { eventoId: eventoDetalle.id } })}>
              <FaClipboardList /> Solicitudes de Entradas
              {comprasPendientes > 0 && <span className="pi-ges-badge-contador">{comprasPendientes}</span>}
            </button>
            <button onClick={() => navigate('/admin/qr', { state: { eventoId: eventoDetalle.id } })}>
              <FaQrcode /> Generar QR
            </button>
            <button onClick={() => navigate('/admin/config', { state: { eventoId: eventoDetalle.id } })}>
              <FaCog /> Configurar Página
            </button>
            <button onClick={() => navigate('/Mapa', { state: { eventoId: eventoDetalle.id } })}>
              <FaMapMarkedAlt /> Mapa
            </button>
          </div>

          <section className="pi-ges-seccion">
            <h3 className="pi-ges-seccion-titulo"><FaUsers /> Usuarios asignados</h3>

            <div className="pi-ges-tabla-wrapper">
              <table className="pi-ges-tabla">
                <thead>
                  <tr><th>Usuario</th><th>Correo</th><th>Rol en el evento</th><th></th></tr>
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
                          <button className="pi-ges-btn-quitar" onClick={() => handleQuitarAsignacion(a.id)} title="Quitar del evento">
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

            <form className="pi-ges-form-asignar" onSubmit={handleAsignar}>
              <select
                value={formAsignar.usuarioId}
                onChange={(e) => setFormAsignar({ ...formAsignar, usuarioId: e.target.value })}
              >
                <option value="">Selecciona un usuario...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                ))}
              </select>
              <select
                value={formAsignar.rol}
                onChange={(e) => setFormAsignar({ ...formAsignar, rol: e.target.value })}
              >
                {ROLES_ASIGNABLES.map(rol => (
                  <option key={rol} value={rol}>{ROLE_LABELS[rol] || rol}</option>
                ))}
              </select>
              <button type="submit" className="pi-ges-btn-asignar"><FaUserPlus /> Asignar</button>
            </form>
          </section>
        </>
      ) : (
        <>
          <div className="pi-ges-header">
            <div>
              <h2>Gestión de Eventos</h2>
              <p>Crea eventos y asigna usuarios con su rol para cada uno.</p>
            </div>
            <button className="pi-ges-btn-crear" onClick={() => setMostrarFormCrear(true)}>
              <FaPlus /> Crear Evento
            </button>
          </div>

          {solicitudes.length > 0 && (
            <section className="pi-ges-seccion">
              <h3 className="pi-ges-seccion-titulo"><FaFileAlt /> Solicitudes de Clientes pendientes</h3>
              <div className="pi-ges-tabla-wrapper">
                <table className="pi-ges-tabla">
                  <thead>
                    <tr><th>Evento propuesto</th><th>Cliente</th><th>Lugar</th><th>Fecha</th><th></th></tr>
                  </thead>
                  <tbody>
                    {solicitudes.map(s => (
                      <tr key={s.id}>
                        <td>{s.nombreEvento}</td>
                        <td>{s.cliente?.nombre} ({s.cliente?.email})</td>
                        <td>{s.lugar}</td>
                        <td>{formatearFecha(s.fecha)}</td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button className="pi-ges-btn-asignar" onClick={() => aprobarSolicitud(s)}>
                            <FaCheckCircle /> Aprobar
                          </button>
                          <button className="pi-ges-btn-quitar" onClick={() => rechazarSolicitud(s)} title="Rechazar">
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
              <button key={ev.id} className="pi-ges-evento-card" onClick={() => setEventoIdDetalle(ev.id)}>
                <img src={ev.imagen} alt={ev.nombre} className="pi-ges-evento-imagen" />
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
        <div className="pi-ges-modal-overlay">
          <div className="pi-ges-modal">
            <div className="pi-ges-modal-header">
              <h2><FaPlus /> Crear Evento</h2>
              <button className="pi-ges-btn-close-modal" onClick={() => setMostrarFormCrear(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="pi-ges-modal-body">
              <form className="pi-ges-form" onSubmit={handleCrearEvento}>
                <div className="pi-ges-input-group">
                  <label>Nombre del evento</label>
                  <input
                    type="text" name="nombre" value={formEvento.nombre} onChange={handleChangeFormEvento}
                    placeholder="Ej: Festival de Verano 2027" required
                  />
                </div>
                <div className="pi-ges-input-group">
                  <label>Lugar</label>
                  <input
                    type="text" name="lugar" value={formEvento.lugar} onChange={handleChangeFormEvento}
                    placeholder="Ej: Campo Ferial, Cbba" required
                  />
                </div>
                <div className="pi-ges-input-group">
                  <label>Fecha y hora de inicio</label>
                  <input
                    type="datetime-local" name="fecha" value={formEvento.fecha} onChange={handleChangeFormEvento}
                    required
                  />
                </div>
                <div className="pi-ges-input-group">
                  <label>Fecha y hora de cierre</label>
                  <input
                    type="datetime-local" name="fechaFin" value={formEvento.fechaFin} onChange={handleChangeFormEvento}
                    min={formEvento.fecha || undefined} required
                  />
                </div>
                <div className="pi-ges-input-group">
                  <label>Imagen (URL, opcional)</label>
                  <div className="pi-ges-input-wrapper">
                    <FaImage className="pi-ges-input-icon" />
                    <input
                      type="text" name="imagen" value={formEvento.imagen} onChange={handleChangeFormEvento}
                      placeholder="https://..."
                    />
                  </div>
                  {formEvento.imagen && (
                    <img src={formEvento.imagen} alt="Vista previa" className="pi-ges-imagen-preview" />
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
    </div>
  );
}
