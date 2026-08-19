import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FaCalendarAlt, FaTicketAlt, FaPlus, FaTrash, FaTags, FaAlignLeft,
  FaBoxes, FaDollarSign, FaCoins
} from 'react-icons/fa';
import { leerEventos } from './data/eventosAdmin';
import './AdminCrearTickets.css';

// --- CATEGORÍAS DE TICKET YA CREADAS POR EVENTO (semilla) ---
const CLAVE_TICKETS = 'pi_tickets_categorias';
const categoriasIniciales = {
  ev1: [
    { id: 1, nombre: 'General', descripcion: 'Acceso general al recinto del evento.', cantidad: 500, precio: 150 },
    { id: 2, nombre: 'VIP', descripcion: 'Acceso a zona VIP con área preferencial.', cantidad: 100, precio: 300 },
    { id: 3, nombre: 'Staff', descripcion: 'Acceso de personal autorizado del evento.', cantidad: 30, precio: 0 },
  ],
  ev2: [
    { id: 1, nombre: 'General', descripcion: 'Entrada libre a la feria gastronómica.', cantidad: 200, precio: 50 },
  ],
};

const leerCategoriasPorEvento = () => {
  const guardado = localStorage.getItem(CLAVE_TICKETS);
  return guardado ? JSON.parse(guardado) : categoriasIniciales;
};

const guardarCategoriasPorEvento = (obj) => {
  localStorage.setItem(CLAVE_TICKETS, JSON.stringify(obj));
};

export default function AdminCrearTickets() {
  const location = useLocation();
  const eventosDisponibles = useMemo(() => leerEventos(), []);

  const [eventoId, setEventoId] = useState(location.state?.eventoId || eventosDisponibles[0]?.id);
  const [categoriasPorEvento, setCategoriasPorEvento] = useState(leerCategoriasPorEvento);

  const [formCategoria, setFormCategoria] = useState({ nombre: '', descripcion: '', cantidad: '', precio: '' });

  const categorias = useMemo(
    () => categoriasPorEvento[eventoId] || [],
    [categoriasPorEvento, eventoId]
  );

  const totales = useMemo(() => {
    const totalCategorias = categorias.length;
    const totalTickets = categorias.reduce((suma, c) => suma + Number(c.cantidad), 0);
    const ingresoPotencial = categorias.reduce((suma, c) => suma + Number(c.cantidad) * Number(c.precio), 0);
    return { totalCategorias, totalTickets, ingresoPotencial };
  }, [categorias]);

  const handleChange = (e) => {
    setFormCategoria({ ...formCategoria, [e.target.name]: e.target.value });
  };

  const agregarCategoria = (e) => {
    e.preventDefault();
    if (!formCategoria.nombre || !formCategoria.cantidad || formCategoria.precio === '') return;

    const nuevaCategoria = {
      id: Date.now(),
      nombre: formCategoria.nombre,
      descripcion: formCategoria.descripcion,
      cantidad: Number(formCategoria.cantidad),
      precio: Number(formCategoria.precio),
    };

    setCategoriasPorEvento(prev => {
      const actualizado = { ...prev, [eventoId]: [...(prev[eventoId] || []), nuevaCategoria] };
      guardarCategoriasPorEvento(actualizado);
      return actualizado;
    });

    setFormCategoria({ nombre: '', descripcion: '', cantidad: '', precio: '' });
  };

  const eliminarCategoria = (id) => {
    if (!window.confirm('¿Eliminar esta categoría de ticket?')) return;
    setCategoriasPorEvento(prev => {
      const actualizado = { ...prev, [eventoId]: prev[eventoId].filter(c => c.id !== id) };
      guardarCategoriasPorEvento(actualizado);
      return actualizado;
    });
  };

  return (
    <div className="pi-adtick-container">

      <div className="pi-adtick-header">
        <div>
          <h2>Tickets del Evento</h2>
          <p>Crea las categorías de ticket disponibles para cada evento: cantidad, descripción y precio.</p>
        </div>
        <div className="pi-adtick-selector-evento">
          <FaCalendarAlt />
          <select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            {eventosDisponibles.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- KPIs --- */}
      <div className="pi-adtick-kpi-grid">
        <div className="pi-adtick-kpi-card">
          <FaTags color="var(--indigo-profundo)" size={20} />
          <span className="numero">{totales.totalCategorias}</span>
          <span className="label">Categorías creadas</span>
        </div>
        <div className="pi-adtick-kpi-card">
          <FaTicketAlt color="var(--cian-digital-texto)" size={20} />
          <span className="numero">{totales.totalTickets}</span>
          <span className="label">Tickets disponibles</span>
        </div>
        <div className="pi-adtick-kpi-card">
          <FaCoins color="var(--verde-recarga-texto)" size={20} />
          <span className="numero">Bs. {totales.ingresoPotencial}</span>
          <span className="label">Ingreso potencial</span>
        </div>
      </div>

      {/* --- FORMULARIO: NUEVA CATEGORÍA --- */}
      <div className="pi-adtick-card">
        <h3 className="pi-adtick-subtitulo">Añadir Categoría de Ticket</h3>
        <form onSubmit={agregarCategoria} className="pi-adtick-form">
          <div className="pi-adtick-form-grid">
            <div className="pi-adtick-input-group">
              <label>Nombre de la categoría</label>
              <div className="pi-adtick-input-wrapper">
                <FaTags className="pi-adtick-input-icon" />
                <input
                  type="text"
                  name="nombre"
                  value={formCategoria.nombre}
                  onChange={handleChange}
                  placeholder="Ej: VIP"
                  required
                />
              </div>
            </div>

            <div className="pi-adtick-input-group">
              <label>Cantidad de tickets</label>
              <div className="pi-adtick-input-wrapper">
                <FaBoxes className="pi-adtick-input-icon" />
                <input
                  type="number"
                  min="1"
                  name="cantidad"
                  value={formCategoria.cantidad}
                  onChange={handleChange}
                  placeholder="Ej: 200"
                  required
                />
              </div>
            </div>

            <div className="pi-adtick-input-group">
              <label>Precio (Bs.)</label>
              <div className="pi-adtick-input-wrapper">
                <FaDollarSign className="pi-adtick-input-icon" />
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  name="precio"
                  value={formCategoria.precio}
                  onChange={handleChange}
                  placeholder="Ej: 150"
                  required
                />
              </div>
            </div>

            <div className="pi-adtick-input-group pi-adtick-input-descripcion">
              <label>Descripción</label>
              <div className="pi-adtick-input-wrapper">
                <FaAlignLeft className="pi-adtick-input-icon" />
                <input
                  type="text"
                  name="descripcion"
                  value={formCategoria.descripcion}
                  onChange={handleChange}
                  placeholder="Ej: Acceso a zona VIP con área preferencial"
                />
              </div>
            </div>
          </div>

          <div className="pi-adtick-form-actions">
            <button type="submit" className="pi-adtick-btn-add">
              <FaPlus /> Crear Categoría
            </button>
          </div>
        </form>
      </div>

      {/* --- TABLA DE CATEGORÍAS --- */}
      <div className="pi-adtick-card">
        <h3 className="pi-adtick-subtitulo">Categorías creadas para este evento</h3>
        <div className="pi-adtick-table-wrapper">
          <table className="pi-adtick-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(cat => (
                <tr key={cat.id}>
                  <td><span className="pi-adtick-badge-nombre">{cat.nombre}</span></td>
                  <td><span className="celda-secundaria">{cat.descripcion || '—'}</span></td>
                  <td>{cat.cantidad}</td>
                  <td className="pi-adtick-precio-celda">{cat.precio > 0 ? `Bs. ${cat.precio}` : 'Gratis'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="pi-adtick-btn-delete" onClick={() => eliminarCategoria(cat.id)} title="Eliminar categoría">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan="5" className="pi-adtick-empty">
                    Aún no hay categorías de ticket para este evento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
