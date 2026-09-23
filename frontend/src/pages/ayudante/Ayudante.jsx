import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import StatCard from '../../components/StatCard.jsx';
import DetalleVentaModal from '../../components/DetalleVentaModal.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import { useApi } from '../../utils/useApi.js';
import FotoZoom from '../../components/FotoZoom.jsx';
import FichaParticipante from '../../components/FichaParticipante.jsx';
import { estadoEvento, imagenEvento, formatearFecha, nombreJornada, mostrarJornada, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import { estadoStockProducto } from '../../utils/stock.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import Boton from '../../components/Boton.jsx';
import Insignia from '../../components/Insignia.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import SelectorCantidad from '../../components/SelectorCantidad.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import {
  FaStore, FaShoppingCart, FaPlus, FaTrash, FaQrcode,
  FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle, FaHistory,
  FaReceipt, FaHamburger, FaMapMarkerAlt, FaCalendarAlt, FaBell,
  FaTicketAlt, FaMoon, FaHashtag, FaSearch,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import ManillaFalsaModal from '../../components/ManillaFalsaModal.jsx';
import { esManillaFalsa } from '../../utils/duplicados.js';
import './Ayudante.css';

export default function Ayudante() {
  useTituloPagina('Vender y cobrar');
  const sesion = leerSesion();
  const avisos = useAvisos();

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
  // Mientras se registra el cobro el botón queda con spinner: evita cobrar dos
  // veces con un doble toque (o con la conexión lenta).
  const [cobrando, setCobrando] = useState(false);

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
  // Las anuladas se listan igual en el historial, pero no suman (neto).
  const ventasNetas = useMemo(() => ventas.filter(v => !v.anuladaEn), [ventas]);
  const totalVentasHoy = useMemo(
    () => ventasNetas.reduce((suma, v) => suma + Number(v.montoTotal), 0),
    [ventasNetas]
  );
  // Resumen del historial: unidades vendidas y ranking de productos del puesto.
  const productosVendidos = useMemo(() => {
    const porProducto = new Map();
    ventasNetas.forEach(v => v.items.forEach(i => {
      const p = porProducto.get(i.productoBaseId) || { id: i.productoBaseId, nombre: i.nombreProducto, unidades: 0, total: 0 };
      p.unidades += i.cantidad;
      p.total += i.cantidad * Number(i.precioUnitario);
      porProducto.set(i.productoBaseId, p);
    }));
    return [...porProducto.values()].sort((a, b) => b.unidades - a.unidades);
  }, [ventasNetas]);
  const unidadesVendidas = useMemo(() => productosVendidos.reduce((s, p) => s + p.unidades, 0), [productosVendidos]);
  const [ventaDetalle, setVentaDetalle] = useState(null);

  const [busquedaVentas, setBusquedaVentas] = useState('');
  const ventasFiltradas = useMemo(() => {
    const q = busquedaVentas.trim().toLowerCase();
    if (!q) return ventas;
    return ventas.filter((v) =>
      `${v.entrada?.nombre || ''} ${ciDeEntrada(v.entrada) || ''} ${v.items.map(i => i.nombreProducto).join(' ')}`.toLowerCase().includes(q),
    );
  }, [ventas, busquedaVentas]);

  const saldoInsuficiente = tarjetaQR && totalCarrito > Number(tarjetaQR.saldo);
  // La manilla es de UN evento y su saldo solo vale ahí: si es de otro, no se
  // cobra acá (el backend lo rechaza igual, ver ventas.service.crear).
  const eventoNoCoincide = !!(
    tarjetaQR && puesto?.eventoId && tarjetaQR.eventoId && tarjetaQR.eventoId !== puesto.eventoId
  );

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

  const vaciarCarrito = () => {
    const anterior = carrito;
    setCarrito([]);
    avisos.info('Vaciaste la venta.', { accion: { texto: 'Deshacer', onClick: () => setCarrito(anterior) } });
  };

  // Avisar al Usuario Negocio que un producto quedó sin stock / por agotarse.
  const avisarStock = async (producto) => {
    if (!puesto) return;
    setAvisandoStock(producto.id);
    try {
      await api.avisosStock.crear({ puestoId: puesto.id, productoBaseId: producto.id });
      setAvisadosStock(prev => new Set(prev).add(producto.id));
      avisos.exito(`Le avisamos al negocio que ${producto.nombre} se está acabando.`);
    } catch (err) {
      avisos.error(err.message, { titulo: 'No se pudo avisar al negocio' });
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

  // Copia de una manilla duplicada (detalle que manda el backend).
  const [manillaFalsa, setManillaFalsa] = useState(null);

  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setBuscando(true);
    try {
      const entrada = await api.entradas.buscarPorCodigo(codigo, { contexto: 'venta', puestoId: puesto?.id });
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
      if (esManillaFalsa(err)) setManillaFalsa(err.detalle);
      else setErrorEscaneo(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setVentaExitosa(null);
    setErrorCobro('');
  };


  const confirmarCobro = async () => {
    if (cobrando || !tarjetaQR || eventoNoCoincide || carrito.length === 0 || totalCarrito > Number(tarjetaQR.saldo)) return;

    const nuevoSaldo = Number(tarjetaQR.saldo) - totalCarrito;
    setErrorCobro('');
    setCobrando(true);
    try {
      await api.ventas.crear({
        puestoId: puesto.id,
        entradaId: tarjetaQR.id,
        codigoQr: tarjetaQR.codigoQrVinculado?.codigo,
        items: carrito.map(i => ({ productoId: i.id, cantidad: i.cantidad })),
      });
    } catch (err) {
      if (esManillaFalsa(err)) {
        cerrarTarjeta();
        setManillaFalsa(err.detalle);
        return;
      }
      // Ej: "Sin stock suficiente de X (quedan N)" — el ayudante se entera acá.
      setErrorCobro(err.message);
      recargarProductos();
      return;
    } finally {
      setCobrando(false);
    }

    api.ventas.listar({ puestoId: puesto.id }).then(setVentas);
    recargarProductos(); // refresca el stock del catálogo tras la venta
    setVentaExitosa({ monto: totalCarrito, saldo: nuevoSaldo });
    setCarrito([]);
  };

  if (errorPuestos || cargandoPuestos) {
    return (
      <div className="pi-ayu-container">
        <EncabezadoPagina titulo="Vender / cobrar" icono={FaShoppingCart} />
        {errorPuestos
          ? <EstadoError onReintentar={recargarPuestos} />
          : <EstadoCarga filas={3} />}
      </div>
    );
  }

  if (puestosAsignados.length === 0) {
    return (
      <div className="pi-ayu-container">
        <EncabezadoPagina titulo="Vender / cobrar" icono={FaShoppingCart} />
        <EstadoVacio
          icono={FaStore}
          titulo="Todavía no tenés ningún puesto asignado"
          mensaje="Pedile al negocio para el que trabajás que te asigne a un puesto."
        />
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
        <EncabezadoPagina titulo="Vender / cobrar" icono={FaShoppingCart} />
        <EstadoCarga filas={3} />
      </div>
    );
  }

  // Paso 1 — elegir EVENTO (solo si el ayudante trabaja en más de un evento).
  if (!puesto && !grupoSel) {
    return (
      <div className="pi-ayu-container">
        <EncabezadoPagina titulo="¿En qué evento vas a vender?" icono={FaCalendarAlt} />
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
         
          vacio={<EstadoVacio compacto icono={FaSearch} titulo="Ningún evento coincide con la búsqueda" />}
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
                {grupoSel.evento.lugar && <Insignia tono="neutro" icono={FaMapMarkerAlt}>{grupoSel.evento.lugar}</Insignia>}
                {grupoSel.evento.fecha && <Insignia tono="neutro" icono={FaCalendarAlt}>{formatearFecha(grupoSel.evento.fecha, false)}</Insignia>}
              </div>
            </div>
          </div>
        </div>
        <GrillaEventos
          eventos={grupoSel.puestos}
         
          vacio={<EstadoVacio compacto icono={FaStore} titulo="Este evento no tiene puestos asignados a tu cuenta" />}
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
              {puesto.categoria && <Insignia tono="neutro" icono={FaHamburger}>{puesto.categoria}</Insignia>}
              {puesto.evento?.lugar && <Insignia tono="neutro" icono={FaMapMarkerAlt}>{puesto.evento.lugar}</Insignia>}
              {puesto.evento?.fecha && <Insignia tono="neutro" icono={FaCalendarAlt}>{formatearFecha(puesto.evento.fecha, false)}</Insignia>}
            </div>
          </div>
        </div>

        <StatCard icon={<FaReceipt />} tono="ok" valor={totalVentasHoy} unidad="pts" label="Vendido hoy" />
      </div>

      <Pestanas
        className="pi-ayu-pestanas"
        etiqueta="Secciones del punto de venta"
        activo={pestana}
        onCambio={setPestana}
        items={[
          { id: 'vender', etiqueta: 'Vender', icono: FaShoppingCart, contador: cantidadItemsCarrito || null },
          { id: 'historial', etiqueta: `Historial (${ventas.length})`, icono: FaHistory },
        ]}
      />

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
                      <Insignia tono="danger" icono={FaExclamationTriangle}>{estadoStk === 'inactivo' ? 'No disponible' : 'Sin stock'}</Insignia>
                    ) : estadoStk === 'bajo' ? (
                      <Insignia tono="warn" icono={FaExclamationTriangle}>Quedan {producto.stock}</Insignia>
                    ) : null}

                    {!bloqueado && (enCarrito ? (
                      <SelectorCantidad
                        valor={enCarrito.cantidad}
                        nombre={producto.nombre}
                        onMenos={() => cambiarCantidad(producto.id, -1)}
                        onMas={() => cambiarCantidad(producto.id, 1)}
                      />
                    ) : (
                      <Boton tamano="sm" pildora icono={FaPlus} onClick={() => agregarProducto(producto)}>Agregar</Boton>
                    ))}

                    {avisoCantidad?.id === producto.id && (
                      <Insignia tono="warn" icono={FaExclamationTriangle}>{avisoCantidad.texto}</Insignia>
                    )}

                    {(bloqueado || estadoStk === 'bajo') && (
                      <Boton
                        variante="fantasma"
                        tamano="sm"
                        icono={avisado ? FaCheckCircle : FaBell}
                        onClick={() => avisarStock(producto)}
                        cargando={avisandoStock === producto.id}
                        disabled={avisado}
                      >
                        {avisado ? 'Negocio avisado' : 'Avisar al negocio'}
                      </Boton>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pi-ayu-carrito">
            <h3><FaShoppingCart /> Venta actual</h3>

            {carrito.length === 0 ? (
              <EstadoVacio compacto icono={FaShoppingCart} titulo="Todavía no hay productos" mensaje="Tocá “Agregar” en el catálogo para empezar una venta." />
            ) : (
              <>
                <div className="pi-ayu-carrito-lista">
                  {carrito.map(item => (
                    <div className="pi-ayu-carrito-item" key={item.id}>
                      <div className="pi-ayu-carrito-item-info">
                        <span className="nombre">{item.nombre}</span>
                        <span className="precio-unit">{item.precio} pts c/u</span>
                      </div>
                      <SelectorCantidad
                        tamano="sm"
                        valor={item.cantidad}
                        nombre={item.nombre}
                        onMenos={() => cambiarCantidad(item.id, -1)}
                        onMas={() => cambiarCantidad(item.id, 1)}
                      />
                      <span className="pi-ayu-carrito-subtotal">{item.precio * item.cantidad} pts</span>
                      <Boton variante="peligro-suave" tamano="sm" icono={FaTrash} onClick={() => quitarDelCarrito(item.id)} aria-label={`Quitar ${item.nombre} de la venta`} />
                    </div>
                  ))}
                </div>

                <div className="pi-ayu-carrito-total">
                  <span>Total ({cantidadItemsCarrito} {cantidadItemsCarrito === 1 ? 'producto' : 'productos'})</span>
                  <strong>{totalCarrito} pts</strong>
                </div>

                <Boton variante="fantasma" tamano="sm" icono={FaTrash} onClick={vaciarCarrito}>Vaciar venta</Boton>
              </>
            )}

            <Boton
              variante="compra"
              tamano="lg"
              anchoCompleto
              icono={FaQrcode}
              onClick={iniciarCobro}
              cargando={buscando}
              disabled={carrito.length === 0 || escaneando}
            >
              {buscando ? 'Buscando…' : 'Escanear QR para cobrar'}
            </Boton>
            {errorEscaneo && <AvisoFijo tono="error">{errorEscaneo}</AvisoFijo>}
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
          <div className="pi-ayu-hist-resumen">
            <StatCard icon={<FaReceipt />} tono="total" valor={ventasNetas.length} label="Ventas cobradas" />
            <StatCard icon={<FaShoppingCart />} tono="info" valor={unidadesVendidas} label="Unidades vendidas" />
            <StatCard icon={<FaWallet />} tono="ok" valor={`${totalVentasHoy} pts`} label="Total vendido" />
            <StatCard
              icon={<FaHamburger />}
              tono="warn"
              valor={productosVendidos[0]?.nombre || '—'}
              label="Producto más vendido"
              nota={productosVendidos[0] ? `${productosVendidos[0].unidades} unidades` : null}
            />
          </div>

          {productosVendidos.length > 0 && (
            <div className="pi-ayu-hist-productos">
              <h4>Cantidades vendidas por producto</h4>
              <ul>
                {productosVendidos.map(p => (
                  <li key={p.id}>
                    <span className="pi-ayu-hist-prod-nombre">{p.nombre}</span>
                    <span className="pi-ayu-hist-prod-barra" aria-hidden="true">
                      <span style={{ width: `${(p.unidades / productosVendidos[0].unidades) * 100}%` }} />
                    </span>
                    <span className="pi-ayu-hist-prod-cant">× {p.unidades}</span>
                    <span className="pi-ayu-hist-prod-total">{p.total} pts</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Buscador
            valor={busquedaVentas}
            onCambio={setBusquedaVentas}
            placeholder="Buscar por cliente, documento o producto…"
          />
          <Tabla
            card
            columnas={['Cliente', 'Documento', 'Productos', 'Total', 'Fecha', 'Hora', { texto: 'Detalle', srOnly: true }]}
            datos={ventasFiltradas}
            vacio={busquedaVentas.trim()
              ? 'No hay ventas que coincidan con la búsqueda.'
              : 'Todavía no hiciste ninguna venta.'}
            renderFila={venta => (
              <tr
                key={venta.id}
                className={`pi-ayu-fila-venta${venta.anuladaEn ? ' pi-ayu-fila-anulada' : ''}`}
                onClick={() => setVentaDetalle(venta)}
              >
                <td>
                  <div className="pi-ayu-fila-persona">
                    {venta.entrada?.foto && <FotoZoom width={34} height={34} src={venta.entrada.foto} alt={venta.entrada.nombre} className="pi-ayu-mini-avatar" />}
                    <span>{venta.entrada?.nombre || '—'}</span>
                  </div>
                </td>
                <td>{ciDeEntrada(venta.entrada) || '—'}</td>
                <td>
                  <ul className="pi-ayu-items-lista">
                    {venta.items.map(i => (
                      <li key={i.id}><strong>{i.cantidad}×</strong> {i.nombreProducto}</li>
                    ))}
                  </ul>
                </td>
                <td className="pi-ayu-monto-celda">
                  {venta.anuladaEn
                    ? <Insignia tono="danger">Anulada</Insignia>
                    : `-${Number(venta.montoTotal)} pts`}
                </td>
                <td>{new Date(venta.createdAt).toLocaleDateString('es-BO')}</td>
                <td>{new Date(venta.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <Boton variante="secundario" tamano="sm" onClick={(e) => { e.stopPropagation(); setVentaDetalle(venta); }}>
                    Ver detalle
                  </Boton>
                </td>
              </tr>
            )}
          />
          {ventaDetalle && (
            <DetalleVentaModal
              venta={{
                fecha: ventaDetalle.createdAt,
                cliente: ventaDetalle.entrada?.nombre,
                documento: ciDeEntrada(ventaDetalle.entrada),
                puesto: ventaDetalle.puesto?.base?.nombre,
                ayudante: ventaDetalle.ayudante?.nombre,
                anulada: !!ventaDetalle.anuladaEn,
                motivoAnulacion: ventaDetalle.motivoAnulacion,
                monto: ventaDetalle.montoTotal,
                items: ventaDetalle.items,
              }}
              onCerrar={() => setVentaDetalle(null)}
            />
          )}
        </div>
      )}

      {/* --- TARJETA GRANDE AL ESCANEAR QR --- */}
      {/* --- TARJETA DE COBRO AL ESCANEAR EL QR (<Modal> global) --- */}
      {tarjetaQR && (
        <Modal
          titulo={ventaExitosa ? 'Venta cobrada' : `Cobro a ${tarjetaQR.nombre}`}
          onCerrar={cerrarTarjeta}
          className="pi-ayu-modal-tarjeta"
          cerrarEnBackdrop={!cobrando}
        >

            {ventaExitosa ? (
              <div className="pi-ayu-exito">
                <FaCheckCircle className="pi-ayu-exito-ic" aria-hidden="true" />
                <h3>¡Venta cobrada!</h3>
                <p>Se descontaron <strong>{ventaExitosa.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                <div className="pi-ayu-exito-saldo">
                  <FaWallet aria-hidden="true" /> Saldo restante: <strong>{ventaExitosa.saldo} pts</strong>
                </div>
                <Boton variante="exito" tamano="lg" icono={FaCheckCircle} onClick={cerrarTarjeta}>Listo</Boton>
              </div>
            ) : (
              <>
                <FichaParticipante
                  estado={eventoNoCoincide
                    ? <Insignia tono="danger" icono={FaExclamationTriangle} solida>Manilla de otro evento</Insignia>
                    : saldoInsuficiente
                      ? <Insignia tono="warn" icono={FaExclamationTriangle} solida>Saldo insuficiente</Insignia>
                      : <Insignia tono="ok" icono={FaCheckCircle} solida>Código QR válido</Insignia>}
                  foto={tarjetaQR.usuario?.foto || tarjetaQR.foto}
                  nombre={tarjetaQR.nombre}
                  datos={[
                    { icono: FaIdCard, etiqueta: 'Documento', valor: ciDeEntrada(tarjetaQR) || '—' },
                    { icono: FaCalendarAlt, etiqueta: 'Evento', valor: tarjetaQR.evento?.nombre || '—' },
                    mostrarJornada(tarjetaQR.diaEvento) && { icono: FaMoon, etiqueta: 'Jornada', valor: nombreJornada(tarjetaQR.diaEvento) },
                    { icono: FaTicketAlt, etiqueta: 'Tipo de entrada', valor: tarjetaQR.categoriaTicket?.nombre || '—' },
                    tarjetaQR.numero != null && { icono: FaHashtag, etiqueta: 'N.º de entrada', valor: tarjetaQR.numero },
                    {
                      icono: FaWallet, etiqueta: 'Saldo disponible', valor: `${tarjetaQR.saldo} pts`, destacado: true,
                      nota: tarjetaQR.saldoBloqueado > 0 ? `+ ${tarjetaQR.saldoBloqueado} pts en disputa (no se pueden usar)` : null,
                    },
                  ]}
                />

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

                {eventoNoCoincide && (
                  <AvisoFijo tono="error" titulo="No se puede cobrar acá">
                    Esta manilla es de «{tarjetaQR.evento?.nombre || 'otro evento'}» y este puesto es de
                    «{puesto.evento?.nombre || 'este evento'}»: su saldo solo sirve en su propio evento.
                  </AvisoFijo>
                )}

                {!eventoNoCoincide && saldoInsuficiente && (
                  <AvisoFijo tono="aviso" titulo="Saldo insuficiente">
                    El saldo disponible ({tarjetaQR.saldo} pts) no alcanza para cubrir esta venta.
                  </AvisoFijo>
                )}

                {errorCobro && <AvisoFijo tono="error" titulo="No se pudo cobrar">{errorCobro}</AvisoFijo>}

                <div className="modal-actions">
                  <Boton variante="secundario" onClick={cerrarTarjeta} disabled={cobrando}>Cancelar</Boton>
                  <Boton
                    variante="exito"
                    tamano="lg"
                    icono={FaCheckCircle}
                    onClick={confirmarCobro}
                    cargando={cobrando}
                    disabled={saldoInsuficiente || eventoNoCoincide}
                  >
                    {cobrando ? 'Cobrando…' : `Cobrar ${totalCarrito} pts`}
                  </Boton>
                </div>
              </>
            )}
        </Modal>
      )}


      {manillaFalsa && (
        <ManillaFalsaModal detalle={manillaFalsa} onCerrar={() => setManillaFalsa(null)} />
      )}
    </div>
  );
}
