import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaTicketAlt, FaPlus, FaTrash, FaTags, FaAlignLeft,
  FaBoxes, FaDollarSign, FaCoins, FaCheckCircle, FaHourglassHalf
} from 'react-icons/fa';
import BotonVolver from '../../components/BotonVolver.jsx';
import api from '../../api/index.js';
import './AdminCrearTickets.css';

export default function AdminCrearTickets({ eventoId: eventoIdProp = null, embebido = false } = {}) {
  useTituloPagina('Categorías de ticket', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(eventoIdProp || location.state?.eventoId || '');
  // Embebido (pestaña del detalle de evento) o llegado desde Gestión de Eventos:
  // el evento queda fijo (sin selector, sin botón volver).
  const eventoBloqueado = embebido || !!location.state?.eventoId;
  const [confirmar, DialogoConfirmar] = useConfirmar();

  // Categorías del evento con estados cargando/error/reintentar (Manual 8.9).
  const cargarCategorias = useCallback(
    () => api.categoriasTicket.listar(eventoId),
    [eventoId],
  );
  const {
    data: categorias,
    setData: setCategorias,
    cargando: cargandoCategorias,
    error: errorCategorias,
    recargar: recargarCategorias,
  } = useApi(cargarCategorias, { inicial: [], activo: !!eventoId });

  const [formCategoria, setFormCategoria] = useState({ nombre: '', descripcion: '', cantidad: '', precio: '' });

  useEffect(() => {
    if (embebido) return;
    api.eventos.listar().then(lista => {
      setEventosDisponibles(lista);
      setEventoId(prev => prev || lista[0]?.id);
    });
  }, [embebido]);

  const totales = useMemo(() => {
    const totalCategorias = categorias.length;
    const cupoTotal = categorias.reduce((s, c) => s + Number(c.cantidad), 0);
    const vendidas = categorias.reduce((s, c) => s + Number(c.vendidas || 0), 0);
    const reservadas = categorias.reduce((s, c) => s + Number(c.reservadas || 0), 0);
    const disponibles = categorias.reduce(
      (s, c) => s + Number(c.disponibles ?? (c.cantidad - (c.cantidadVendida || 0))),
      0,
    );
    const ingresoPotencial = categorias.reduce((s, c) => s + Number(c.cantidad) * Number(c.precio), 0);
    return { totalCategorias, cupoTotal, vendidas, reservadas, disponibles, ingresoPotencial };
  }, [categorias]);

  const handleChange = (e) => {
    setFormCategoria({ ...formCategoria, [e.target.name]: e.target.value });
  };

  const agregarCategoria = async (e) => {
    e.preventDefault();
    if (!formCategoria.nombre || !formCategoria.cantidad || formCategoria.precio === '') return;

    const nuevaCategoria = await api.categoriasTicket.crear({
      eventoId,
      nombre: formCategoria.nombre,
      descripcion: formCategoria.descripcion,
      cantidad: Number(formCategoria.cantidad),
      precio: Number(formCategoria.precio),
    });

    setCategorias(prev => [...prev, nuevaCategoria]);
    setFormCategoria({ nombre: '', descripcion: '', cantidad: '', precio: '' });
  };

  const eliminarCategoria = async (id) => {
    const ok = await confirmar({
      titulo: '¿Eliminar la categoría?',
      mensaje: 'Se eliminará esta categoría de ticket del evento.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    await api.categoriasTicket.eliminar(id);
    setCategorias(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="pi-adtick-container">

      {!embebido && (
        <BotonVolver onClick={() => navigate('/admin/eventos', { state: { eventoId } })}>
          Volver al evento
        </BotonVolver>
      )}

      {!embebido && (
        <div className="pi-adtick-header">
          <div>
            <h1>Tickets del evento</h1>
            <p>Crea las categorías de ticket disponibles para cada evento: cantidad, descripción y precio.</p>
          </div>
          <div className="pi-adtick-selector-evento">
            <FaCalendarAlt />
            {eventoBloqueado ? (
              <strong>{eventosDisponibles.find(ev => ev.id === eventoId)?.nombre || 'Evento'}</strong>
            ) : (
              <select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                {eventosDisponibles.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* --- KPIs --- */}
      <div className="pi-adtick-kpi-grid">
        <div className="pi-adtick-kpi-card">
          <FaTags color="var(--indigo-profundo)" size={20} />
          <span className="numero">{totales.totalCategorias}</span>
          <span className="label">Categorías creadas</span>
        </div>
        <div className="pi-adtick-kpi-card">
          <FaTicketAlt color="var(--cian-digital-texto)" size={20} />
          <span className="numero">{totales.cupoTotal}</span>
          <span className="label">Cupo total</span>
        </div>
        <div className="pi-adtick-kpi-card">
          <FaCheckCircle color="var(--verde-recarga-texto)" size={20} />
          <span className="numero">{totales.vendidas}</span>
          <span className="label">Vendidas (aprobadas)</span>
        </div>
        <div className="pi-adtick-kpi-card">
          <FaHourglassHalf color="var(--ambar-aviso-texto)" size={20} />
          <span className="numero">{totales.reservadas}</span>
          <span className="label">Reservadas (por aprobar)</span>
        </div>
        <div className="pi-adtick-kpi-card">
          <FaBoxes color="var(--indigo-profundo)" size={20} />
          <span className="numero">{totales.disponibles}</span>
          <span className="label">Disponibles</span>
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
              <label htmlFor="tk-nombre">Nombre de la categoría</label>
              <div className="pi-adtick-input-wrapper">
                <FaTags className="pi-adtick-input-icon" />
                <input
                  type="text"
                  id="tk-nombre"
                  name="nombre"
                  value={formCategoria.nombre}
                  onChange={handleChange}
                  placeholder="Ej: VIP"
                  required
                />
              </div>
            </div>

            <div className="pi-adtick-input-group">
              <label htmlFor="tk-cantidad">Cantidad de tickets</label>
              <div className="pi-adtick-input-wrapper">
                <FaBoxes className="pi-adtick-input-icon" />
                <input
                  type="number"
                  min="1"
                  id="tk-cantidad"
                  inputMode="numeric"
                  name="cantidad"
                  value={formCategoria.cantidad}
                  onChange={handleChange}
                  placeholder="Ej: 200"
                  required
                />
              </div>
            </div>

            <div className="pi-adtick-input-group">
              <label htmlFor="tk-precio">Precio (Bs.)</label>
              <div className="pi-adtick-input-wrapper">
                <FaDollarSign className="pi-adtick-input-icon" />
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  id="tk-precio"
                  inputMode="decimal"
                  name="precio"
                  value={formCategoria.precio}
                  onChange={handleChange}
                  placeholder="Ej: 150"
                  required
                />
              </div>
            </div>

            <div className="pi-adtick-input-group pi-adtick-input-descripcion">
              <label htmlFor="tk-descripcion">Descripción</label>
              <div className="pi-adtick-input-wrapper">
                <FaAlignLeft className="pi-adtick-input-icon" />
                <input
                  type="text"
                  id="tk-descripcion"
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
        {errorCategorias ? (
          <EstadoError onReintentar={recargarCategorias} />
        ) : cargandoCategorias ? (
          <EstadoCarga filas={4} />
        ) : (
        <div className="pi-adtick-table-wrapper">
          <table className="pi-adtick-table">
            <thead>
              <tr>
                <th scope="col">Categoría</th>
                <th scope="col">Descripción</th>
                <th scope="col">Cupo</th>
                <th scope="col">Vendidas</th>
                <th scope="col">Reservadas</th>
                <th scope="col">Disponibles</th>
                <th scope="col">Precio</th>
                <th scope="col" style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(cat => {
                const disp = cat.disponibles ?? (cat.cantidad - (cat.cantidadVendida || 0));
                return (
                <tr key={cat.id}>
                  <td><span className="pi-adtick-badge-nombre">{cat.nombre}</span></td>
                  <td><span className="celda-secundaria">{cat.descripcion || '—'}</span></td>
                  <td>{cat.cantidad}</td>
                  <td>{cat.vendidas ?? 0}</td>
                  <td>{cat.reservadas ?? 0}</td>
                  <td className={disp <= 0 ? 'pi-adtick-agotado' : undefined}>{disp}</td>
                  <td className="pi-adtick-precio-celda">{cat.precio > 0 ? `Bs. ${cat.precio}` : 'Gratis'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className="pi-adtick-btn-delete" onClick={() => eliminarCategoria(cat.id)} title="Eliminar categoría">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
                );
              })}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan="8" className="pi-adtick-empty">
                    Aún no hay categorías de ticket para este evento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {DialogoConfirmar}
    </div>
  );
}
