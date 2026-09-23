import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Tabla from '../../components/Tabla.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import SelectorEvento from '../../components/SelectorEvento.jsx';
import Card from '../../components/Card.jsx';
import Insignia from '../../components/Insignia.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import FiltroJornada from '../../components/FiltroJornada.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { opcionesJornada } from '../../utils/eventos.js';
import { useApi } from '../../utils/useApi.js';
import { limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarDay, FaTicketAlt, FaPlus, FaTrash, FaPen, FaTags, FaAlignLeft,
  FaBoxes, FaDollarSign, FaCoins, FaCheckCircle, FaHourglassHalf, FaCheck, FaTimes,
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
        <Campo
          id={inputId}
          icono={FaAlignLeft}
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          onKeyDown={keyDown}
          placeholder="Ej: Baño compartido — Enter para agregar"
        />
        <Boton variante="secundario" icono={FaPlus} onClick={agregar}>Agregar</Boton>
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

const FORM_VACIO = { nombre: '', beneficios: [], cantidad: '', precio: '', diaEventoId: '' };

// Misma validación para crear y para editar (los ids cambian: tk- / edit-tk-).
const validarCategoria = (f, pre, minCantidad = 1) => limpiarErrores({
  [`${pre}nombre`]: f.nombre.trim() ? null : 'Poné un nombre (VIP, General…).',
  [`${pre}cantidad`]: !String(f.cantidad).trim()
    ? 'Escribí cuántos tickets hay.'
    : !(Number(f.cantidad) >= minCantidad)
      ? `Tiene que ser ${minCantidad} o más (ya hay ${minCantidad} vendidas o reservadas).`
      : null,
  [`${pre}precio`]: String(f.precio).trim() === ''
    ? 'Escribí el precio (0 si es gratis).'
    : !(Number(f.precio) >= 0) ? 'El precio no puede ser negativo.' : null,
});

export default function AdminCrearTickets({ eventoId: eventoIdProp = null, embebido = false } = {}) {
  useTituloPagina('Categorías de ticket', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const avisos = useAvisos();
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
  const [formCategoria, setFormCategoria] = useState(FORM_VACIO);
  const [intento, setIntento] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');
  const errores = intento ? validarCategoria(formCategoria, 'tk-') : {};

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

  // Alta normal: sin confirmación (PLAN §2.4), con validación en línea,
  // cargando (antes se podía crear la misma categoría dos veces) y aviso.
  const agregarCategoria = async (e) => {
    e.preventDefault();
    setIntento(true);
    const errs = validarCategoria(formCategoria, 'tk-');
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['tk-nombre', 'tk-cantidad', 'tk-precio']);
    if (!diaSel) return setErrorCrear('Este evento todavía no tiene jornadas: creá una antes de cargar tickets.');
    setCreando(true);
    setErrorCrear('');
    try {
      const nuevaCategoria = await api.categoriasTicket.crear({
        eventoId,
        diaEventoId: diaSel,
        nombre: formCategoria.nombre.trim(),
        beneficios: formCategoria.beneficios,
        cantidad: Number(formCategoria.cantidad),
        precio: Number(formCategoria.precio),
      });
      setCategorias(prev => [...prev, nuevaCategoria]);
      setFormCategoria(f => ({ ...FORM_VACIO, diaEventoId: f.diaEventoId }));
      setIntento(false);
      avisos.exito(`La categoría "${nuevaCategoria.nombre}" quedó creada.`);
    } catch (err) {
      setErrorCrear(err?.message || 'No se pudo crear la categoría.');
    } finally {
      setCreando(false);
    }
  };

  const eliminarCategoria = async (cat) => {
    const colocadas = Number(cat.cantidadVendida ?? 0);
    const ok = await confirmar({
      titulo: `¿Eliminar la categoría "${cat.nombre}"?`,
      mensaje: colocadas > 0
        ? `Esta categoría ya tiene ${colocadas} ticket(s) vendidos o reservados. Si el sistema no deja borrarla, primero hay que anular esas entradas.`
        : 'Se eliminará esta categoría de ticket del evento.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.categoriasTicket.eliminar(cat.id);
      setCategorias(prev => prev.filter(c => c.id !== cat.id));
      avisos.exito(`La categoría "${cat.nombre}" se eliminó.`);
    } catch (err) {
      avisos.error(err?.message || 'No se pudo eliminar la categoría.', { titulo: 'No se pudo eliminar' });
    }
  };

  // --- Editar una categoría ya creada (típicamente: subirle el cupo) ---
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [formEdicion, setFormEdicion] = useState({ nombre: '', beneficios: [], cantidad: '', precio: '' });
  const [intentoEdicion, setIntentoEdicion] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');
  const minCupo = Number(categoriaEditando?.cantidadVendida ?? 0);
  const erroresEdicion = intentoEdicion ? validarCategoria(formEdicion, 'edit-tk-', minCupo || 1) : {};

  const abrirEditarCategoria = (cat) => {
    setCategoriaEditando(cat);
    setFormEdicion({
      nombre: cat.nombre,
      beneficios: cat.beneficios || [],
      cantidad: String(cat.cantidad),
      precio: String(cat.precio),
    });
    setIntentoEdicion(false);
    setErrorEdicion('');
  };

  const cerrarEdicion = () => setCategoriaEditando(null);

  const guardarEdicionCategoria = async (e) => {
    e.preventDefault();
    setIntentoEdicion(true);
    const errs = validarCategoria(formEdicion, 'edit-tk-', minCupo || 1);
    if (Object.keys(errs).length) {
      return enfocarPrimero(errs, ['edit-tk-nombre', 'edit-tk-cantidad', 'edit-tk-precio']);
    }
    setGuardandoEdicion(true);
    setErrorEdicion('');
    try {
      const actualizada = await api.categoriasTicket.actualizar(categoriaEditando.id, {
        nombre: formEdicion.nombre.trim(),
        beneficios: formEdicion.beneficios,
        cantidad: Number(formEdicion.cantidad),
        precio: Number(formEdicion.precio),
      });
      setCategorias(prev => prev.map(c => (c.id === actualizada.id ? { ...c, ...actualizada } : c)));
      avisos.exito(`Los cambios de "${actualizada.nombre}" quedaron guardados.`);
      cerrarEdicion();
    } catch (err) {
      setErrorEdicion(err?.message || 'No se pudieron guardar los cambios.');
    } finally {
      setGuardandoEdicion(false);
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
        <EncabezadoPagina
          titulo="Tickets del evento"
          subtitulo="Crea las categorías de ticket disponibles para cada evento: cantidad, beneficios y precio."
          icono={FaTicketAlt}
          acciones={
            <SelectorEvento
              id="tk-evento"
              eventos={eventosDisponibles}
              valor={eventoId}
              onCambio={setEventoId}
              bloqueado={eventoBloqueado}
              nombre={eventosDisponibles.find(ev => ev.id === eventoId)?.nombre}
            />
          }
        />
      )}

      {/* --- KPIs --- */}
      <div className="qp-stats">
        <StatCard icon={<FaTags />} tono="total" valor={totales.totalCategorias} label="Categorías creadas" />
        <StatCard icon={<FaTicketAlt />} tono="info" valor={totales.cupoTotal} label="Cupo total" />
        <StatCard icon={<FaCheckCircle />} tono="ok" valor={totales.vendidas} label="Vendidas (aprobadas)" />
        <StatCard icon={<FaHourglassHalf />} tono="warn" valor={totales.reservadas} label="Reservadas (por aprobar)" />
        <StatCard icon={<FaBoxes />} tono="total" valor={totales.disponibles} label="Disponibles" />
        <StatCard icon={<FaCoins />} tono="ok" valor={totales.ingresoPotencial} unidad="Bs." label="Ingreso potencial" />
      </div>

      {/* --- FORMULARIO: NUEVA CATEGORÍA --- */}
      <Card>
        <h3 className="pi-adtick-subtitulo">Añadir categoría de ticket</h3>
        <form onSubmit={agregarCategoria} noValidate>
          <div className="pi-adtick-form-grid">
            {jornadas.length > 1 && (
              <Campo id="tk-jornada" etiqueta="Jornada" icono={FaCalendarDay}>
                <div className="input-group__control">
                  <FaCalendarDay className="input-group__icono" aria-hidden="true" />
                  <select id="tk-jornada" name="diaEventoId" value={diaSel} onChange={handleChange}>
                    {jornadas.map((j, i) => (
                      <option key={j.id} value={j.id}>{nombreJornada(j, i)}</option>
                    ))}
                  </select>
                </div>
              </Campo>
            )}

            <Campo
              id="tk-nombre" etiqueta="Nombre de la categoría" icono={FaTags} name="nombre"
              value={formCategoria.nombre} onChange={handleChange} placeholder="Ej: VIP"
              error={errores['tk-nombre']}
            />
            <Campo
              id="tk-cantidad" etiqueta="Cantidad de tickets" icono={FaBoxes} type="number" min="1"
              inputMode="numeric" name="cantidad" value={formCategoria.cantidad} onChange={handleChange}
              placeholder="Ej: 200" error={errores['tk-cantidad']}
            />
            <Campo
              id="tk-precio" etiqueta="Precio (Bs.)" icono={FaDollarSign} type="number" min="0" step="0.50"
              inputMode="decimal" name="precio" value={formCategoria.precio} onChange={handleChange}
              placeholder="Ej: 150" ayuda="0 = entrada gratis." error={errores['tk-precio']}
            />

            <div className="input-group pi-adtick-input-descripcion">
              <label htmlFor="tk-beneficio">Beneficios (uno por línea)</label>
              <EditorBeneficios
                inputId="tk-beneficio"
                beneficios={formCategoria.beneficios}
                onCambiar={(lista) => setFormCategoria(f => ({ ...f, beneficios: lista }))}
              />
            </div>
          </div>

          {errorCrear && <AvisoFijo tono="error">{errorCrear}</AvisoFijo>}

          <div className="pi-adtick-form-actions">
            <Boton type="submit" icono={FaPlus} cargando={creando}>Crear categoría</Boton>
          </div>
        </form>
      </Card>

      {/* --- TABLA DE CATEGORÍAS --- */}
      <Card>
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
              { texto: 'Acción', srOnly: true },
            ]}
            datos={categoriasFiltradas}
            vacio={filtroJornada !== 'todas' ? 'Ninguna categoría en esta jornada.' : 'Aún no hay categorías de ticket para este evento.'}
            renderFila={cat => {
              const disp = cat.disponibles ?? (cat.cantidad - (cat.cantidadVendida || 0));
              return (
                <tr key={cat.id}>
                  <td><span className="fila-nombre">{cat.nombre}</span></td>
                  {jornadas.length > 1 && (
                    <td><span className="celda-secundaria">{cat.diaEvento?.nombre || `Día ${cat.diaEvento?.orden ?? '?'}`}</span></td>
                  )}
                  <td><span className="celda-secundaria">{cat.beneficios?.length ? cat.beneficios.join(' · ') : '—'}</span></td>
                  <td>{cat.cantidad}</td>
                  <td>{cat.vendidas ?? 0}</td>
                  <td>{cat.reservadas ?? 0}</td>
                  <td>{disp <= 0 ? <Insignia tono="danger">Agotado</Insignia> : disp}</td>
                  <td className="celda-normal">{cat.precio > 0 ? `Bs. ${cat.precio}` : 'Gratis'}</td>
                  <td className="td-derecha">
                    <div className="btn-acciones">
                      <Boton
                        variante="secundario" tamano="sm" icono={FaPen}
                        onClick={() => abrirEditarCategoria(cat)}
                        aria-label={`Editar la categoría ${cat.nombre}`}
                      />
                      <Boton
                        variante="peligro-suave" tamano="sm" icono={FaTrash}
                        onClick={() => eliminarCategoria(cat)}
                        aria-label={`Eliminar la categoría ${cat.nombre}`}
                      />
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Card>

      {categoriaEditando && (
        <Modal titulo={`Editar ${categoriaEditando.nombre}`} onCerrar={cerrarEdicion}>
          <form onSubmit={guardarEdicionCategoria} className="formulario" noValidate>
            <AvisoFijo tono="info">
              El cupo no se puede bajar de {minCupo} (ya vendidas/reservadas) — para achicarlo más,
              primero hay que anular esas entradas.
            </AvisoFijo>

            <Campo
              id="edit-tk-nombre" etiqueta="Nombre de la categoría" value={formEdicion.nombre}
              onChange={(e) => setFormEdicion(f => ({ ...f, nombre: e.target.value }))}
              error={erroresEdicion['edit-tk-nombre']}
            />

            <div className="form-inline">
              <Campo
                id="edit-tk-cantidad" etiqueta="Cantidad de tickets" className="flex-1"
                type="number" min={minCupo} value={formEdicion.cantidad}
                onChange={(e) => setFormEdicion(f => ({ ...f, cantidad: e.target.value }))}
                error={erroresEdicion['edit-tk-cantidad']}
              />
              <Campo
                id="edit-tk-precio" etiqueta="Precio (Bs.)" className="flex-1"
                type="number" min="0" step="0.50" value={formEdicion.precio}
                onChange={(e) => setFormEdicion(f => ({ ...f, precio: e.target.value }))}
                error={erroresEdicion['edit-tk-precio']}
              />
            </div>

            <div className="input-group">
              <label htmlFor="edit-tk-beneficio">Beneficios (uno por línea)</label>
              <EditorBeneficios
                inputId="edit-tk-beneficio"
                beneficios={formEdicion.beneficios}
                onCambiar={(lista) => setFormEdicion(f => ({ ...f, beneficios: lista }))}
              />
            </div>

            {errorEdicion && <AvisoFijo tono="error">{errorEdicion}</AvisoFijo>}

            <div className="modal-actions">
              <Boton variante="secundario" onClick={cerrarEdicion} disabled={guardandoEdicion}>Cancelar</Boton>
              <Boton type="submit" icono={FaCheck} cargando={guardandoEdicion}>Guardar cambios</Boton>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
