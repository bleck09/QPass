import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Tabla from '../../components/Tabla.jsx';
import FiltroJornada from '../../components/FiltroJornada.jsx';
import { opcionesJornada } from '../../utils/eventos.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaCalendarDay, FaTicketAlt, FaPlus, FaTrash, FaPen, FaTags, FaAlignLeft,
  FaBoxes, FaDollarSign, FaCoins, FaCheckCircle, FaHourglassHalf, FaCheck, FaTimes,
  FaInfoCircle, FaExclamationTriangle
} from 'react-icons/fa';
import BotonVolver from '../../components/BotonVolver.jsx';
import api from '../../api/index.js';
import './AdminCrearTickets.css';

// Lista de beneficios ("Baño compartido", "Acceso VIP"...) que se van
// agregando de a uno — compartido entre el formulario de Crear y el modal de
// Editar, para no repetir la misma UI (input + Enter/"Agregar" + chips con
// tachar) dos veces.
function EditorBeneficios({ beneficios, onCambiar, inputId }) {
  const [actual, setActual] = useState('');

  const agregar = () => {
    const texto = actual.trim();
    if (!texto) return;
    onCambiar([...beneficios, texto]);
    setActual('');
  };

  const quitar = (indice) => onCambiar(beneficios.filter((_, i) => i !== indice));

  // Enter agrega el beneficio a la lista en vez de mandar el formulario entero.
  const keyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    agregar();
  };

  return (
    <>
      <div className="pi-adtick-beneficio-agregar">
        <div className="pi-adtick-input-wrapper">
          <FaAlignLeft className="pi-adtick-input-icon" />
          <input
            type="text"
            id={inputId}
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            onKeyDown={keyDown}
            placeholder="Ej: Baño compartido — Enter para agregar"
          />
        </div>
        <button type="button" className="pi-adtick-btn-agregar-beneficio" onClick={agregar}>
          <FaPlus /> Agregar
        </button>
      </div>
      {beneficios.length > 0 && (
        <ul className="pi-adtick-beneficios-lista">
          {beneficios.map((beneficio, indice) => (
            <li key={indice}>
              <FaCheck className="pi-adtick-beneficio-check" aria-hidden="true" />
              <span>{beneficio}</span>
              <button type="button" onClick={() => quitar(indice)} aria-label={`Quitar "${beneficio}"`}>
                <FaTimes />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

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

  // Jornadas del evento: toda categoría pertenece a una.
  const cargarJornadas = useCallback(() => api.diasEvento.listar(eventoId), [eventoId]);
  const { data: jornadas } = useApi(cargarJornadas, { inicial: [], activo: !!eventoId });

  // beneficios: lista de líneas ("Baño compartido", "Acceso VIP"...) que se
  // muestran como bullets en el card de la landing — en vez de una sola
  // descripción larga (se veía todo en un solo bloque).
  const [formCategoria, setFormCategoria] = useState({ nombre: '', beneficios: [], cantidad: '', precio: '', diaEventoId: '' });

  const nombreJornada = (j, i) => j?.nombre || `Día ${j?.orden ?? i + 1}`;
  // Jornada efectiva: la elegida a mano, o la primera por defecto (sin efecto).
  const diaSel =
    (jornadas.some(j => j.id === formCategoria.diaEventoId) && formCategoria.diaEventoId) ||
    jornadas[0]?.id ||
    '';

  useEffect(() => {
    if (embebido) return;
    api.eventos.listarTodos().then(lista => {
      setEventosDisponibles(lista);
      setEventoId(prev => prev || lista[0]?.id);
    });
  }, [embebido]);

  // Filtro por jornada de la tabla de abajo (pastillas con ≤5 jornadas, o un
  // combobox buscable si son más — mismo componente que ya usan Supervisor y
  // GestionEntrega, no uno nuevo). Los KPIs de arriba siguen sumando TODAS
  // las categorías del evento, sin filtrar.
  const [filtroJornada, setFiltroJornada] = useState('todas');
  const filtrosJornada = useMemo(() => opcionesJornada(categorias), [categorias]);
  const categoriasFiltradas = useMemo(
    () => filtroJornada === 'todas' ? categorias : categorias.filter(c => c.diaEventoId === filtroJornada),
    [categorias, filtroJornada],
  );

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
    if (!formCategoria.nombre || !formCategoria.cantidad || formCategoria.precio === '' || !diaSel) return;

    const nuevaCategoria = await api.categoriasTicket.crear({
      eventoId,
      diaEventoId: diaSel,
      nombre: formCategoria.nombre,
      beneficios: formCategoria.beneficios,
      cantidad: Number(formCategoria.cantidad),
      precio: Number(formCategoria.precio),
    });

    setCategorias(prev => [...prev, nuevaCategoria]);
    setFormCategoria(f => ({ nombre: '', beneficios: [], cantidad: '', precio: '', diaEventoId: f.diaEventoId }));
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

  // --- Editar una categoría ya creada (típicamente: subirle el cupo) ---
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [formEdicion, setFormEdicion] = useState({ nombre: '', beneficios: [], cantidad: '', precio: '' });
  const [errorEdicion, setErrorEdicion] = useState('');

  const abrirEditarCategoria = (cat) => {
    setCategoriaEditando(cat);
    setFormEdicion({
      nombre: cat.nombre,
      beneficios: cat.beneficios || [],
      cantidad: String(cat.cantidad),
      precio: String(cat.precio),
    });
    setErrorEdicion('');
  };

  const cerrarEdicion = () => setCategoriaEditando(null);

  const guardarEdicionCategoria = async (e) => {
    e.preventDefault();
    setErrorEdicion('');
    try {
      const actualizada = await api.categoriasTicket.actualizar(categoriaEditando.id, {
        nombre: formEdicion.nombre,
        beneficios: formEdicion.beneficios,
        cantidad: Number(formEdicion.cantidad),
        precio: Number(formEdicion.precio),
      });
      setCategorias(prev => prev.map(c => (c.id === actualizada.id ? { ...c, ...actualizada } : c)));
      cerrarEdicion();
    } catch (err) {
      setErrorEdicion(err.message);
    }
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
        <StatCard icon={<FaTags />} tono="total" valor={totales.totalCategorias} label="Categorías creadas" />
        <StatCard icon={<FaTicketAlt />} tono="info" valor={totales.cupoTotal} label="Cupo total" />
        <StatCard icon={<FaCheckCircle />} tono="ok" valor={totales.vendidas} label="Vendidas (aprobadas)" />
        <StatCard icon={<FaHourglassHalf />} tono="warn" valor={totales.reservadas} label="Reservadas (por aprobar)" />
        <StatCard icon={<FaBoxes />} tono="total" valor={totales.disponibles} label="Disponibles" />
        <StatCard icon={<FaCoins />} tono="ok" valor={`Bs. ${totales.ingresoPotencial}`} label="Ingreso potencial" />
      </div>

      {/* --- FORMULARIO: NUEVA CATEGORÍA --- */}
      <div className="pi-adtick-card">
        <h3 className="pi-adtick-subtitulo">Añadir Categoría de Ticket</h3>
        <form onSubmit={agregarCategoria} className="pi-adtick-form">
          <div className="pi-adtick-form-grid">
            {jornadas.length > 1 && (
              <div className="pi-adtick-input-group">
                <label htmlFor="tk-jornada">Jornada</label>
                <div className="pi-adtick-input-wrapper">
                  <FaCalendarDay className="pi-adtick-input-icon" />
                  <select
                    id="tk-jornada"
                    name="diaEventoId"
                    value={diaSel}
                    onChange={handleChange}
                    required
                  >
                    {jornadas.map((j, i) => (
                      <option key={j.id} value={j.id}>{nombreJornada(j, i)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
              <label htmlFor="tk-beneficio">Beneficios (uno por línea)</label>
              <EditorBeneficios
                inputId="tk-beneficio"
                beneficios={formCategoria.beneficios}
                onCambiar={(lista) => setFormCategoria(f => ({ ...f, beneficios: lista }))}
              />
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
        <div className="pi-adtick-tabla-header">
          <h3 className="pi-adtick-subtitulo">Categorías creadas para este evento</h3>
          {filtrosJornada.length > 0 && (
            <FiltroJornada
              opciones={filtrosJornada}
              activo={filtroJornada}
              onCambio={setFiltroJornada}
              etiqueta="Filtrar categorías por jornada"
            />
          )}
        </div>
        {errorCategorias ? (
          <EstadoError onReintentar={recargarCategorias} />
        ) : cargandoCategorias ? (
          <EstadoCarga filas={4} />
        ) : (
        <Tabla
          columnas={[
            'Categoría',
            ...(jornadas.length > 1 ? ['Jornada'] : []),
            'Beneficios', 'Cupo', 'Vendidas', 'Reservadas', 'Disponibles', 'Precio',
            { texto: 'Acción', align: 'center' },
          ]}
          datos={categoriasFiltradas}
          vacio={filtroJornada !== 'todas' ? 'Ninguna categoría en esta jornada.' : 'Aún no hay categorías de ticket para este evento.'}
          renderFila={cat => {
            const disp = cat.disponibles ?? (cat.cantidad - (cat.cantidadVendida || 0));
            return (
              <tr key={cat.id}>
                <td><span className="pi-adtick-badge-nombre">{cat.nombre}</span></td>
                {jornadas.length > 1 && (
                  <td><span className="celda-secundaria">{cat.diaEvento?.nombre || `Día ${cat.diaEvento?.orden ?? '?'}`}</span></td>
                )}
                <td><span className="celda-secundaria">{cat.beneficios?.length ? cat.beneficios.join(' · ') : '—'}</span></td>
                <td>{cat.cantidad}</td>
                <td>{cat.vendidas ?? 0}</td>
                <td>{cat.reservadas ?? 0}</td>
                <td className={disp <= 0 ? 'pi-adtick-agotado' : undefined}>{disp}</td>
                <td className="pi-adtick-precio-celda">{cat.precio > 0 ? `Bs. ${cat.precio}` : 'Gratis'}</td>
                <td style={{ textAlign: 'center' }}>
                  <button type="button" className="pi-adtick-btn-editar-cat" onClick={() => abrirEditarCategoria(cat)} title="Editar categoría">
                    <FaPen />
                  </button>
                  <button type="button" className="pi-adtick-btn-delete" onClick={() => eliminarCategoria(cat.id)} title="Eliminar categoría">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            );
          }}
        />
        )}
      </div>

      {categoriaEditando && (
        <Modal
          titulo={<><FaPen color="var(--indigo-profundo)" aria-hidden="true" /> Editar {categoriaEditando.nombre}</>}
          onCerrar={cerrarEdicion}
        >
          <form onSubmit={guardarEdicionCategoria} className="formulario">
            <p className="info-text">
              <FaInfoCircle aria-hidden="true" /> El cupo no se puede bajar de {categoriaEditando.cantidadVendida ?? 0}
              {' '}(ya vendidas/reservadas) — para achicarlo más, primero hay que anular esas entradas.
            </p>

            <div className="input-group">
              <label htmlFor="edit-tk-nombre">Nombre de la categoría</label>
              <input
                id="edit-tk-nombre" type="text" value={formEdicion.nombre}
                onChange={(e) => setFormEdicion(f => ({ ...f, nombre: e.target.value }))}
                required
              />
            </div>

            <div className="form-inline">
              <div className="input-group flex-1">
                <label htmlFor="edit-tk-cantidad">Cantidad de tickets</label>
                <input
                  id="edit-tk-cantidad" type="number" min={categoriaEditando.cantidadVendida ?? 0}
                  value={formEdicion.cantidad}
                  onChange={(e) => setFormEdicion(f => ({ ...f, cantidad: e.target.value }))}
                  required
                />
              </div>
              <div className="input-group flex-1">
                <label htmlFor="edit-tk-precio">Precio (Bs.)</label>
                <input
                  id="edit-tk-precio" type="number" min="0" step="0.50"
                  value={formEdicion.precio}
                  onChange={(e) => setFormEdicion(f => ({ ...f, precio: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="edit-tk-beneficio">Beneficios (uno por línea)</label>
              <EditorBeneficios
                inputId="edit-tk-beneficio"
                beneficios={formEdicion.beneficios}
                onCambiar={(lista) => setFormEdicion(f => ({ ...f, beneficios: lista }))}
              />
            </div>

            {errorEdicion && (
              <p className="pi-jor-error"><FaExclamationTriangle aria-hidden="true" /> {errorEdicion}</p>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-cancelar" onClick={cerrarEdicion}>Cancelar</button>
              <button type="submit" className="btn-primario"><FaCheck /> Guardar cambios</button>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
