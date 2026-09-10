import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import Paginador from '../../components/Paginador.jsx';
import Modal from '../../components/Modal.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { usePaginacion } from '../../utils/usePaginacion.js';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { estadoStockProducto } from '../../utils/stock.js';
import { ROLES } from '../../constants/roles.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaBoxOpen, FaUsers, FaUserTie, FaHamburger,
  FaBan, FaCheckCircle, FaPen, FaLock, FaPlus, FaUnlink, FaSave, FaTimes,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import './UsuarioNegocio.css';

const FILTROS_MENU = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'disponibles', texto: 'Disponibles' },
  { valor: 'bajo', texto: 'Stock bajo' },
  { valor: 'sin_stock', texto: 'Sin stock' },
];
const FORM_AYUDANTE = { nombre: '', email: '', password: '' };

/**
 * Detalle de un puesto DENTRO de un evento: su menú para ese evento
 * (precio / stock / disponibilidad) y su equipo de ayudantes — con buscador,
 * filtros y alta de ayudantes ahí mismo. Es su propia página (no un modal).
 */
export default function MiPuestoDetalle() {
  const { eventoId, puestoId } = useParams();
  const navigate = useNavigate();
  const sesion = leerSesion();
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const cargar = useCallback(
    () => api.puestos.listar({ eventoId, negocioId: sesion.id }),
    [eventoId, sesion.id],
  );
  const { data: puestos, setData: setPuestos, cargando, error, recargar } = useApi(cargar, { inicial: [] });

  const cargarMisAyudantes = useCallback(() => api.puestoAyudantes.misAyudantes(), []);
  const { data: misAyudantes, recargar: recargarMisAyudantes } = useApi(cargarMisAyudantes, { inicial: [] });

  const puesto = puestos.find(p => p.id === puestoId) || null;
  useTituloPagina(puesto ? `Puesto · ${puesto.nombre}` : 'Puesto');

  const [tab, setTab] = useState('menu'); // menu | equipo
  const [editandoMenu, setEditandoMenu] = useState(false);
  const [err, setErr] = useState('');

  // Menú: buscador + filtro por estado de stock.
  const [busqMenu, setBusqMenu] = useState('');
  const [filtroMenu, setFiltroMenu] = useState('todos');

  // Equipo: buscador + panel de asignar + alta rápida.
  const [busqEquipo, setBusqEquipo] = useState('');
  const [showAsignar, setShowAsignar] = useState(false);
  const [busqAsignar, setBusqAsignar] = useState('');
  const [asignandoId, setAsignandoId] = useState(null);
  const [showCrear, setShowCrear] = useState(false);
  const [formCrear, setFormCrear] = useState(FORM_AYUDANTE);
  const [crearErr, setCrearErr] = useState('');

  const volver = () => navigate(`/usuarionegocio?evento=${eventoId}`);
  const migas = [
    { texto: 'Panel de negocio', onClick: volver },
    { texto: puesto?.nombre || 'Puesto', actual: true },
  ];

  const productosMenu = useMemo(() => {
    const lista = puesto?.productos || [];
    const q = busqMenu.trim().toLowerCase();
    return lista.filter(p => {
      const e = estadoStockProducto(p);
      const okFiltro =
        filtroMenu === 'todos' ||
        (filtroMenu === 'disponibles' && e === 'ok') ||
        (filtroMenu === 'bajo' && e === 'bajo') ||
        (filtroMenu === 'sin_stock' && (e === 'sin_stock' || e === 'inactivo'));
      const okBusq = !q || p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q);
      return okFiltro && okBusq;
    });
  }, [puesto, busqMenu, filtroMenu]);

  const equipoFiltrado = useMemo(() => {
    const q = busqEquipo.trim().toLowerCase();
    const lista = puesto?.ayudantes || [];
    if (!q) return lista;
    return lista.filter(a => `${a.ayudante.nombre} ${a.ayudante.email}`.toLowerCase().includes(q));
  }, [puesto, busqEquipo]);

  const disponiblesAsignar = useMemo(() => {
    const yaEstan = new Set((puesto?.ayudantes || []).map(a => a.ayudante.id));
    const q = busqAsignar.trim().toLowerCase();
    return (misAyudantes || [])
      .filter(a => !yaEstan.has(a.id))
      .filter(a => !q || `${a.nombre} ${a.email}`.toLowerCase().includes(q));
  }, [misAyudantes, puesto, busqAsignar]);
  const asignarPag = usePaginacion(disponiblesAsignar, 8);

  // `cambios`: activo? / stock? / precio? (null = sin override para ese evento).
  const cambiarEstadoProducto = async (producto, cambios) => {
    if (!puesto) return;
    setErr('');
    try {
      await api.productos.actualizarEstado({
        puestoId: puesto.id,
        productoBaseId: producto.id,
        ...cambios,
      });
      const local = { ...cambios };
      if ('precio' in cambios) {
        local.precioSobrescrito = cambios.precio != null;
        if (cambios.precio == null) local.precio = producto.precioBase;
      }
      setPuestos(prev => prev.map(p => p.id === puesto.id
        ? { ...p, productos: p.productos.map(pr => pr.id === producto.id ? { ...pr, ...local } : pr) }
        : p));
    } catch (e2) { setErr(e2.message); }
  };

  const asignarAyudante = async (ayu) => {
    setErr('');
    setAsignandoId(ayu.id);
    try {
      await api.puestoAyudantes.asignar({ puestoId, ayudanteId: ayu.id });
      await Promise.all([recargar(), recargarMisAyudantes()]);
    } catch (e2) { setErr(e2.message); }
    finally { setAsignandoId(null); }
  };

  const quitarAyudante = async (asignacion) => {
    const ok = await confirmar({
      titulo: `¿Quitar a ${asignacion.ayudante.nombre} de este puesto?`,
      mensaje: 'Deja de poder vender en este puesto. Sigue en tu negocio y sus ventas no se tocan.',
      textoConfirmar: 'Quitar del puesto',
      peligroso: true,
    });
    if (!ok) return;
    setErr('');
    try {
      await api.puestoAyudantes.quitar(asignacion.id);
      await Promise.all([recargar(), recargarMisAyudantes()]);
    } catch (e2) { setErr(e2.message); }
  };

  const crearYAsignar = async (e) => {
    e.preventDefault();
    setCrearErr('');
    try {
      const nuevo = await api.auth.registro({
        rol: ROLES.AYUDANTE,
        nombre: formCrear.nombre,
        email: formCrear.email,
        password: formCrear.password,
      });
      await api.puestoAyudantes.asignar({ puestoId, ayudanteId: nuevo.id });
      await Promise.all([recargar(), recargarMisAyudantes()]);
      setShowCrear(false);
      setFormCrear(FORM_AYUDANTE);
    } catch (e2) { setCrearErr(e2.message); }
  };

  const cabecera = (
    <div className="qp-nav">
      <BotonVolver onClick={volver}>Volver a Mis Puestos</BotonVolver>
      <Migas items={migas} />
    </div>
  );

  if (error) {
    return <div className="pi-unegocio-container">{cabecera}<EstadoError onReintentar={recargar} /></div>;
  }
  if (cargando || !puesto) {
    return <div className="pi-unegocio-container">{cabecera}<EstadoCarga filas={4} /></div>;
  }

  return (
    <div className="pi-unegocio-container">
      {cabecera}

      <div className="pi-unegocio-header-wrapper">
        <div className="pi-unegocio-header">
          <div className="item-info">
            {puesto.logo
              ? <img width="56" height="56" src={puesto.logo} alt="" className="item-img" />
              : <div className="item-no-img"><FaStore /></div>}
            <div>
              <h1>{puesto.nombre}</h1>
              {puesto.descripcion && <p>{puesto.descripcion}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="pi-unegocio-tabs">
        <button type="button" className={tab === 'menu' ? 'activo' : ''} aria-current={tab === 'menu' ? 'page' : undefined} onClick={() => setTab('menu')}>
          <FaBoxOpen aria-hidden="true" /> Menú ({puesto.productos.length})
        </button>
        <button type="button" className={tab === 'equipo' ? 'activo' : ''} aria-current={tab === 'equipo' ? 'page' : undefined} onClick={() => setTab('equipo')}>
          <FaUsers aria-hidden="true" /> Equipo ({puesto.ayudantes.length})
        </button>
      </div>

      {err && <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>}

      {/* ================= MENÚ ================= */}
      {tab === 'menu' && (
        <>
          <div className="pi-unegocio-action-bar">
            <p className="pi-unegocio-nota">
              El catálogo sale de <strong>Mi Catálogo</strong>. Acá ajustás precio, stock y disponibilidad
              solo para este evento.
            </p>
            <button
              type="button"
              className={editandoMenu ? 'btn-cancelar' : 'btn-primario'}
              onClick={() => setEditandoMenu(v => !v)}
            >
              {editandoMenu ? <><FaLock aria-hidden="true" /> Terminar edición</> : <><FaPen aria-hidden="true" /> Editar menú</>}
            </button>
          </div>

          {editandoMenu && (
            <p className="pi-unegocio-nota pi-unegocio-nota--aviso">
              Modo edición: los cambios de precio / stock se guardan al salir del campo. Precio vacío = usa el precio base.
            </p>
          )}

          <div className="pi-unegocio-buscador">
            <Buscador
              valor={busqMenu}
              onCambio={setBusqMenu}
              placeholder="Buscar producto…"
              etiqueta="Buscar producto"
              filtros={FILTROS_MENU}
              filtroActivo={filtroMenu}
              onFiltro={setFiltroMenu}
              etiquetaFiltros="Filtrar productos por stock"
            />
          </div>

          <div className="pi-unegocio-card">
            <Tabla
              columnas={['Producto', 'Categoría', { texto: 'Precio evento', align: 'right' }, { texto: 'Stock', align: 'center' }, { texto: 'Estado', align: 'center' }]}
              datos={productosMenu}
              porPagina={10}
              vacio={busqMenu.trim() || filtroMenu !== 'todos'
                ? 'Ningún producto coincide con el filtro.'
                : 'Este puesto base no tiene productos. Agregalos en Mi Catálogo.'}
              renderFila={producto => (
                <tr key={producto.id} className={producto.activo === false ? 'pi-unegocio-prod-inactivo' : ''}>
                  <td>
                    <div className="item-info">
                      {producto.imagen
                        ? <img width="48" height="48" src={producto.imagen} alt="" className="item-img img-cuadrada" />
                        : <div className="item-no-img img-cuadrada"><FaHamburger /></div>}
                      <span className="fila-nombre">{producto.nombre}</span>
                    </div>
                  </td>
                  <td>{producto.categoria || '—'}</td>
                  <td className="td-derecha">
                    {editandoMenu ? (
                      <span className="pi-unegocio-num-edit">
                        <span className="pi-unegocio-num-prefijo">Bs.</span>
                        <input
                          type="number" min="0" step="0.50"
                          className="pi-unegocio-num-input"
                          placeholder={Number(producto.precioBase).toFixed(2)}
                          defaultValue={producto.precioSobrescrito ? Number(producto.precio) : ''}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const nuevo = raw === '' ? null : Number(raw);
                            if (raw !== '' && Number.isNaN(nuevo)) return;
                            const actual = producto.precioSobrescrito ? Number(producto.precio) : null;
                            if (nuevo !== actual) cambiarEstadoProducto(producto, { precio: nuevo });
                          }}
                        />
                      </span>
                    ) : (
                      <span className="fila-nombre">
                        Bs. {Number(producto.precioSobrescrito ? producto.precio : producto.precioBase).toFixed(2)}
                        {!producto.precioSobrescrito && <span className="celda-secundaria"> · base</span>}
                      </span>
                    )}
                  </td>
                  <td className="td-centro">
                    {editandoMenu ? (
                      <input
                        type="number" min="0" step="1"
                        className="pi-unegocio-num-input"
                        placeholder="libre"
                        defaultValue={producto.stock ?? ''}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const n = raw === '' ? null : Number(raw);
                          if (raw !== '' && Number.isNaN(n)) return;
                          if (n !== (producto.stock ?? null)) cambiarEstadoProducto(producto, { stock: n });
                        }}
                      />
                    ) : (
                      <span className="celda-secundaria">{producto.stock ?? 'libre'}</span>
                    )}
                  </td>
                  <td className="td-centro">
                    {editandoMenu ? (
                      <button
                        type="button"
                        className={producto.activo === false ? 'pi-unegocio-toggle inactivo' : 'pi-unegocio-toggle activo'}
                        onClick={() => cambiarEstadoProducto(producto, { activo: producto.activo === false })}
                        title={producto.activo === false ? 'Marcar como disponible' : 'Marcar como agotado'}
                      >
                        {producto.activo === false ? <><FaBan /> Agotado</> : <><FaCheckCircle /> Activo</>}
                      </button>
                    ) : (
                      <span className={producto.activo === false ? 'pi-unegocio-toggle inactivo' : 'pi-unegocio-toggle activo'}>
                        {producto.activo === false ? <><FaBan /> Agotado</> : <><FaCheckCircle /> Activo</>}
                      </span>
                    )}
                  </td>
                </tr>
              )}
            />
          </div>
        </>
      )}

      {/* ================= EQUIPO ================= */}
      {tab === 'equipo' && (
        <>
          <div className="pi-unegocio-action-bar">
            <h2 className="pi-unegocio-subtitulo"><FaUsers aria-hidden="true" /> Ayudantes de este puesto</h2>
            <button
              type="button"
              className={showAsignar ? 'btn-cancelar' : 'btn-primario'}
              onClick={() => { setShowAsignar(v => !v); setBusqAsignar(''); }}
            >
              {showAsignar ? <><FaTimes aria-hidden="true" /> Cerrar</> : <><FaPlus aria-hidden="true" /> Asignar ayudante</>}
            </button>
          </div>

          {showAsignar && (
            <div className="pi-unegocio-card pi-unegocio-asignar">
              <div className="pi-unegocio-action-bar">
                <Buscador
                  valor={busqAsignar}
                  onCambio={setBusqAsignar}
                  placeholder="Buscar ayudante de tu negocio…"
                  etiqueta="Buscar ayudante para asignar"
                />
                <button type="button" className="btn-secundario-sm" onClick={() => { setFormCrear(FORM_AYUDANTE); setCrearErr(''); setShowCrear(true); }}>
                  <FaPlus aria-hidden="true" /> Crear ayudante nuevo
                </button>
              </div>
              {disponiblesAsignar.length === 0 ? (
                <p className="tabla-vacia">
                  {busqAsignar.trim() ? 'Ningún ayudante coincide.' : 'Todos tus ayudantes ya están en este puesto. Creá uno nuevo.'}
                </p>
              ) : (
                <>
                <ul className="pi-unegocio-asignar-lista">
                  {asignarPag.slice.map(a => (
                    <li key={a.id}>
                      <div className="item-info">
                        {a.foto
                          ? <img width="40" height="40" src={a.foto} alt="" className="item-img item-img--avatar" />
                          : <div className="item-no-img item-img--avatar"><FaUserTie /></div>}
                        <div>
                          <div className="fila-nombre">{a.nombre}</div>
                          <div className="celda-secundaria">{a.email}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-secundario-sm"
                        onClick={() => asignarAyudante(a)}
                        disabled={asignandoId === a.id}
                      >
                        <FaPlus aria-hidden="true" /> {asignandoId === a.id ? 'Asignando…' : 'Asignar'}
                      </button>
                    </li>
                  ))}
                </ul>
                <Paginador
                  pagina={asignarPag.paginaActual}
                  totalPaginas={asignarPag.totalPaginas}
                  onCambio={asignarPag.setPagina}
                  total={asignarPag.total}
                  unidad="ayudantes"
                />
                </>
              )}
            </div>
          )}

          <div className="pi-unegocio-buscador">
            <Buscador
              valor={busqEquipo}
              onCambio={setBusqEquipo}
              placeholder="Buscar en el equipo…"
              etiqueta="Buscar ayudante del puesto"
            />
          </div>

          <div className="pi-unegocio-card">
            <Tabla
              columnas={['Ayudante', 'Correo', { texto: 'Acciones', align: 'center' }]}
              datos={equipoFiltrado}
              porPagina={10}
              vacio={busqEquipo.trim()
                ? 'Ningún ayudante coincide con la búsqueda.'
                : 'Aún no hay ayudantes en este puesto. Usá “Asignar ayudante”.'}
              renderFila={asignacion => (
                <tr key={asignacion.id}>
                  <td>
                    <div className="item-info">
                      {asignacion.ayudante.foto
                        ? <img width="48" height="48" src={asignacion.ayudante.foto} alt="" className="item-img item-img--avatar" />
                        : <div className="item-no-img item-img--avatar"><FaUserTie /></div>}
                      <div className="fila-nombre">{asignacion.ayudante.nombre}</div>
                    </div>
                  </td>
                  <td><span className="celda-secundaria">{asignacion.ayudante.email}</span></td>
                  <td className="td-centro">
                    <button type="button" className="btn-secundario-sm btn-secundario-sm--peligro" onClick={() => quitarAyudante(asignacion)}>
                      <FaUnlink aria-hidden="true" /> Quitar
                    </button>
                  </td>
                </tr>
              )}
            />
          </div>

          <div className="modal-actions modal-actions--gap-top">
            <button type="button" className="btn-secundario-sm" onClick={() => navigate('/usuarionegocio/ayudantes')}>
              <FaUsers aria-hidden="true" /> Gestionar todos en Mis Ayudantes
            </button>
          </div>
        </>
      )}

      {/* Alta rápida de ayudante (se asigna a este puesto al crearse) */}
      {showCrear && (
        <Modal
          titulo={<><FaUserTie color="var(--indigo-profundo)" aria-hidden="true" /> Nuevo ayudante para {puesto.nombre}</>}
          onCerrar={() => setShowCrear(false)}
        >
          <form onSubmit={crearYAsignar} className="formulario">
            <div className="input-group">
              <label htmlFor="pd-ay-nombre">Nombre completo</label>
              <input id="pd-ay-nombre" type="text" autoComplete="name" value={formCrear.nombre}
                onChange={(e) => setFormCrear(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Juan Pérez" required />
            </div>
            <div className="input-group">
              <label htmlFor="pd-ay-email">Correo electrónico</label>
              <input id="pd-ay-email" type="email" autoComplete="email" value={formCrear.email}
                onChange={(e) => setFormCrear(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" required />
            </div>
            <div className="input-group">
              <label htmlFor="pd-ay-pass">Contraseña temporal</label>
              <input id="pd-ay-pass" type="text" autoComplete="new-password" value={formCrear.password}
                onChange={(e) => setFormCrear(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
            {crearErr && <p className="pi-unegocio-nota pi-unegocio-nota--error">{crearErr}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-cancelar" onClick={() => setShowCrear(false)}>Cancelar</button>
              <button type="submit" className="btn-primario"><FaSave /> Crear y asignar</button>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
