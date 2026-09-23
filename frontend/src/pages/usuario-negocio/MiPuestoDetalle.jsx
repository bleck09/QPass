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
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import Card from '../../components/Card.jsx';
import Insignia from '../../components/Insignia.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { enfocarPrimero, MIN_CONTRASENA } from '../../utils/validacion.js';
import { erroresAyudante } from '../../utils/ayudantes.js';
import {
  FaStore, FaBoxOpen, FaUsers, FaUserTie, FaHamburger,
  FaBan, FaCheckCircle, FaPen, FaLock, FaPlus, FaUnlink, FaSave, FaTimes, FaSearch, FaEnvelope,
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

const validarAyudante = (f) => erroresAyudante(f, 'pd-ay');

// Estado de stock (utils/stock.js) -> insignia de la celda de stock.
const INSIGNIA_STOCK = {
  bajo: { tono: 'warn', texto: 'Stock bajo' },
  sin_stock: { tono: 'danger', texto: 'Sin stock' },
};

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
  const avisos = useAvisos();

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
  // Alta de ayudante: error del servidor y errores por campo (tras el primer intento).
  const [crearErr, setCrearErr] = useState('');
  const [intentoCrear, setIntentoCrear] = useState(false);
  const [creando, setCreando] = useState(false);
  const erroresCrear = intentoCrear ? validarAyudante(formCrear) : {};

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
      avisos.exito(`${producto.nombre}: cambio guardado.`, { duracion: 2500 });
    } catch (e2) {
      avisos.error(e2.message, { titulo: `No se pudo guardar ${producto.nombre}` });
    }
  };

  const asignarAyudante = async (ayu) => {
    setAsignandoId(ayu.id);
    try {
      await api.puestoAyudantes.asignar({ puestoId, ayudanteId: ayu.id });
      await Promise.all([recargar(), recargarMisAyudantes()]);
      avisos.exito(`${ayu.nombre} ya puede vender en ${puesto.nombre}.`, { titulo: 'Ayudante asignado' });
    } catch (e2) {
      avisos.error(e2.message, { titulo: 'No se pudo asignar' });
    } finally { setAsignandoId(null); }
  };

  const quitarAyudante = async (asignacion) => {
    const ok = await confirmar({
      titulo: `¿Quitar a ${asignacion.ayudante.nombre} de este puesto?`,
      mensaje: 'Deja de poder vender en este puesto. Sigue en tu negocio y sus ventas no se tocan.',
      textoConfirmar: 'Quitar del puesto',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.puestoAyudantes.quitar(asignacion.id);
      await Promise.all([recargar(), recargarMisAyudantes()]);
      avisos.exito(`${asignacion.ayudante.nombre} ya no está en este puesto.`);
    } catch (e2) {
      avisos.error(e2.message, { titulo: 'No se pudo quitar' });
    }
  };

  const crearYAsignar = async (e) => {
    e.preventDefault();
    setCrearErr('');
    setIntentoCrear(true);
    const errs = validarAyudante(formCrear);
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['pd-ay-nombre', 'pd-ay-email', 'pd-ay-pass']);

    setCreando(true);
    try {
      const nuevo = await api.auth.registro({
        rol: ROLES.AYUDANTE,
        nombre: formCrear.nombre.trim(),
        email: formCrear.email.trim(),
        password: formCrear.password,
      });
      await api.puestoAyudantes.asignar({ puestoId, ayudanteId: nuevo.id });
      await Promise.all([recargar(), recargarMisAyudantes()]);
      setShowCrear(false);
      avisos.exito(`${formCrear.nombre.trim()} ya puede entrar con su correo y la contraseña temporal.`, { titulo: 'Ayudante creado y asignado' });
      setFormCrear(FORM_AYUDANTE);
    } catch (e2) {
      setCrearErr(e2.message);
    } finally {
      setCreando(false);
    }
  };

  const abrirCrear = () => { setFormCrear(FORM_AYUDANTE); setCrearErr(''); setIntentoCrear(false); setShowCrear(true); };

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

      <Pestanas
        className="pi-unegocio-pestanas"
        etiqueta="Secciones del puesto"
        activo={tab}
        onCambio={setTab}
        items={[
          { id: 'menu', etiqueta: `Menú (${puesto.productos.length})`, icono: FaBoxOpen },
          { id: 'equipo', etiqueta: `Equipo (${puesto.ayudantes.length})`, icono: FaUsers },
        ]}
      />

      {/* ================= MENÚ ================= */}
      {tab === 'menu' && (
        <>
          <div className="pi-unegocio-action-bar">
            <p className="texto-ayuda">
              El catálogo sale de <strong>Mi Catálogo</strong>. Acá ajustás precio, stock y disponibilidad
              solo para este evento.
            </p>
            <Boton
              variante={editandoMenu ? 'secundario' : 'primario'}
              icono={editandoMenu ? FaLock : FaPen}
              onClick={() => setEditandoMenu(v => !v)}
            >
              {editandoMenu ? 'Terminar edición' : 'Editar menú'}
            </Boton>
          </div>

          {editandoMenu && (
            <AvisoFijo tono="aviso" icono={FaPen} titulo="Modo edición">
              Los cambios de precio y stock se guardan al salir del campo. Precio vacío = usa el precio base.
            </AvisoFijo>
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

          {productosMenu.length === 0 ? (
            busqMenu.trim() || filtroMenu !== 'todos'
              ? <EstadoVacio compacto icono={FaSearch} titulo="Ningún producto coincide con el filtro" />
              : (
                <EstadoVacio
                  icono={FaHamburger}
                  titulo="Este puesto no tiene productos"
                  mensaje="Agregalos en Mi Catálogo y aparecen acá solos."
                  accion={<Boton variante="secundario" onClick={() => navigate(`/usuarionegocio/catalogo/${puesto.puestoBaseId}`)}>Ir a Mi Catálogo</Boton>}
                />
              )
          ) : (
            <Tabla
              card
              columnas={['Producto', 'Categoría', { texto: 'Precio evento', align: 'right' }, { texto: 'Stock', align: 'center' }, { texto: 'Estado', align: 'center' }]}
              datos={productosMenu}
              porPagina={10}
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
                      <span className="pi-unegocio-stock">
                        <span className="celda-secundaria">{producto.stock ?? 'libre'}</span>
                        {INSIGNIA_STOCK[estadoStockProducto(producto)] && (
                          <Insignia tono={INSIGNIA_STOCK[estadoStockProducto(producto)].tono}>
                            {INSIGNIA_STOCK[estadoStockProducto(producto)].texto}
                          </Insignia>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="td-centro">
                    {editandoMenu ? (
                      <Boton
                        variante={producto.activo === false ? 'peligro-suave' : 'secundario'}
                        tamano="sm"
                        pildora
                        icono={producto.activo === false ? FaBan : FaCheckCircle}
                        onClick={() => cambiarEstadoProducto(producto, { activo: producto.activo === false })}
                        title={producto.activo === false ? 'Marcar como disponible' : 'Marcar como agotado'}
                        aria-pressed={producto.activo !== false}
                      >
                        {producto.activo === false ? 'Agotado' : 'Activo'}
                      </Boton>
                    ) : producto.activo === false ? (
                      <Insignia tono="danger" icono={FaBan}>Agotado</Insignia>
                    ) : (
                      <Insignia tono="ok" icono={FaCheckCircle}>Activo</Insignia>
                    )}
                  </td>
                </tr>
              )}
            />
          )}
        </>
      )}

      {/* ================= EQUIPO ================= */}
      {tab === 'equipo' && (
        <>
          <div className="pi-unegocio-action-bar">
            <h2 className="pi-unegocio-subtitulo"><FaUsers aria-hidden="true" /> Ayudantes de este puesto</h2>
            <Boton
              variante={showAsignar ? 'secundario' : 'primario'}
              icono={showAsignar ? FaTimes : FaPlus}
              onClick={() => { setShowAsignar(v => !v); setBusqAsignar(''); }}
              aria-expanded={showAsignar}
            >
              {showAsignar ? 'Cerrar' : 'Asignar ayudante'}
            </Boton>
          </div>

          {showAsignar && (
            <Card className="pi-unegocio-asignar">
              <div className="pi-unegocio-action-bar">
                <Buscador
                  valor={busqAsignar}
                  onCambio={setBusqAsignar}
                  placeholder="Buscar ayudante de tu negocio…"
                  etiqueta="Buscar ayudante para asignar"
                />
                <Boton variante="secundario" tamano="sm" icono={FaPlus} onClick={abrirCrear}>Crear ayudante nuevo</Boton>
              </div>
              {disponiblesAsignar.length === 0 ? (
                busqAsignar.trim()
                  ? <EstadoVacio compacto icono={FaSearch} titulo="Ningún ayudante coincide" />
                  : <EstadoVacio compacto icono={FaUsers} titulo="Todos tus ayudantes ya están en este puesto" mensaje="Creá uno nuevo si necesitás más gente." />
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
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={FaPlus}
                        onClick={() => asignarAyudante(a)}
                        cargando={asignandoId === a.id}
                        disabled={asignandoId !== null && asignandoId !== a.id}
                      >
                        Asignar
                      </Boton>
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
            </Card>
          )}

          <div className="pi-unegocio-buscador">
            <Buscador
              valor={busqEquipo}
              onCambio={setBusqEquipo}
              placeholder="Buscar en el equipo…"
              etiqueta="Buscar ayudante del puesto"
            />
          </div>

          <Tabla
              card
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
                    <Boton variante="peligro-suave" tamano="sm" icono={FaUnlink} onClick={() => quitarAyudante(asignacion)}>Quitar</Boton>
                  </td>
                </tr>
              )}
            />

          <div className="pi-unegocio-pie">
            <Boton variante="secundario" tamano="sm" icono={FaUsers} onClick={() => navigate('/usuarionegocio/ayudantes')}>
              Gestionar todos en Mis Ayudantes
            </Boton>
          </div>
        </>
      )}

      {/* Alta rápida de ayudante (se asigna a este puesto al crearse) */}
      {showCrear && (
        <Modal
          titulo={<><FaUserTie aria-hidden="true" /> Nuevo ayudante para {puesto.nombre}</>}
          onCerrar={() => setShowCrear(false)}
        >
          <form onSubmit={crearYAsignar} className="formulario" noValidate>
            <Campo
              id="pd-ay-nombre" etiqueta="Nombre completo" icono={FaUserTie} autoComplete="name" placeholder="Ej: Juan Pérez"
              value={formCrear.nombre} onChange={(e) => setFormCrear(f => ({ ...f, nombre: e.target.value }))}
              error={erroresCrear['pd-ay-nombre']}
            />
            <Campo
              id="pd-ay-email" etiqueta="Correo electrónico" icono={FaEnvelope} type="email" autoComplete="email" placeholder="juan@email.com"
              value={formCrear.email} onChange={(e) => setFormCrear(f => ({ ...f, email: e.target.value }))}
              error={erroresCrear['pd-ay-email']}
            />
            <Campo
              id="pd-ay-pass" etiqueta="Contraseña temporal" contrasena autoComplete="new-password"
              placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`}
              ayuda="Se la das al ayudante; la puede cambiar después desde su perfil."
              value={formCrear.password} onChange={(e) => setFormCrear(f => ({ ...f, password: e.target.value }))}
              error={erroresCrear['pd-ay-pass']}
            />
            {crearErr && <AvisoFijo tono="error">{crearErr}</AvisoFijo>}
            <div className="modal-actions">
              <Boton variante="secundario" onClick={() => setShowCrear(false)} disabled={creando}>Cancelar</Boton>
              <Boton type="submit" icono={FaSave} cargando={creando}>Crear y asignar</Boton>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
