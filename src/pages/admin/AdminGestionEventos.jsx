import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch, FaPlus, FaTimes, FaArrowLeft, FaMapMarkerAlt,
  FaUsers, FaTrash, FaUserPlus, FaTicketAlt, FaCog, FaMapMarkedAlt, FaImage
} from 'react-icons/fa';
import { leerEventos, crearEvento } from '../../data/eventosAdmin';
import { leerUsuarios } from '../../data/usuarios';
import { leerAsignaciones, asignarUsuario, quitarAsignacion, ROLES_ASIGNABLES } from '../../data/asignacionesEventos';
import './AdminGestionEventos.css';

const FORM_EVENTO_VACIO = { nombre: '', lugar: '', fecha: '', imagen: '' };
const FORM_ASIGNAR_VACIO = { usuarioId: '', rol: ROLES_ASIGNABLES[0] };

export default function AdminGestionEventos() {
  const navigate = useNavigate();

  const [eventos, setEventos] = useState(leerEventos);
  const [usuarios] = useState(leerUsuarios);
  const [asignaciones, setAsignaciones] = useState(leerAsignaciones);

  const [busqueda, setBusqueda] = useState('');
  const [eventoIdDetalle, setEventoIdDetalle] = useState(null);
  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [formEvento, setFormEvento] = useState(FORM_EVENTO_VACIO);
  const [formAsignar, setFormAsignar] = useState(FORM_ASIGNAR_VACIO);

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

  const handleCrearEvento = (e) => {
    e.preventDefault();
    if (!formEvento.nombre.trim() || !formEvento.lugar.trim() || !formEvento.fecha.trim()) return;

    const { lista, nuevo } = crearEvento(formEvento);
    setEventos(lista);
    setFormEvento(FORM_EVENTO_VACIO);
    setMostrarFormCrear(false);
    setEventoIdDetalle(nuevo.id);
  };

  const handleAsignar = (e) => {
    e.preventDefault();
    if (!formAsignar.usuarioId || !eventoIdDetalle) return;

    const actualizadas = asignarUsuario(eventoIdDetalle, Number(formAsignar.usuarioId), formAsignar.rol);
    setAsignaciones(actualizadas);
    setFormAsignar(FORM_ASIGNAR_VACIO);
  };

  const handleQuitarAsignacion = (id) => {
    if (!window.confirm('¿Quitar a este usuario del evento?')) return;
    setAsignaciones(quitarAsignacion(id));
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
              <span><FaMapMarkerAlt /> {eventoDetalle.lugar} · {eventoDetalle.fecha}</span>
            </div>
          </div>

          <div className="pi-ges-accesos-rapidos">
            <button onClick={() => navigate('/AdminCrearTickets', { state: { eventoId: eventoDetalle.id } })}>
              <FaTicketAlt /> Tickets del Evento
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
                        <td><span className="pi-ges-badge">{a.rol}</span></td>
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
                  <option key={rol} value={rol}>{rol}</option>
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
                  <span><FaMapMarkerAlt /> {ev.lugar} · {ev.fecha}</span>
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
                  <label>Fecha</label>
                  <input
                    type="text" name="fecha" value={formEvento.fecha} onChange={handleChangeFormEvento}
                    placeholder="Ej: 20 Dic, 2027" required
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
