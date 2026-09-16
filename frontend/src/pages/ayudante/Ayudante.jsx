import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useModal } from '../../utils/useModal.js';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import { useApi } from '../../utils/useApi.js';
import FotoZoom from '../../components/FotoZoom.jsx';
import { estadoEvento, imagenEvento, formatearFecha, nombreJornada, mostrarJornada, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import { estadoStockProducto } from '../../utils/stock.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaShoppingCart, FaPlus, FaMinus, FaTrash, FaQrcode, FaTimes,
  FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle, FaHistory,
  FaReceipt, FaHamburger, FaMapMarkerAlt, FaCalendarAlt, FaBell,
  FaTicketAlt, FaMoon, FaHashtag
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import './Ayudante.css';
import '../supervisor/GestionEntrega.css';

export default function Ayudante() {
  useTituloPagina('Vender y cobrar');
  const sesion = leerSesion();

  // Carga primaria (puestos donde trabaja el ayudante) con cargando/error/reintentar (Manual 8.9).
  const cargarPuestos = useCallback(
    () => api.puestoAyudantes.listar({ ayudanteId: sesion.id }).then(lista => lista.map(a => a.puesto)),
    [sesion.id],
  );
  const {
    data: puestosAsignados,
    cargando: cargandoPuestos,
    error: errorPuestos,
    recargar: recargarPuestos,
  } = useApi(cargarPuestos, { inicial: [] });

  const [productos, setProductos] = useState([]);
  const [avisadosStock, setAvisadosStock] = useState(new Set()); // productoIds ya avisados
  const [avisandoStock, setAvisandoStock] = useState(null);
  const [avisoCantidad, setAvisoCantidad] = useState(null); // { id, texto } — "solo quedan N"
  const [errorCobro, setErrorCobro] = useState('');

  const [pestana, setPestana] = useState('vender'); // vender | historial
  const [carrito, setCarrito] = useState([]);

  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [ventas, setVentas] = useState([]);

  // --- Selección en dos pasos guardada en la URL (?evento=&puesto=): así el
  //     botón Atrás del navegador retrocede paso a paso (venta -> puestos ->
  //     eventos) en vez de sacar al ayudante de la página como si cerrara sesión.
  //     · 1 evento asignado          -> se salta el paso 1.
  //     · 1 puesto en el evento      -> se salta el paso 2 y entra directo a vender.
  const [searchParams, setSearchParams] = useSearchParams();
  const eventoSelId = searchParams.get('evento') || null;
  const puestoSelId = searchParams.get('puesto') || null;
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const navSeleccion = useCallback((patch, { replace = false } = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [clave, valor] of Object.entries(patch)) {
        if (valor == null) next.delete(clave);
        else next.set(clave, String(valor));
      }
      return next;
    }, { replace });
  }, [setSearchParams]);

  // Puestos del ayudante agrupados por evento (un evento aparece una sola vez).
  const eventosAsignados = useMemo(() => {
    const map = new Map();
    for (const p of puestosAsignados) {
      const id = p.evento?.id || 'sin-evento';
      const g = map.get(id) || {
        evento: p.evento || { id: 'sin-evento', nombre: 'Sin evento' },
        puestos: [],
      };
      g.puestos.push(p);
      map.set(id, g);
    }
    return [...map.values()];
  }, [puestosAsignados]);

  const eventosFiltrados = useMemo(() => {
    const q = busquedaEvento.trim().toLowerCase();
    return eventosAsignados.filter(({ evento }) => {
      const est = estadoEvento(evento);
      const coincideFiltro =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && (est === 'en_curso' || est === 'proximo')) ||
        (filtroEstado === 'en_curso' && est === 'en_curso') ||
        (filtroEstado === 'finalizados' && (est === 'finalizado' || est === 'archivado'));
      const coincideBusqueda = !q
        || (evento.nombre || '').toLowerCase().includes(q)
        || (evento.lugar || '').toLowerCase().includes(q);
      return coincideFiltro && coincideBusqueda;
    });
  }, [eventosAsignados, busquedaEvento, filtroEstado]);

  const grupoSel = eventoSelId
    ? eventosAsignados.find(g => g.evento.id === eventoSelId) || null
    : null;

  // El puesto activo se deriva de la URL (no es estado propio).
  const puesto = puestoSelId
    ? (grupoSel?.puestos.find(p => p.id === puestoSelId)
      || puestosAsignados.find(p => p.id === puestoSelId)
      || null)
    : null;

  const seleccionarPuesto = (p) => navSeleccion({ evento: p.evento?.id || 'sin-evento', puesto: p.id });
  const volverAPuestos = () => navSeleccion({ puesto: null });
  const volverAEventos = () => navSeleccion({ evento: null, puesto: null });

  // Productos + ventas del puesto activo — vía efecto, para que también funcione
  // al refrescar la página o entrar con un enlace directo (?evento=&puesto=).
  useEffect(() => {
    setCarrito([]);
    setAvisadosStock(new Set());
    setAvisoCantidad(null);
    if (!puesto) { setProductos([]); setVentas([]); return; }
    let vivo = true;
    // Se traen TODOS: los agotados / sin stock se muestran bloqueados (no se ocultan).
    api.productos.listar(puesto.id).then(lista => {
      if (vivo) setProductos(lista);
    });
    api.ventas.listar({ puestoId: puesto.id }).then(v => { if (vivo) setVentas(v); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puesto?.id]);

  // Refresca el catálogo (stock) — se llama después de cada cobro.
  const recargarProductos = () => {
    if (puesto) api.productos.listar(puesto.id).then(setProductos);
  };

  // Si el catálogo se refresca y algún ítem del carrito quedó por encima del
  // stock (o el producto se agotó), se ajusta / se saca solo.
  useEffect(() => {
    setCarrito(prev => {
      let cambio = false;
      const next = prev.flatMap(item => {
        const p = productos.find(x => x.id === item.id);
        if (!p) return [item];
        const tope = p.stock == null ? Infinity : p.stock;
        if (p.activo === false || tope === 0) { cambio = true; return []; }
        if (item.cantidad > tope) { cambio = true; return [{ ...item, cantidad: tope }]; }
        return [item];
      });
      return cambio ? next : prev;
    });
  }, [productos]);

  // Cascada de auto-selección: si no hay ambigüedad, salta el paso que sobra.
  // replace:true -> no mete pasos intermedios en el historial del navegador.
  useEffect(() => {
    if (puesto || cargandoPuestos || puestosAsignados.length === 0) return;
    if (!eventoSelId) {
      if (eventosAsignados.length === 1) {
        navSeleccion({ evento: eventosAsignados[0].evento.id }, { replace: true });
      }
      return;
    }
    const grupo = eventosAsignados.find(g => g.evento.id === eventoSelId);
    if (grupo && grupo.puestos.length === 1) {
      navSeleccion({ evento: grupo.evento.id, puesto: grupo.puestos[0].id }, { replace: true });
    }
  }, [puesto, cargandoPuestos, puestosAsignados, eventosAsignados, eventoSelId, navSeleccion]);

  const totalCarrito = useMemo(
    () => carrito.reduce((suma, item) => suma + Number(item.precio) * item.cantidad, 0),
    [carrito]
  );
  const cantidadItemsCarrito = useMemo(
    () => carrito.reduce((suma, item) => suma + item.cantidad, 0),
    [carrito]
  );
  const totalVentasHoy = useMemo(
    () => ventas.reduce((suma, v) => suma + Number(v.montoTotal), 0),
    [ventas]
  );

  const [busquedaVentas, setBusquedaVentas] = useState('');
  const ventasFiltradas = useMemo(() => {
    const q = busquedaVentas.trim().toLowerCase();
    if (!q) return ventas;
    return ventas.filter((v) =>
      `${v.entrada?.nombre || ''} ${ciDeEntrada(v.entrada) || ''}`.toLowerCase().includes(q),
    );
  }, [ventas, busquedaVentas]);

  const saldoInsuficiente = tarjetaQR && totalCarrito > Number(tarjetaQR.saldo);

  // --- LÓGICA DEL CARRITO (respeta el stock que queda) ---
  // Tope de unidades para un producto: su stock actual, o Infinity si no controla stock.
  const topeStock = (id) => {
    const p = productos.find(x => x.id === id);
    return p?.stock == null ? Infinity : p.stock;
  };

  const agregarProducto = (producto) => {
    const enCarrito = carrito.find(i => i.id === producto.id)?.cantidad ?? 0;
    if (enCarrito >= topeStock(producto.id)) {
      setAvisoCantidad({ id: producto.id, texto: `Solo quedan ${producto.stock}` });
      return;
    }
    setAvisoCantidad(null);
    setCarrito(prev => {
      const existente = prev.find(i => i.id === producto.id);
      if (existente) return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, delta) => {
    if (delta > 0) {
      const actual = carrito.find(i => i.id === id)?.cantidad ?? 0;
      if (actual >= topeStock(id)) {
        setAvisoCantidad({ id, texto: `Solo quedan ${productos.find(p => p.id === id)?.stock}` });
        return;
      }
    }
    setAvisoCantidad(null);
    setCarrito(prev => prev.flatMap(item => {
      if (item.id !== id) return [item];
      const nuevaCantidad = item.cantidad + delta;
      return nuevaCantidad <= 0 ? [] : [{ ...item, cantidad: nuevaCantidad }];
    }));
  };

  const quitarDelCarrito = (id) => setCarrito(prev => prev.filter(item => item.id !== id));

  const vaciarCarrito = () => setCarrito([]);

  // Avisar al Usuario Negocio que un producto quedó sin stock / por agotarse.
  const avisarStock = async (producto) => {
    if (!puesto) return;
    setAvisandoStock(producto.id);
    try {
      await api.avisosStock.crear({ puestoId: puesto.id, productoBaseId: producto.id });
      setAvisadosStock(prev => new Set(prev).add(producto.id));
    } catch {
      /* silencioso: el negocio igual lo ve por el stock en su panel */
    } finally {
      setAvisandoStock(null);
    }
  };

  // --- LÓGICA DE COBRO ---
  const iniciarCobro = () => {
    if (carrito.length === 0) return;
    setErrorEscaneo('');
    setEscaneando(true);
  };

  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setBuscando(true);
    try {
      const entrada = await api.entradas.buscarPorCodigo(codigo);
      if (!entrada.usuarioId) {
        setErrorEscaneo('Este participante no tiene una cuenta con billetera — no se le puede cobrar.');
        return;
      }
      setVentaExitosa(null);
      setTarjetaQR({
        ...entrada,
        saldo: Number(entrada.usuario?.saldo ?? 0), // ya viene como DISPONIBLE (sin lo retenido)
        saldoBloqueado: Number(entrada.usuario?.saldoBloqueado ?? 0),
      });
    } catch (err) {
      setErrorEscaneo(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setVentaExitosa(null);
    setErrorCobro('');
  };

  // Foco + ESC + scroll-lock de la tarjeta de cobro (look propio). El escáner
  // usa <Modal>, que ya trae ese comportamiento.
  const refTarjeta = useModal(!!tarjetaQR, cerrarTarjeta);

  const confirmarCobro = async () => {
    if (!tarjetaQR || carrito.length === 0 || totalCarrito > Number(tarjetaQR.saldo)) return;

    const nuevoSaldo = Number(tarjetaQR.saldo) - totalCarrito;
    setErrorCobro('');
    try {
      await api.ventas.crear({
        puestoId: puesto.id,
        entradaId: tarjetaQR.id,
        items: carrito.map(i => ({ productoId: i.id, cantidad: i.cantidad })),
      });
    } catch (err) {
      // Ej: "Sin stock suficiente de X (quedan N)" — el ayudante se entera acá.
      setErrorCobro(err.message);
      recargarProductos();
      return;
    }

    api.ventas.listar({ puestoId: puesto.id }).then(setVentas);
    recargarProductos(); // refresca el stock del catálogo tras la venta
    setVentaExitosa({ monto: totalCarrito, saldo: nuevoSaldo });
    setCarrito([]);
  };

  if (errorPuestos || cargandoPuestos) {
    return (
      <div className="pi-ayu-container">
        <div className="pi-ayu-header-wrapper">
          <h1>Vender / cobrar</h1>
        </div>
        {errorPuestos
          ? <EstadoError onReintentar={recargarPuestos} />
          : <EstadoCarga filas={3} />}
      </div>
    );
  }

  if (puestosAsignados.length === 0) {
    return (
      <div className="pi-ayu-container">
        <div className="pi-ayu-header-wrapper">
          <h1>Vender / cobrar</h1>
        </div>
        <p className="pi-ayu-carrito-vacio">Todavía no tienes ningún puesto asignado. Pídele a tu Usuario Negocio que te asigne uno.</p>
      </div>
    );
  }

  // La cascada de auto-selección de arriba resuelve los casos sin ambigüedad
  // (1 evento / 1 puesto). Mientras el efecto corre, no parpadees el selector.
  const saltaEvento = !eventoSelId && eventosAsignados.length === 1;
  const saltaPuesto = grupoSel && grupoSel.puestos.length === 1;
  if (!puesto && (saltaEvento || saltaPuesto)) {
    return (
      <div className="pi-ayu-container">
        <div className="pi-ayu-header-wrapper"><h1>Vender / cobrar</h1></div>
        <EstadoCarga filas={3} />
      </div>
    );
  }

  // Paso 1 — elegir EVENTO (solo si el ayudante trabaja en más de un evento).
  if (!puesto && !grupoSel) {
    return (
      <div className="pi-ayu-container">
        <div className="pi-ayu-header-wrapper">
          <h1>¿En qué evento vas a vender?</h1>
        </div>
        <Buscador
          valor={busquedaEvento}
          onCambio={setBusquedaEvento}
          placeholder="Buscar evento o lugar…"
          etiqueta="Buscar evento por nombre o lugar"
          filtros={FILTROS_ESTADO_EVENTO}
          filtroActivo={filtroEstado}
          onFiltro={setFiltroEstado}
          etiquetaFiltros="Filtrar por estado del evento"
        />
        <GrillaEventos
          eventos={eventosFiltrados}
          gridClassName="pi-entrega-eventos-grid"
          vacio="Ningún evento coincide con la búsqueda."
        >
          {g => (
            <EventoCard
              key={g.evento.id}
              evento={{ ...g.evento, imagen: imagenEvento(g.evento) }}
              onClick={() => navSeleccion({ evento: g.evento.id })}
              meta={<><FaStore aria-hidden="true" /> {g.puestos.length === 1 ? '1 puesto' : `${g.puestos.length} puestos`}</>}
              cta={g.puestos.length === 1 ? 'Vender' : 'Elegir puesto'}
            />
          )}
        </GrillaEventos>
      </div>
    );
  }

  // Paso 2 — elegir PUESTO dentro del evento (solo si hay más de uno).
  if (!puesto) {
    return (
      <div className="pi-ayu-container">
        {eventosAsignados.length > 1 && (
          <div className="qp-nav">
            <BotonVolver onClick={volverAEventos}>Cambiar de evento</BotonVolver>
            <Migas
              items={[
                { texto: 'Eventos', onClick: volverAEventos },
                { texto: grupoSel.evento.nombre, actual: true },
              ]}
            />
          </div>
        )}
        <div className="pi-ayu-header-wrapper pi-ayu-pos-header">
          <div className="pi-ayu-header-negocio">
            <div className="pi-ayu-header-texto">
              <span className="pi-ayu-eyebrow">Elegí tu puesto</span>
              <h1>
                {grupoSel.evento.nombre}
                <BadgeEstadoEvento evento={grupoSel.evento} className="pi-ayu-badge-evento" />
              </h1>
              <div className="pi-ayu-header-meta">
                {grupoSel.evento.lugar && (
                  <span className="pi-ayu-header-chip"><FaMapMarkerAlt aria-hidden="true" /> {grupoSel.evento.lugar}</span>
                )}
                {grupoSel.evento.fecha && (
                  <span className="pi-ayu-header-chip"><FaCalendarAlt aria-hidden="true" /> {formatearFecha(grupoSel.evento.fecha, false)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <GrillaEventos
          eventos={grupoSel.puestos}
          gridClassName="pi-entrega-eventos-grid"
          vacio="Este evento no tiene puestos asignados a tu cuenta."
        >
          {p => (
            <EventoCard
              key={p.id}
              evento={{ nombre: p.nombre, imagen: p.logo || undefined }}
              onClick={() => seleccionarPuesto(p)}
              meta={p.categoria || null}
              cta="Vender aquí"
            />
          )}
        </GrillaEventos>
      </div>
    );
  }

  return (
    <div className="pi-ayu-container">

      {/* --- VOLVER + RUTA (dónde estoy) --- */}
      <div className="qp-nav">
        {grupoSel && grupoSel.puestos.length > 1 ? (
          <BotonVolver onClick={volverAPuestos}>Cambiar de puesto</BotonVolver>
        ) : eventosAsignados.length > 1 ? (
          <BotonVolver onClick={volverAEventos}>Cambiar de evento</BotonVolver>
        ) : null}
        <Migas
          items={[
            ...(eventosAsignados.length > 1
              ? [{ texto: 'Eventos', onClick: volverAEventos }]
              : []),
            grupoSel && grupoSel.puestos.length > 1
              ? { texto: puesto.evento?.nombre || 'Evento', onClick: volverAPuestos }
              : { texto: puesto.evento?.nombre || 'Evento' },
            { texto: puesto.nombre, actual: true },
          ]}
        />
      </div>

      {/* --- CABECERA DEL PUNTO DE VENTA --- */}
      <div className="pi-ayu-header-wrapper pi-ayu-pos-header">
        <div className="pi-ayu-header-negocio">
          {puesto.logo
            ? <img width="72" height="72" src={puesto.logo} alt={puesto.nombre} className="pi-ayu-logo-negocio" />
            : <div className="pi-ayu-logo-placeholder"><FaStore /></div>}
          <div className="pi-ayu-header-texto">
            <span className="pi-ayu-eyebrow">
              Punto de venta{puesto.evento?.nombre ? ` · ${puesto.evento.nombre}` : ''}
            </span>
            <h1>
              {puesto.nombre}
              {puesto.evento && <BadgeEstadoEvento evento={puesto.evento} className="pi-ayu-badge-evento" />}
            </h1>
            {puesto.descripcion && <p>{puesto.descripcion}</p>}
            <div className="pi-ayu-header-meta">
              {puesto.categoria && (
                <span className="pi-ayu-header-chip"><FaHamburger aria-hidden="true" /> {puesto.categoria}</span>
              )}
              {puesto.evento?.lugar && (
                <span className="pi-ayu-header-chip"><FaMapMarkerAlt aria-hidden="true" /> {puesto.evento.lugar}</span>
              )}
              {puesto.evento?.fecha && (
                <span className="pi-ayu-header-chip"><FaCalendarAlt aria-hidden="true" /> {formatearFecha(puesto.evento.fecha, false)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="pi-ayu-kpi">
          <span className="micro-etiqueta">Vendido hoy</span>
          <div className="kpi-valor">
            <FaReceipt className="kpi-icon" />
            <span className="numero-grande">{totalVentasHoy} pts</span>
          </div>
        </div>
      </div>

      <div className="pi-ayu-tabs">
        <button type="button" className={pestana === 'vender' ? 'activo' : ''} aria-current={pestana === 'vender' ? 'page' : undefined} onClick={() => setPestana('vender')}>
          <FaShoppingCart aria-hidden="true" /> Vender
        </button>
        <button type="button" className={pestana === 'historial' ? 'activo' : ''} aria-current={pestana === 'historial' ? 'page' : undefined} onClick={() => setPestana('historial')}>
          <FaHistory aria-hidden="true" /> Historial ({ventas.length})
        </button>
      </div>

      {/* --- PESTAÑA: VENDER --- */}
      {pestana === 'vender' && (
        <div className="pi-ayu-vender-layout">

          <div className="pi-ayu-productos">
            <h3>Catálogo de productos</h3>
            <div className="pi-ayu-productos-grid">
              {productos.map(producto => {
                const enCarrito = carrito.find(i => i.id === producto.id);
                const estadoStk = estadoStockProducto(producto);
                const bloqueado = estadoStk === 'inactivo' || estadoStk === 'sin_stock';
                const avisado = avisadosStock.has(producto.id);
                return (
                  <div className={`pi-ayu-producto-card${bloqueado ? ' bloqueado' : ''}`} key={producto.id}>
                    {producto.imagen
                      ? <img width="160" height="90" src={producto.imagen} alt={producto.nombre} className="pi-ayu-producto-img" />
                      : <div className="pi-ayu-producto-img-placeholder"><FaHamburger /></div>}
                    <span className="pi-ayu-producto-nombre">{producto.nombre}</span>
                    <span className="pi-ayu-producto-precio">{Number(producto.precio)} pts</span>

                    {bloqueado ? (
                      <span className="pi-ayu-badge-agotado">
                        <FaExclamationTriangle aria-hidden="true" /> {estadoStk === 'inactivo' ? 'No disponible' : 'Sin stock'}
                      </span>
                    ) : estadoStk === 'bajo' ? (
                      <span className="pi-ayu-badge-bajo">
                        <FaExclamationTriangle aria-hidden="true" /> Quedan {producto.stock}
                      </span>
                    ) : null}

                    {!bloqueado && (enCarrito ? (
                      <div className="pi-ayu-producto-stepper">
                        <button type="button" onClick={() => cambiarCantidad(producto.id, -1)}><FaMinus /></button>
                        <span>{enCarrito.cantidad}</span>
                        <button type="button" onClick={() => cambiarCantidad(producto.id, 1)}><FaPlus /></button>
                      </div>
                    ) : (
                      <button type="button" className="pi-ayu-btn-agregar" onClick={() => agregarProducto(producto)}>
                        <FaPlus /> Agregar
                      </button>
                    ))}

                    {avisoCantidad?.id === producto.id && (
                      <span className="pi-ayu-cantidad-aviso">
                        <FaExclamationTriangle aria-hidden="true" /> {avisoCantidad.texto}
                      </span>
                    )}

                    {(bloqueado || estadoStk === 'bajo') && (
                      <button
                        type="button"
                        className="pi-ayu-btn-avisar"
                        onClick={() => avisarStock(producto)}
                        disabled={avisado || avisandoStock === producto.id}
                      >
                        {avisado
                          ? <><FaCheckCircle aria-hidden="true" /> Negocio avisado</>
                          : <><FaBell aria-hidden="true" /> Avisar al negocio</>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pi-ayu-carrito">
            <h3><FaShoppingCart /> Venta actual</h3>

            {carrito.length === 0 ? (
              <p className="pi-ayu-carrito-vacio">Selecciona productos del catálogo para iniciar una venta.</p>
            ) : (
              <>
                <div className="pi-ayu-carrito-lista">
                  {carrito.map(item => (
                    <div className="pi-ayu-carrito-item" key={item.id}>
                      <div className="pi-ayu-carrito-item-info">
                        <span className="nombre">{item.nombre}</span>
                        <span className="precio-unit">{item.precio} pts c/u</span>
                      </div>
                      <div className="pi-ayu-producto-stepper">
                        <button type="button" onClick={() => cambiarCantidad(item.id, -1)}><FaMinus /></button>
                        <span>{item.cantidad}</span>
                        <button type="button" onClick={() => cambiarCantidad(item.id, 1)}><FaPlus /></button>
                      </div>
                      <span className="pi-ayu-carrito-subtotal">{item.precio * item.cantidad} pts</span>
                      <button type="button" className="pi-ayu-btn-quitar" onClick={() => quitarDelCarrito(item.id)}>
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pi-ayu-carrito-total">
                  <span>Total ({cantidadItemsCarrito} {cantidadItemsCarrito === 1 ? 'producto' : 'productos'})</span>
                  <strong>{totalCarrito} pts</strong>
                </div>

                <button type="button" className="pi-ayu-btn-vaciar" onClick={vaciarCarrito}>
                  Vaciar venta
                </button>
              </>
            )}

            <button
              type="button"
              className="pi-ayu-btn-escanear"
              onClick={iniciarCobro}
              disabled={carrito.length === 0 || escaneando || buscando}
            >
              <FaQrcode /> {buscando ? 'Buscando...' : 'Escanear QR para cobrar'}
            </button>
            {errorEscaneo && (
              <p className="pi-ayu-alerta-error">
                <FaExclamationTriangle /> {errorEscaneo}
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: ESCÁNER DE QR (cámara real) --- */}
      {escaneando && (
        <Modal
          titulo={<><FaQrcode aria-hidden="true" /> Escanear manilla</>}
          onCerrar={() => setEscaneando(false)}
          tamano="sm"
        >
          <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
        </Modal>
      )}

      {/* --- PESTAÑA: HISTORIAL --- */}
      {pestana === 'historial' && (
        <div className="pi-ayu-historial">
          <Buscador
            valor={busquedaVentas}
            onCambio={setBusquedaVentas}
            placeholder="Buscar por cliente o documento…"
          />
          <Tabla
            card
            columnas={['Cliente', 'Documento', 'Productos', 'Total', 'Fecha', 'Hora']}
            datos={ventasFiltradas}
            vacio={busquedaVentas.trim()
              ? 'No hay ventas que coincidan con la búsqueda.'
              : 'Aún no has realizado ninguna venta.'}
            renderFila={venta => {
              const cantidadItems = venta.items.reduce((s, i) => s + i.cantidad, 0);
              return (
                <tr key={venta.id}>
                  <td>
                    <div className="pi-ayu-fila-persona">
                      {venta.entrada?.foto && <FotoZoom width={34} height={34} src={venta.entrada.foto} alt={venta.entrada.nombre} className="pi-ayu-mini-avatar" />}
                      <span>{venta.entrada?.nombre || '—'}</span>
                    </div>
                  </td>
                  <td>{ciDeEntrada(venta.entrada) || '—'}</td>
                  <td>
                    <span className="pi-ayu-badge-items">
                      {cantidadItems} {cantidadItems === 1 ? 'producto' : 'productos'}
                    </span>
                  </td>
                  <td className="pi-ayu-monto-celda">-{Number(venta.montoTotal)} pts</td>
                  <td>{new Date(venta.createdAt).toLocaleDateString('es-BO')}</td>
                  <td>{new Date(venta.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              );
            }}
          />
        </div>
      )}

      {/* --- TARJETA GRANDE AL ESCANEAR QR --- */}
      {tarjetaQR && (
        <div className="pi-ayu-modal-overlay" onClick={cerrarTarjeta}>
          <div
            ref={refTarjeta}
            tabIndex={-1}
            className="pi-ayu-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Cobro a ${tarjetaQR.nombre}`}
          >
            <button type="button" className="pi-ayu-btn-cerrar" onClick={cerrarTarjeta} aria-label="Cerrar">
              <FaTimes aria-hidden="true" />
            </button>

            {ventaExitosa ? (
              <div className="pi-ayu-exito">
                <FaCheckCircle size={60} color="var(--verde-recarga)" />
                <h3>¡Venta cobrada!</h3>
                <p>Se descontaron <strong>{ventaExitosa.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                <div className="pi-ayu-exito-saldo">
                  <FaWallet /> Saldo restante: <strong>{ventaExitosa.saldo} pts</strong>
                </div>
                <button type="button" className="pi-ayu-btn-confirmar" onClick={cerrarTarjeta}>Listo</button>
              </div>
            ) : (
              <>
                <div className={`pi-ayu-tarjeta-estado ${saldoInsuficiente ? 'aviso' : 'ok'}`}>
                  {saldoInsuficiente
                    ? <><FaExclamationTriangle /> Saldo insuficiente</>
                    : <><FaCheckCircle /> Código QR Válido</>}
                </div>

                {(tarjetaQR.usuario?.foto || tarjetaQR.foto) && (
                  <FotoZoom
                    width={120}
                    height={120}
                    src={tarjetaQR.usuario?.foto || tarjetaQR.foto}
                    alt={`Foto de ${tarjetaQR.nombre}`}
                    className="pi-ayu-tarjeta-foto"
                  />
                )}
                <h2 className="pi-ayu-tarjeta-nombre">{tarjetaQR.nombre}</h2>

                <div className="pi-ayu-tarjeta-datos">
                  <div className="pi-ayu-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Documento</span>
                      <span className="valor">{ciDeEntrada(tarjetaQR) || '—'}</span>
                    </div>
                  </div>
                  <div className="pi-ayu-tarjeta-dato">
                    <FaCalendarAlt />
                    <div>
                      <span className="label">Evento</span>
                      <span className="valor">{tarjetaQR.evento?.nombre || '—'}</span>
                    </div>
                  </div>
                  {mostrarJornada(tarjetaQR.diaEvento) && (
                    <div className="pi-ayu-tarjeta-dato">
                      <FaMoon />
                      <div>
                        <span className="label">Jornada</span>
                        <span className="valor">{nombreJornada(tarjetaQR.diaEvento)}</span>
                      </div>
                    </div>
                  )}
                  <div className="pi-ayu-tarjeta-dato">
                    <FaTicketAlt />
                    <div>
                      <span className="label">Tipo de entrada</span>
                      <span className="valor">{tarjetaQR.categoriaTicket?.nombre || '—'}</span>
                    </div>
                  </div>
                  {tarjetaQR.numero != null && (
                    <div className="pi-ayu-tarjeta-dato">
                      <FaHashtag />
                      <div>
                        <span className="label">N.º de entrada</span>
                        <span className="valor">{tarjetaQR.numero}</span>
                      </div>
                    </div>
                  )}
                  <div className="pi-ayu-tarjeta-dato">
                    <FaWallet />
                    <div>
                      <span className="label">Saldo disponible</span>
                      <span className="valor">{tarjetaQR.saldo} pts</span>
                      {tarjetaQR.saldoBloqueado > 0 && (
                        <span className="pi-ayu-saldo-disputa">
                          + {tarjetaQR.saldoBloqueado} pts en disputa (no se pueden usar)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pi-ayu-resumen-venta">
                  <span className="pi-ayu-resumen-titulo">Resumen de la venta</span>
                  {carrito.map(item => (
                    <div className="pi-ayu-resumen-item" key={item.id}>
                      <span>{item.cantidad} × {item.nombre}</span>
                      <span>{item.precio * item.cantidad} pts</span>
                    </div>
                  ))}
                  <div className="pi-ayu-resumen-total">
                    <span>Total a cobrar</span>
                    <strong>{totalCarrito} pts</strong>
                  </div>
                </div>

                {saldoInsuficiente && (
                  <div className="pi-ayu-alerta-error">
                    <FaExclamationTriangle /> El saldo disponible ({tarjetaQR.saldo} pts) no alcanza para cubrir esta venta.
                  </div>
                )}

                {errorCobro && (
                  <div className="pi-ayu-alerta-error">
                    <FaExclamationTriangle /> {errorCobro}
                  </div>
                )}

                <div className="pi-ayu-tarjeta-acciones">
                  <button type="button" className="pi-ayu-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                  <button
                    className="pi-ayu-btn-confirmar"
                    onClick={confirmarCobro}
                    disabled={saldoInsuficiente}
                  >
                    <FaCheckCircle /> Confirmar Cobro
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
