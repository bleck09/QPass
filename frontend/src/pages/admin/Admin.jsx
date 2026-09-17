import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Buscador from '../../components/Buscador.jsx';
import Filtros from '../../components/Filtros.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useApi } from '../../utils/useApi.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaCheckCircle, FaHourglassHalf, FaUserCheck,
  FaStore, FaCashRegister, FaChartPie, FaBoxOpen, FaUserFriends, FaUsers,
  FaChevronRight, FaTrophy, FaCoins, FaShoppingBag, FaWallet,
  FaExchangeAlt, FaClock, FaExclamationTriangle, FaSignOutAlt,
  FaKey, FaListUl, FaBoxes, FaMedal
} from 'react-icons/fa';
import api from '../../api/index.js';
import { filtrarEventos, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import {
  GraficoActividadPorHora, GraficoIngresosPorCategoria,
  GraficoVentasPorNegocio, GraficoProductosMasVendidos,
} from './GraficosEvento.jsx';
import DetalleVentaModal from '../../components/DetalleVentaModal.jsx';
import HistorialManillas from '../../components/HistorialManillas.jsx';
import './Admin.css';
// Marco Gráfico/Tabla (.pi-adg-grafico*) compartido con el dashboard general —
// se reutiliza tal cual en vez de duplicar el CSS.
import './AdminGeneral.css';

const ETIQUETA_CAMPO_ENTRADA = { nombre: 'Nombre completo', correo: 'Correo electrónico', celular: 'Celular' };

const FILTROS_ESTADO_REPORTE = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'resuelto', texto: 'Resueltos' },
  { valor: 'todos', texto: 'Todos' },
];

const EVENTO_ACTIVIDAD_VACIA = { negocios: [], recargadores: [], devoluciones: [], supervisores: [], entradas: [] };

const hora = (iso) => new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

// Agrupa transacciones de un tipo (recarga/devolución) por operador, con el detalle de cada una.
const agruparPorOperador = (transacciones, staffAsignado, campo) => {
  const porOperador = new Map();
  staffAsignado.forEach(u => porOperador.set(u.id, { id: u.id, nombre: u.nombre, [campo]: [] }));
  transacciones.forEach(t => {
    const id = t.operador.id;
    if (!porOperador.has(id)) porOperador.set(id, { id, nombre: t.operador.nombre, [campo]: [] });
    porOperador.get(id)[campo].push({
      id: t.id,
      hora: hora(t.createdAt),
      fecha: t.createdAt,
      participante: t.entrada?.nombre || 'Retiro de Usuario Negocio',
      documento: ciDeEntrada(t.entrada),
      esNegocio: !t.entrada,
      monto: Number(t.monto),
      saldo: t.saldoResultante != null ? Number(t.saldoResultante) : null,
      nota: t.nota,
      motivo: t.motivoDevolucion,
    });
  });
  return [...porOperador.values()];
};

// Ventas agrupadas por Usuario Negocio dueño del puesto (varios puestos pueden ser del mismo negocio).
const agruparVentasPorNegocio = (ventas, puestos, usuariosPorId) => {
  const ayudantesPorNegocio = new Map();
  puestos.forEach(p => {
    ayudantesPorNegocio.set(p.negocioId, (ayudantesPorNegocio.get(p.negocioId) || 0) + p.ayudantes.length);
  });

  const porNegocio = new Map();
  ventas.forEach(v => {
    const negocioId = v.puesto.negocioId;
    if (!porNegocio.has(negocioId)) {
      porNegocio.set(negocioId, {
        id: negocioId,
        nombre: usuariosPorId.get(negocioId)?.nombre || `Negocio #${negocioId}`,
        ayudantes: ayudantesPorNegocio.get(negocioId) || 0,
        ventas: [],
      });
    }
    porNegocio.get(negocioId).ventas.push({
      id: v.id,
      hora: hora(v.createdAt),
      fecha: v.createdAt,
      cliente: v.entrada?.nombre || '—',
      clienteId: v.entrada?.id || v.entradaId,
      documento: ciDeEntrada(v.entrada),
      puesto: v.puesto?.base?.nombre || '—',
      ayudanteId: v.ayudante?.id ?? v.ayudanteId,
      ayudante: v.ayudante?.nombre || '—',
      monto: Number(v.montoTotal),
      anulada: v.anuladaEn != null,
      motivoAnulacion: v.motivoAnulacion,
      items: v.items || [],
    });
  });
  return [...porNegocio.values()];
};

const sumar = (lista, clave) => lista.reduce((total, item) => total + item[clave], 0);

function Podio({ lista, valorKey, unidad }) {
  // Coral y cian son fondos muy saturados: el texto blanco no alcanza 4.5:1 ahí,
  // así que solo el puesto sobre índigo (oscuro) usa texto blanco; los otros dos usan azul noche.
  const estilos = [
    { fondo: 'var(--coral-compra)', texto: 'var(--texto-sobre-vivo)' },
    { fondo: 'var(--indigo-profundo)', texto: 'var(--texto-sobre-oscuro)' },
    { fondo: 'var(--cian-digital)', texto: 'var(--texto-sobre-vivo)' },
  ];
  return (
    <div className="pi-dash-podio">
      {lista.slice(0, 3).map((item, index) => (
        <div className="pi-dash-podio-item" key={item.id ?? item.nombre}>
          <div
            className="pi-dash-podio-puesto"
            style={{ backgroundColor: estilos[index].fondo, color: estilos[index].texto }}
          >
            {index + 1}
          </div>
          <span className="pi-dash-podio-nombre">{item.nombre}</span>
          <span className="pi-dash-podio-valor">{item[valorKey]} {unidad}</span>
        </div>
      ))}
    </div>
  );
}

export default function Admin({
  soloLectura = false,
  eventosPermitidos = null,
  // Embebido como pestaña dentro del detalle de un evento: se fija el evento y
  // la vista, se ocultan cabecera/selector, y se cargan solo los datos de esa vista.
  eventoIdFijo = null,
  vistaFija = null, // 'solicitudesEntradas' | 'incidencias'
} = {}) {
  const embebido = !!eventoIdFijo;
  useTituloPagina('Panel de administración', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  // /admin/reportes y /admin/solicitudes abren directo su apartado (accesibles también desde
  // el menú lateral o desde los accesos rápidos de Gestión de Eventos), sin pasar por la
  // tarjeta del dashboard. Si llegan con state.eventoId (ej. desde Gestión de Eventos), se
  // abren ya sobre ese evento específico.
  const enReportes = location.pathname.endsWith('/reportes') || vistaFija === 'incidencias';
  const enSolicitudes = location.pathname.endsWith('/solicitudes') || vistaFija === 'solicitudesEntradas';
  const eventoIdDesdeState = eventoIdFijo || location.state?.eventoId || '';
  // Se llegó desde Gestión de Eventos (accesos rápidos de un evento): la salida
  // es "volver al evento", no el dashboard ni el selector de eventos.
  const vieneDeEvento = !!eventoIdDesdeState && (enReportes || enSolicitudes);
  // Reportes desde el menú lateral (sin evento fijo): vista GLOBAL — lista todos
  // los reportes de todos los eventos, sin selector ni botones de navegación.
  const reportesGlobal = enReportes && !eventoIdFijo && !location.state?.eventoId;

  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [eventoId, setEventoId] = useState(eventoIdDesdeState);
  // En modo solo lectura (ej. Cliente) también se salta la selección si ya tiene un evento
  // asignado, para que vea su proyecto directamente en vez de una pantalla vacía.
  const [eventoSeleccionado, setEventoSeleccionado] = useState(enReportes || enSolicitudes || !!eventoIdDesdeState);
  const [vistaDetalle, setVistaDetalle] = useState(enSolicitudes ? 'solicitudesEntradas' : null); // null | entradas | recargadores | devoluciones | negocios | supervisores | incidencias | solicitudesEntradas
  const [itemSeleccionado, setItemSeleccionado] = useState(null); // id de la persona/negocio abierto dentro de una vista
  const [busqueda, setBusqueda] = useState('');
  const [filtroEntradas, setFiltroEntradas] = useState(null); // null (todas) | ingresado | pendiente | salio

  const vistaActual = enReportes ? 'incidencias' : vistaDetalle;
  const mostrarSelectorEventos = !eventoSeleccionado && !enReportes && !enSolicitudes;

  // --- Botón "atrás" del navegador dentro del panel del evento ---
  // Las sub-vistas (Detalle de Participantes, Recargadores, ítem abierto, …) son
  // estado interno del componente, no rutas: sin esto, "atrás" salta fuera de
  // /admin (a la última página real: el menú lateral, Reportes, etc.). Apilamos
  // una entrada de historial por cada sub-nivel abierto y la consumimos en
  // popstate, de modo que "atrás" recorra ítem -> lista -> dashboard -> salir.
  const nivelesHistorialRef = useRef(0);   // entradas apiladas aún vivas
  const ignorarPopRef = useRef(0);          // popstates que disparamos nosotros y no hay que procesar
  const navRef = useRef({});
  navRef.current = { vistaDetalle, itemSeleccionado, enReportes, enSolicitudes };

  const apilarNivel = () => {
    if (embebido) return;
    nivelesHistorialRef.current += 1;
    window.history.pushState({ qpAdminNivel: true }, '');
  };

  useEffect(() => {
    if (embebido) return undefined;
    const alRetroceder = () => {
      if (ignorarPopRef.current > 0) { ignorarPopRef.current -= 1; return; }
      const s = navRef.current;
      if (s.itemSeleccionado != null) {
        setItemSeleccionado(null);
        nivelesHistorialRef.current = Math.max(0, nivelesHistorialRef.current - 1);
      } else if (s.vistaDetalle != null && !s.enReportes && !s.enSolicitudes) {
        setVistaDetalle(null);
        setFiltroEntradas(null);
        setBusqueda('');
        nivelesHistorialRef.current = Math.max(0, nivelesHistorialRef.current - 1);
      }
    };
    window.addEventListener('popstate', alRetroceder);
    return () => window.removeEventListener('popstate', alRetroceder);
  }, [embebido]);

  // Desapila (sin re-procesar) las entradas que agregamos, para que tras volver
  // por la UI el botón "atrás" del navegador no quede con pasos muertos.
  const desapilarNiveles = (cuantos = nivelesHistorialRef.current) => {
    const n = Math.min(cuantos, nivelesHistorialRef.current);
    if (n <= 0) return;
    nivelesHistorialRef.current -= n;
    ignorarPopRef.current += 1;
    window.history.go(-n);
  };
  const eventosSelectorFiltrados = useMemo(
    () => filtrarEventos(eventosDisponibles, busquedaEvento, filtroEvento),
    [eventosDisponibles, busquedaEvento, filtroEvento],
  );

  useEffect(() => {
    if (embebido || reportesGlobal) return; // evento fijo/no aplica: no hace falta la lista
    // soloLectura es siempre el Cliente viendo (filtrado por eventosPermitidos) el estado de
    // SU evento — no tiene el rol Admin, así que usa el listado público (solo publicados) y
    // no el de Admin (que exige ese rol). El propio Admin en su panel sí ve los borradores.
    const listado = soloLectura ? api.eventos.listar() : api.eventos.listarTodos();
    listado.then(todos => {
      const disponibles = eventosPermitidos ? todos.filter(ev => eventosPermitidos.includes(ev.id)) : todos;
      setEventosDisponibles(disponibles);
      setEventoId(prev => prev || disponibles[0]?.id || '');
      if (soloLectura && disponibles.length > 0) setEventoSeleccionado(true);
    });
  }, [eventosPermitidos, soloLectura, embebido, reportesGlobal]);

  // Apartado "Reportes": sub-pestaña activa, buscador y filtro por estado (compartidos).
  const [tabReporte, setTabReporte] = useState('incidencias'); // 'incidencias' | 'datos'
  const [busquedaReporte, setBusquedaReporte] = useState('');
  const [filtroEstadoReporte, setFiltroEstadoReporte] = useState('pendiente'); // 'pendiente' | 'resuelto' | 'todos'
  // Caso abierto en modal para resolver / corregir (el objeto completo, no solo el id).
  const [incidenciaModal, setIncidenciaModal] = useState(null);
  const [reporteDatoModal, setReporteDatoModal] = useState(null);
  const [montoAjuste, setMontoAjuste] = useState('');

  // Carga del dashboard del evento (11 llamadas en paralelo) con estados
  // cargando/error/reintentar (Manual 8.9). useApi (useReducer) evita el
  // react-hooks/set-state-in-effect que daría un cargarDatosEvento() suelto.
  const cargarDatosEvento = useCallback(async () => {
    // Reportes GLOBAL (menú lateral): todos los reportes de todos los eventos.
    if (reportesGlobal) {
      const [incidenciasR, reportesR] = await Promise.all([
        api.incidencias.listar({}),
        api.reportesEntrada.listar({}),
      ]);
      return {
        incidencias: incidenciasR,
        reportesEntradas: reportesR,
        solicitudes: [],
        datos: EVENTO_ACTIVIDAD_VACIA,
      };
    }
    // Pestaña embebida: solo se cargan los datos de esa vista, no el dashboard entero.
    if (vistaFija === 'solicitudesEntradas') {
      const [comprasR, reportesR] = await Promise.all([
        api.compras.listar({ eventoId }),
        api.reportesEntrada.listar({ eventoId }),
      ]);
      return {
        incidencias: [],
        reportesEntradas: reportesR,
        solicitudes: comprasR,
        datos: EVENTO_ACTIVIDAD_VACIA,
      };
    }
    if (vistaFija === 'incidencias') {
      const [incidenciasR, reportesR] = await Promise.all([
        api.incidencias.listar({ eventoId }),
        api.reportesEntrada.listar({ eventoId }),
      ]);
      return {
        incidencias: incidenciasR,
        reportesEntradas: reportesR,
        solicitudes: [],
        datos: EVENTO_ACTIVIDAD_VACIA,
      };
    }
    const [entradas, incidenciasR, reportesR, comprasR, recargasR, devolucionesR, ventasR, puestosR, asignacionesR, usuariosR] = await Promise.all([
      api.entradas.listar({ eventoId }),
      api.incidencias.listar({ eventoId }),
      api.reportesEntrada.listar({ eventoId }),
      api.compras.listar({ eventoId }),
      api.transacciones.listar({ eventoId, tipo: 'recarga' }),
      api.transacciones.listar({ eventoId, tipo: 'devolucion' }),
      api.ventas.listar({ eventoId }),
      api.puestos.listar({ eventoId }),
      api.asignaciones.listar({ eventoId }),
      api.usuarios.listar(),
    ]);
    const usuariosPorId = new Map(usuariosR.map(u => [u.id, u]));
    const staffDe = (rol) => asignacionesR.filter(a => a.rol === rol).map(a => a.usuario);
    return {
      incidencias: incidenciasR,
      reportesEntradas: reportesR,
      solicitudes: comprasR,
      datos: {
        entradas,
        recargadores: agruparPorOperador(recargasR, staffDe('Recargador'), 'recargas'),
        devoluciones: agruparPorOperador(devolucionesR, staffDe('Devolucion'), 'retiros'),
        negocios: agruparVentasPorNegocio(ventasR, puestosR, usuariosPorId),
        supervisores: staffDe('Supervisor'),
      },
    };
  }, [eventoId, vistaFija, reportesGlobal]);
  const {
    data: dash,
    setData: setDash,
    cargando: cargandoDash,
    error: errorDash,
    recargar: recargarDash,
  } = useApi(cargarDatosEvento, {
    inicial: { incidencias: [], reportesEntradas: [], solicitudes: [], datos: EVENTO_ACTIVIDAD_VACIA },
    activo: !!eventoId || reportesGlobal,
  });
  const { incidencias, reportesEntradas, solicitudes, datos } = dash;
  // Helpers para conservar las actualizaciones optimistas y los refetch parciales.
  const setIncidencias = (v) => setDash(d => ({ ...d, incidencias: typeof v === 'function' ? v(d.incidencias) : v }));
  const setReportesEntradas = (v) => setDash(d => ({ ...d, reportesEntradas: typeof v === 'function' ? v(d.reportesEntradas) : v }));
  const setSolicitudes = (v) => setDash(d => ({ ...d, solicitudes: typeof v === 'function' ? v(d.solicitudes) : v }));

  const incidenciasPendientes = useMemo(
    () => incidencias.filter(i => i.estado === 'pendiente'),
    [incidencias]
  );

  const abrirResolucion = (incidencia) => {
    setIncidenciaModal(incidencia);
    // Sugerencia: ajuste = lo que pagó - lo que se le cargó. Negativo si se le
    // cargó de más (hay que descontar), positivo si le faltó (hay que acreditar).
    const sugerido = incidencia.montoSolicitado != null
      ? Number(incidencia.montoSolicitado) - Number(incidencia.montoEntregado)
      : '';
    setMontoAjuste(sugerido === '' ? '' : String(sugerido));
  };

  const cerrarResolucion = () => {
    setIncidenciaModal(null);
    setMontoAjuste('');
  };

  const confirmarAjuste = async () => {
    const incidencia = incidenciaModal;
    const valor = Number(montoAjuste);
    if (!incidencia || montoAjuste === '' || Number.isNaN(valor)) return;

    await api.incidencias.resolver(incidencia.id, valor);
    setIncidencias(await api.incidencias.listar(reportesGlobal ? {} : { eventoId }));
    cerrarResolucion();
  };

  // --- SOLICITUDES DE COMPRA DE ENTRADAS Y REPORTES DE DATOS ---
  const [solicitudAbierta, setSolicitudAbierta] = useState(null);
  const [filtroSolicitudes, setFiltroSolicitudes] = useState('pendiente'); // pendiente (por defecto) | confirmado | rechazado | todos
  const [valorCorreccion, setValorCorreccion] = useState('');

  // --- ANULAR VENTA (§5.3) ---
  const [ventaAnular, setVentaAnular] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulandoVenta, setAnulandoVenta] = useState(false);
  const [errAnularVenta, setErrAnularVenta] = useState('');
  const confirmarAnularVenta = async () => {
    if (motivoAnular.trim().length < 3) return;
    setAnulandoVenta(true);
    setErrAnularVenta('');
    try {
      await api.ventas.anular(ventaAnular.id, motivoAnular.trim());
      setVentaAnular(null);
      setMotivoAnular('');
      await recargarDash();
    } catch (e) {
      setErrAnularVenta(e.message);
    } finally {
      setAnulandoVenta(false);
    }
  };

  const totalEntradasCompradas = useMemo(
    () => solicitudes.reduce((suma, c) => suma + c.entradas.length, 0),
    [solicitudes]
  );
  const reportesEntradasPendientes = useMemo(
    () => reportesEntradas.filter(r => r.estado === 'pendiente'),
    [reportesEntradas]
  );
  // `solicitudes` trae TODAS las compras del evento (pendientes, aprobadas y
  // rechazadas) — la alerta de "necesita tu atención" es solo sobre las que
  // todavía no se resolvieron.
  const solicitudesPendientes = useMemo(
    () => solicitudes.filter(c => c.estado === 'pendiente'),
    [solicitudes]
  );

  const solicitudesFiltradas = useMemo(
    () => filtroSolicitudes === 'todos' ? solicitudes : solicitudes.filter(c => c.estado === filtroSolicitudes),
    [solicitudes, filtroSolicitudes]
  );
  const compraAbierta = useMemo(
    () => solicitudes.find(c => c.id === solicitudAbierta) || null,
    [solicitudes, solicitudAbierta]
  );

  const toggleSolicitud = (id) => setSolicitudAbierta(prev => prev === id ? null : id);

  // No hay envío de correo real: las contraseñas de las cuentas nuevas (invitados sin cuenta
  // previa) solo se ven una vez, en la respuesta de esta llamada — hay que compartirlas a mano.
  const [passwordsAMostrar, setPasswordsAMostrar] = useState(null);
  const [confirmar, DialogoConfirmar] = useConfirmar();


  const aprobarSolicitud = async (compra) => {
    const { passwordsGeneradas, ...actualizada } = await api.compras.aprobar(compra.id);
    setSolicitudes(prev => prev.map(c => c.id === actualizada.id ? actualizada : c));
    if (Object.keys(passwordsGeneradas || {}).length > 0) {
      const entradasPorId = new Map(actualizada.entradas.map(e => [e.id, e]));
      setPasswordsAMostrar(Object.entries(passwordsGeneradas).map(([entradaId, password]) => ({
        nombre: entradasPorId.get(entradaId)?.nombre,
        correo: entradasPorId.get(entradaId)?.correo,
        numero: entradasPorId.get(entradaId)?.numero,
        password,
      })));
    }
  };

  const rechazarSolicitudCompra = async (compra) => {
    const motivo = await confirmar({
      titulo: '¿Rechazar la solicitud?',
      mensaje: `Se rechazará la solicitud de ${compra.comprador.nombre}. El comprador verá el motivo.`,
      campoNota: { etiqueta: 'Motivo del rechazo', placeholder: 'Ej. el comprobante de pago no es legible', requerido: true },
      textoConfirmar: 'Rechazar solicitud',
      peligroso: true,
    });
    if (motivo === null) return;
    const actualizada = await api.compras.rechazar(compra.id, motivo);
    setSolicitudes(prev => prev.map(c => c.id === actualizada.id ? actualizada : c));
  };

  const abrirCorreccion = (reporte) => {
    setReporteDatoModal(reporte);
    const valorActual = reporte.campo === 'nombre' ? reporte.entrada.nombre
      : reporte.campo === 'correo' ? reporte.entrada.correo
      : reporte.entrada.celular;
    setValorCorreccion(valorActual || '');
  };

  const cerrarCorreccion = () => {
    setReporteDatoModal(null);
    setValorCorreccion('');
  };

  const guardarCorreccion = async () => {
    if (!reporteDatoModal || !valorCorreccion.trim()) return;
    await api.reportesEntrada.corregir(reporteDatoModal.id, valorCorreccion.trim());
    await recargarDash();
    cerrarCorreccion();
  };

  // Buscador + filtro por estado del apartado Reportes (aplica a las dos sub-tablas).
  const filtroCoincideEstado = (estado) =>
    filtroEstadoReporte === 'todos' ||
    (filtroEstadoReporte === 'pendiente' ? estado === 'pendiente' : estado !== 'pendiente');

  const incidenciasFiltradas = useMemo(() => {
    const q = busquedaReporte.trim().toLowerCase();
    return incidencias.filter(i =>
      filtroCoincideEstado(i.estado) &&
      (!q ||
        `${i.entrada?.nombre || ''} ${ciDeEntrada(i.entrada) || ''} ${i.recargador?.nombre || ''} ${i.evento?.nombre || ''}`
          .toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidencias, busquedaReporte, filtroEstadoReporte]);

  const reportesEntradasFiltrados = useMemo(() => {
    const q = busquedaReporte.trim().toLowerCase();
    return reportesEntradas.filter(r =>
      filtroCoincideEstado(r.estado) &&
      (!q ||
        `${r.entrada?.nombre || ''} ${r.entrada?.compra?.comprador?.nombre || ''} ${r.evento?.nombre || ''}`
          .toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportesEntradas, busquedaReporte, filtroEstadoReporte]);

  const hayFiltroReporte = busquedaReporte.trim() !== '' || filtroEstadoReporte !== 'pendiente';

  const eventoActual = eventosDisponibles.find(ev => ev.id === eventoId);

  const statsEntradas = useMemo(() => {
    const total = datos.entradas.length;
    const dentro = datos.entradas.filter(p => p.estadoIngreso === 'ingresado').length;
    const salieron = datos.entradas.filter(p => p.estadoIngreso === 'salio').length;
    const ingresaron = dentro + salieron;
    const faltan = total - ingresaron;
    const pctIngresaron = total ? Math.round((ingresaron / total) * 1000) / 10 : 0;
    const pctFaltan = total ? Math.round((faltan / total) * 1000) / 10 : 0;
    return { total, ingresaron, faltan, dentro, salieron, pctIngresaron, pctFaltan };
  }, [datos]);

  const totalAyudantes = useMemo(
    () => datos.negocios.reduce((suma, n) => suma + n.ayudantes, 0),
    [datos]
  );

  // Totales derivados de las transacciones reales (no números sueltos)
  const recargadoresOrdenados = useMemo(
    () => [...datos.recargadores]
      .map(r => ({ ...r, totalRecargado: sumar(r.recargas, 'monto') }))
      .sort((a, b) => b.totalRecargado - a.totalRecargado),
    [datos]
  );
  const devolucionesOrdenadas = useMemo(
    () => [...datos.devoluciones]
      .map(d => ({ ...d, totalDevuelto: sumar(d.retiros, 'monto') }))
      .sort((a, b) => b.totalDevuelto - a.totalDevuelto),
    [datos]
  );
  const negociosOrdenados = useMemo(
    () => [...datos.negocios]
      .map(n => ({ ...n, ventasTotal: sumar(n.ventas.filter(v => !v.anulada), 'monto') }))
      .sort((a, b) => b.ventasTotal - a.ventasTotal),
    [datos]
  );

  // --- ESTADÍSTICAS DE VENTAS (solo ventas no anuladas) ---
  // Productos del evento, producto estrella de cada negocio, ranking de
  // ayudantes y cuánto compra cada cliente, todo desde los items de cada venta.
  const estadisticasVentas = useMemo(() => {
    const productos = new Map();   // nombre -> { nombre, unidades, ingresos, negocios:Set }
    const ayudantes = new Map();   // id -> { id, nombre, negocio, puestos:Set, ventas, unidades, total, productos:Map }
    const clientes = new Map();    // id -> { id, nombre, documento, compras, unidades, total, ventas[] }
    const estrellas = [];          // una fila por negocio
    let unidadesTotales = 0;

    datos.negocios.forEach(n => {
      const prodNegocio = new Map();
      let unidadesNegocio = 0;
      n.ventas.filter(v => !v.anulada).forEach(v => {
        const a = ayudantes.get(v.ayudanteId) || {
          id: v.ayudanteId, nombre: v.ayudante, negocio: n.nombre,
          puestos: new Set(), ventas: 0, unidades: 0, total: 0, productos: new Map(),
        };
        a.puestos.add(v.puesto);
        a.ventas += 1;
        a.total += v.monto;
        ayudantes.set(v.ayudanteId, a);

        const c = clientes.get(v.clienteId) || {
          id: v.clienteId, nombre: v.cliente, documento: v.documento,
          compras: 0, unidades: 0, total: 0, ventas: [],
        };
        c.compras += 1;
        c.total += v.monto;
        c.ventas.push({ ...v, negocio: n.nombre });
        clientes.set(v.clienteId, c);

        v.items.forEach(i => {
          const cant = Number(i.cantidad);
          const linea = cant * Number(i.precioUnitario);
          unidadesTotales += cant;
          unidadesNegocio += cant;
          a.unidades += cant;
          c.unidades += cant;
          a.productos.set(i.nombreProducto, (a.productos.get(i.nombreProducto) || 0) + cant);
          prodNegocio.set(i.nombreProducto, (prodNegocio.get(i.nombreProducto) || 0) + cant);
          const p = productos.get(i.nombreProducto) || { nombre: i.nombreProducto, unidades: 0, ingresos: 0, negocios: new Set() };
          p.unidades += cant;
          p.ingresos += linea;
          p.negocios.add(n.nombre);
          productos.set(i.nombreProducto, p);
        });
      });
      const [top, topUnidades] = [...prodNegocio.entries()].sort((x, y) => y[1] - x[1])[0] || [null, 0];
      estrellas.push({
        id: n.id,
        negocio: n.nombre,
        producto: top,
        unidades: topUnidades,
        unidadesNegocio,
        pct: unidadesNegocio ? Math.round((topUnidades / unidadesNegocio) * 1000) / 10 : 0,
        productosDistintos: prodNegocio.size,
      });
    });

    const masVendido = (m) => [...m.entries()].sort((x, y) => y[1] - x[1])[0];
    return {
      unidadesTotales,
      productos: [...productos.values()]
        .map(p => ({ ...p, negocios: [...p.negocios].join(', '), ingresos: Math.round(p.ingresos) }))
        .sort((a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos),
      estrellas: estrellas.sort((a, b) => b.unidades - a.unidades),
      ayudantes: [...ayudantes.values()]
        .map(a => {
          const [prod, cant] = masVendido(a.productos) || [null, 0];
          return {
            id: a.id, nombre: a.nombre, negocio: a.negocio, puestos: [...a.puestos].join(', '),
            ventas: a.ventas, unidades: a.unidades, total: a.total, productoTop: prod, productoTopUnidades: cant,
          };
        })
        .sort((a, b) => b.total - a.total),
      clientes: [...clientes.values()].sort((a, b) => b.total - a.total),
    };
  }, [datos]);

  const topClientesOrdenados = estadisticasVentas.clientes;
  const [clienteAbierto, setClienteAbierto] = useState(null);
  const [ventaDetalle, setVentaDetalle] = useState(null);

  // --- RESUMEN FINANCIERO GENERAL (para que el dashboard no se vea vacío) ---
  const totalRecargadoEvento = useMemo(() => sumar(recargadoresOrdenados, 'totalRecargado'), [recargadoresOrdenados]);
  const totalDevueltoEvento = useMemo(() => sumar(devolucionesOrdenadas, 'totalDevuelto'), [devolucionesOrdenadas]);
  const totalConsumoClientes = useMemo(() => sumar(negociosOrdenados, 'ventasTotal'), [negociosOrdenados]);

  // Recargas vs. consumos por hora (Manual §17: "barras apiladas por hora").
  // `hora` ya viene formateada "HH:mm" (helper `hora()`); se agrupa por la hora
  // en punto. Las fiestas cruzan medianoche, así que las horas de madrugada
  // (00-11) se ordenan COMO SI fueran continuación de la noche anterior.
  const actividadPorHora = useMemo(() => {
    const claveOrden = (h) => (h < 12 ? h + 24 : h);
    const porHora = new Map(); // 'HH' -> { hora, recargas, consumos }
    const upsert = (hh) => {
      if (!porHora.has(hh)) porHora.set(hh, { hora: `${hh}:00`, recargas: 0, consumos: 0 });
      return porHora.get(hh);
    };
    datos.recargadores.forEach(r => r.recargas.forEach(t => {
      upsert(t.hora.slice(0, 2)).recargas += t.monto;
    }));
    datos.negocios.forEach(n => n.ventas.filter(v => !v.anulada).forEach(v => {
      upsert(v.hora.slice(0, 2)).consumos += v.monto;
    }));
    return [...porHora.values()]
      .sort((a, b) => claveOrden(Number(a.hora)) - claveOrden(Number(b.hora)))
      .map(p => ({ ...p, recargas: Math.round(p.recargas), consumos: Math.round(p.consumos) }));
  }, [datos]);

  // Ingresos por categoría de entrada: plata REAL (Bs, precio de venta), no
  // puntos — nunca se mezcla con el gráfico de arriba (dos monedas distintas).
  const ingresosPorCategoria = useMemo(() => {
    const porCategoria = new Map();
    datos.entradas.forEach(e => {
      const nombre = e.categoriaTicket?.nombre || 'Sin categoría';
      const precio = Number(e.categoriaTicket?.precio || 0);
      if (!porCategoria.has(nombre)) porCategoria.set(nombre, { nombre, entradas: 0, ingresos: 0 });
      const c = porCategoria.get(nombre);
      c.entradas += 1;
      c.ingresos += precio;
    });
    return [...porCategoria.values()].sort((a, b) => b.ingresos - a.ingresos);
  }, [datos]);

  // Actividad del evento: TODOS los movimientos (recargas, devoluciones,
  // ventas) con quién lo hizo, a quién, dónde y qué. Ordenado por fecha real
  // (antes se ordenaba por "HH:mm" y cruzaba mal la medianoche).
  const actividad = useMemo(() => {
    const filas = [];
    datos.recargadores.forEach(r => r.recargas.forEach(t => filas.push({
      key: `r-${t.id}`, tipo: 'recarga', fecha: t.fecha, operador: r.nombre, rolOperador: 'Recargador',
      participante: t.participante, documento: t.documento, monto: t.monto, saldo: t.saldo, nota: t.nota,
    })));
    datos.devoluciones.forEach(d => d.retiros.forEach(t => filas.push({
      key: `d-${t.id}`, tipo: 'devolucion', fecha: t.fecha, operador: d.nombre, rolOperador: 'Devolución',
      participante: t.participante, documento: t.documento, monto: t.monto, saldo: t.saldo,
      nota: t.nota, motivo: t.motivo, esNegocio: t.esNegocio,
    })));
    datos.negocios.forEach(n => n.ventas.forEach(v => filas.push({
      key: `v-${v.id}`, tipo: 'venta', fecha: v.fecha, operador: v.ayudante, rolOperador: 'Ayudante',
      participante: v.cliente, documento: v.documento, monto: v.monto,
      negocio: n.nombre, puesto: v.puesto, items: v.items, anulada: v.anulada, venta: { ...v, negocio: n.nombre },
    })));
    return filas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [datos]);

  const [filtroActividad, setFiltroActividad] = useState('todos');
  const [busquedaActividad, setBusquedaActividad] = useState('');
  const filtrosActividad = useMemo(() => {
    const cuenta = (t) => actividad.filter(a => a.tipo === t).length;
    return [
      { valor: 'todos', texto: 'Todos', conteo: actividad.length },
      { valor: 'recarga', texto: 'Recargas', conteo: cuenta('recarga') },
      { valor: 'venta', texto: 'Ventas', conteo: cuenta('venta') },
      { valor: 'devolucion', texto: 'Devoluciones', conteo: cuenta('devolucion') },
      { valor: 'anulada', texto: 'Anuladas', conteo: actividad.filter(a => a.anulada).length },
    ];
  }, [actividad]);
  const actividadFiltrada = useMemo(() => {
    const q = busquedaActividad.trim().toLowerCase();
    return actividad.filter(a =>
      (filtroActividad === 'todos' ||
        (filtroActividad === 'anulada' ? a.anulada : a.tipo === filtroActividad)) &&
      (!q || [a.operador, a.participante, a.documento, a.negocio, a.puesto, a.nota,
        ...(a.items || []).map(i => i.nombreProducto)]
        .filter(Boolean).join(' ').toLowerCase().includes(q)),
    );
  }, [actividad, filtroActividad, busquedaActividad]);

  const iconoActividad = {
    recarga: <FaCoins color="var(--verde-recarga-texto)" />,
    devolucion: <FaBoxOpen color="var(--ambar-aviso-texto)" />,
    venta: <FaShoppingBag color="var(--coral-compra)" />,
    ingreso: <FaUserCheck color="var(--cian-digital-texto)" />,
  };

  const entradasFiltradas = useMemo(() => {
    return datos.entradas
      .filter(p => {
        if (filtroEntradas === 'ingresado') return p.estadoIngreso === 'ingresado' || p.estadoIngreso === 'salio';
        if (filtroEntradas === 'dentro') return p.estadoIngreso === 'ingresado';
        if (filtroEntradas === 'pendiente') return p.estadoIngreso === 'pendiente';
        if (filtroEntradas === 'salio') return p.estadoIngreso === 'salio';
        return true;
      })
      .filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (ciDeEntrada(p) || '').toLowerCase().includes(busqueda.toLowerCase())
      );
  }, [datos, busqueda, filtroEntradas]);

  const tituloEntradasFiltro = {
    ingresado: 'Ya Ingresaron',
    dentro: 'Están Dentro',
    pendiente: 'Faltan por Ingresar',
    salio: 'Ya Salieron',
  }[filtroEntradas] || 'Detalle de Participantes';

  const abrirDetalle = (vista, filtro = null) => {
    setBusqueda('');
    setItemSeleccionado(null);
    setVistaDetalle(vista);
    setFiltroEntradas(filtro);
    // La vista de "Reportes" agrupa incidencias de recarga y reportes de datos de entradas.
    if (vista === 'incidencias') {
      api.incidencias.listar({ eventoId }).then(setIncidencias);
      api.reportesEntrada.listar({ eventoId }).then(setReportesEntradas);
      cerrarCorreccion();
      cerrarResolucion();
    }
    // Refrescamos por si hay solicitudes nuevas de Usuario Normal.
    if (vista === 'solicitudesEntradas') {
      api.compras.listar({ eventoId }).then(setSolicitudes);
      setSolicitudAbierta(null);
    }
    apilarNivel();
  };

  // Abrir el detalle de una persona/negocio dentro de una vista (otro sub-nivel).
  const abrirItem = (id) => {
    setItemSeleccionado(id);
    apilarNivel();
  };

  const volver = () => {
    setBusqueda('');
    setItemSeleccionado(null);
    setVistaDetalle(null);
    setFiltroEntradas(null);
    // Si se entró directo por /admin/reportes o /admin/solicitudes, "volver" regresa al dashboard real.
    if (enReportes || enSolicitudes) { navigate('/admin'); return; }
    desapilarNiveles();
  };

  const seleccionarEvento = (id) => {
    setEventoId(id);
    setEventoSeleccionado(true);
    volver();
  };

  const volverASeleccionEvento = () => {
    volver();
    setEventoSeleccionado(false);
  };

  const volverAlEvento = () => navigate('/admin/eventos', { state: { eventoId: eventoIdDesdeState } });

  const volverALaLista = () => {
    setItemSeleccionado(null);
    desapilarNiveles(1);
  };

  // Ruta de migas del panel: reemplaza los dos botones "Cambiar de evento" +
  // "Volver al dashboard" apilados por una sola línea Eventos › Evento › Vista › Ítem.
  const tituloVista = {
    entradas: tituloEntradasFiltro,
    recargadores: 'Recargadores',
    devoluciones: 'Encargados de Devolución',
    negocios: 'Usuarios Negocio',
    supervisores: 'Supervisores',
    incidencias: 'Reportes',
    solicitudesEntradas: 'Solicitudes de Entradas',
  }[vistaActual];

  const recargadorAbierto = vistaActual === 'recargadores' && itemSeleccionado
    ? recargadoresOrdenados.find(r => r.id === itemSeleccionado) : null;
  const devolucionAbierta = vistaActual === 'devoluciones' && itemSeleccionado
    ? devolucionesOrdenadas.find(d => d.id === itemSeleccionado) : null;
  const negocioAbierto = vistaActual === 'negocios' && itemSeleccionado
    ? negociosOrdenados.find(n => n.id === itemSeleccionado) : null;

  const itemAbiertoNombre = recargadorAbierto?.nombre || devolucionAbierta?.nombre || negocioAbierto?.nombre || null;

  const migas = [];
  if (!embebido && !reportesGlobal && !mostrarSelectorEventos && eventoActual) {
    migas.push({
      texto: vieneDeEvento ? 'Evento' : 'Eventos',
      onClick: vieneDeEvento ? volverAlEvento : volverASeleccionEvento,
    });
    const enDetalle = vistaActual !== null;
    migas.push({
      texto: eventoActual.nombre,
      // "Volver al dashboard" solo aplica cuando el panel general existe (no en las
      // rutas directas /admin/reportes y /admin/solicitudes).
      onClick: enDetalle && !enReportes && !enSolicitudes ? volver : undefined,
      actual: !enDetalle,
    });
    if (enDetalle) {
      if (itemAbiertoNombre) {
        migas.push({ texto: tituloVista, onClick: volverALaLista });
        migas.push({ texto: itemAbiertoNombre, actual: true });
      } else {
        migas.push({ texto: tituloVista, actual: true });
      }
    }
  }

  return (
    <div className="pi-dash-container">

      {!embebido && (
        <div className="pi-dash-header">
          {reportesGlobal ? (
            <h1>Reportes de todos los eventos</h1>
          ) : mostrarSelectorEventos ? (
            <h1>Selecciona un evento</h1>
          ) : (
            <div className="pi-dash-header-titulo">
              <nav className="pi-dash-crumbs" aria-label="Ubicación">
                {migas.map((m, i) => (
                  <span className="pi-dash-crumb-item" key={i}>
                    {i > 0 && <FaChevronRight className="pi-dash-crumb-sep" aria-hidden="true" />}
                    {m.onClick && !m.actual ? (
                      <button type="button" className="pi-dash-crumb" onClick={m.onClick}>{m.texto}</button>
                    ) : (
                      <span
                        className={`pi-dash-crumb${m.actual ? ' is-current' : ''}`}
                        aria-current={m.actual ? 'page' : undefined}
                      >
                        {m.texto}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
              <h1>{itemAbiertoNombre || tituloVista || eventoActual?.nombre}</h1>
            </div>
          )}
        </div>
      )}

      {mostrarSelectorEventos ? (
        <section className="pi-dash-seccion">
          {eventosDisponibles.length === 0 ? (
            <p className="pi-dash-sin-resultados">
              {soloLectura ? 'Todavía no tienes eventos asignados.' : 'No hay eventos disponibles.'}
            </p>
          ) : (
            <>
              <Buscador
                valor={busquedaEvento}
                onCambio={setBusquedaEvento}
                placeholder="Buscar evento por nombre o lugar…"
                etiqueta="Buscar evento"
                filtros={FILTROS_ESTADO_EVENTO}
                filtroActivo={filtroEvento}
                onFiltro={setFiltroEvento}
                etiquetaFiltros="Filtrar eventos por estado"
              />
              <GrillaEventos eventos={eventosSelectorFiltrados} gridClassName="pi-dash-eventos-grid">
                {ev => (
                    <EventoCard
                      key={ev.id}
                      evento={ev}
                      onClick={() => seleccionarEvento(ev.id)}
                      cta="Ver panel"
                    />
                )}
              </GrillaEventos>
            </>
          )}
        </section>
      ) : errorDash ? (
        <section className="pi-dash-seccion">
          <EstadoError onReintentar={recargarDash} />
        </section>
      ) : cargandoDash ? (
        <section className="pi-dash-seccion"><EstadoCarga filas={6} /></section>
      ) : (
        <>

      {/* ================= VISTA GENERAL ================= */}
      {vistaActual === null && (
        <>
          {/* --- NECESITA TU ATENCIÓN: separado del resto para que lo accionable no se
              pierda entre las cifras informativas de "Personal del Evento". Solo
              aparece si hay algo pendiente — un evento sin pendientes no muestra
              una sección de alertas vacía. --- */}
          {(incidenciasPendientes.length + reportesEntradasPendientes.length + solicitudesPendientes.length) > 0 && (
            <section className="pi-dash-alertas">
              <h3 className="pi-dash-alertas-titulo"><FaExclamationTriangle aria-hidden="true" /> Necesita tu atención</h3>
              <div className="pi-dash-alertas-grid">
                {(incidenciasPendientes.length + reportesEntradasPendientes.length) > 0 && (
                  <button type="button" className="pi-dash-alerta-card" onClick={() => abrirDetalle('incidencias')}>
                    <span className="pi-dash-alerta-numero">{incidenciasPendientes.length + reportesEntradasPendientes.length}</span>
                    <span className="pi-dash-alerta-label">Reportes pendientes</span>
                    <FaChevronRight className="pi-dash-alerta-flecha" aria-hidden="true" />
                  </button>
                )}
                {solicitudesPendientes.length > 0 && (
                  <button type="button" className="pi-dash-alerta-card" onClick={() => abrirDetalle('solicitudesEntradas')}>
                    <span className="pi-dash-alerta-numero">{solicitudesPendientes.length}</span>
                    <span className="pi-dash-alerta-label">Solicitudes de entrada por revisar</span>
                    <FaChevronRight className="pi-dash-alerta-flecha" aria-hidden="true" />
                  </button>
                )}
              </div>
            </section>
          )}

          {/* --- RESUMEN FINANCIERO --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo">Resumen Financiero del Evento</h3>
            <div className="pi-dash-resumen-grid">
              <StatCard icon={<FaCoins />} tono="ok" valor={`${totalRecargadoEvento} pts`} label="Total Recargado" />
              <StatCard icon={<FaBoxOpen />} tono="warn" valor={`${totalDevueltoEvento} pts`} label="Total Devuelto" />
              <StatCard icon={<FaShoppingBag />} valor={`${totalConsumoClientes} pts`} label="Consumido por Clientes (total de totales)" />
              <StatCard icon={<FaWallet />} tono="total" valor={`${totalRecargadoEvento - totalDevueltoEvento - totalConsumoClientes} pts`} label="Saldo en Circulación" />
            </div>
            <div className="pi-adg-graficos-grid">
              <GraficoActividadPorHora puntos={actividadPorHora} />
              <GraficoIngresosPorCategoria filas={ingresosPorCategoria} />
            </div>
          </section>

          {/* --- ESTADÍSTICAS DE VENTAS (negocios, productos, ayudantes, clientes) --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo"><FaChartPie aria-hidden="true" /> Estadísticas de ventas</h3>
            <div className="pi-dash-resumen-grid">
              <StatCard
                icon={<FaTrophy />} tono="total"
                valor={negociosOrdenados[0]?.nombre || '—'}
                label="Negocio que más vende"
                nota={negociosOrdenados[0] ? `${negociosOrdenados[0].ventasTotal} pts` : null}
                onClick={() => abrirDetalle('negocios')}
              />
              <StatCard
                icon={<FaBoxes />} tono="info"
                valor={estadisticasVentas.productos[0]?.nombre || '—'}
                label="Producto más vendido"
                nota={estadisticasVentas.productos[0] ? `${estadisticasVentas.productos[0].unidades} unidades` : null}
              />
              <StatCard
                icon={<FaMedal />} tono="ok"
                valor={estadisticasVentas.ayudantes[0]?.nombre || '—'}
                label="Ayudante que más vende"
                nota={estadisticasVentas.ayudantes[0]
                  ? `${estadisticasVentas.ayudantes[0].negocio} · ${estadisticasVentas.ayudantes[0].total} pts`
                  : null}
              />
              <StatCard
                icon={<FaShoppingBag />}
                valor={estadisticasVentas.unidadesTotales}
                label="Unidades vendidas"
                nota={`${estadisticasVentas.clientes.length} clientes compraron`}
              />
            </div>

            <div className="pi-adg-graficos-grid">
              <GraficoVentasPorNegocio
                filas={negociosOrdenados.map(n => ({ nombre: n.nombre, total: n.ventasTotal, ventas: n.ventas.filter(v => !v.anulada).length }))}
              />
              <GraficoProductosMasVendidos filas={estadisticasVentas.productos} />
            </div>

            <h4 className="pi-dash-subtitulo pi-dash-subtitulo-espaciado"><FaTrophy color="var(--coral-compra)" /> Producto estrella de cada negocio</h4>
            <Tabla
              columnas={['Negocio', 'Producto más consumido', { texto: 'Unidades', align: 'center' }, { texto: '% del negocio', align: 'center' }, { texto: 'Unidades totales', align: 'center' }, { texto: 'Productos distintos', align: 'center' }]}
              datos={estadisticasVentas.estrellas}
              vacio="Aún no hay ventas de negocios en este evento."
              renderFila={e => (
                <tr key={e.id}>
                  <td><strong>{e.negocio}</strong></td>
                  <td>{e.producto || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{e.unidades}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="pi-dash-porcentaje pi-dash-badge-ok">{e.pct}%</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{e.unidadesNegocio}</td>
                  <td style={{ textAlign: 'center' }}>{e.productosDistintos}</td>
                </tr>
              )}
            />

            <h4 className="pi-dash-subtitulo pi-dash-subtitulo-espaciado"><FaMedal color="var(--cian-digital)" /> Ranking de ayudantes</h4>
            <Tabla
              columnas={['#', 'Ayudante', 'Negocio', 'Puesto', { texto: 'Ventas', align: 'center' }, { texto: 'Unidades', align: 'center' }, 'Lo que más vende', 'Total']}
              datos={estadisticasVentas.ayudantes}
              vacio="Aún no hay ventas de ayudantes en este evento."
              renderFila={(a, i) => (
                <tr key={a.id}>
                  <td><span className={`pi-dash-rank${i < 3 ? ` pi-dash-rank--${i + 1}` : ''}`}>{i + 1}</span></td>
                  <td><strong>{a.nombre}</strong></td>
                  <td>{a.negocio}</td>
                  <td>{a.puestos}</td>
                  <td style={{ textAlign: 'center' }}>{a.ventas}</td>
                  <td style={{ textAlign: 'center' }}>{a.unidades}</td>
                  <td>{a.productoTop ? `${a.productoTop} (${a.productoTopUnidades} u.)` : '—'}</td>
                  <td className="pi-dash-monto-celda">{a.total} pts</td>
                </tr>
              )}
            />

            <h4 className="pi-dash-subtitulo pi-dash-subtitulo-espaciado"><FaUserFriends color="var(--indigo-profundo)" /> Cuánto compra cada cliente</h4>
            <Tabla
              columnas={['#', 'Cliente', 'Documento', { texto: 'Compras', align: 'center' }, { texto: 'Unidades', align: 'center' }, 'Gastado', { texto: 'Acciones', srOnly: true }]}
              datos={estadisticasVentas.clientes}
              vacio="Aún no hay consumo de clientes en este evento."
              renderFila={(c, i) => (
                <tr key={c.id}>
                  <td><span className={`pi-dash-rank${i < 3 ? ` pi-dash-rank--${i + 1}` : ''}`}>{i + 1}</span></td>
                  <td>{c.nombre}</td>
                  <td>{c.documento || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{c.compras}</td>
                  <td style={{ textAlign: 'center' }}>{c.unidades}</td>
                  <td className="pi-dash-monto-celda">{c.total} pts</td>
                  <td>
                    <button type="button" className="pi-dash-btn-ver" onClick={() => setClienteAbierto(c)}>
                      <FaListUl /> Ver compras
                    </button>
                  </td>
                </tr>
              )}
            />
          </section>

          {/* --- ENTRADAS AL EVENTO --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo">Entradas al Evento</h3>
            <div className="pi-dash-stats-grid">
              <StatCard onClick={() => abrirDetalle('entradas')} icon={<FaTicketAlt />} tono="total" valor={statsEntradas.total} label="Total de Entradas" />
              <StatCard
                onClick={() => abrirDetalle('entradas', 'ingresado')}
                icon={<FaCheckCircle />} tono="ok" valor={statsEntradas.ingresaron} label="Ya Ingresaron"
                extra={<span className="pi-dash-porcentaje pi-dash-badge-ok">{statsEntradas.pctIngresaron}%</span>}
              />
              <StatCard onClick={() => abrirDetalle('entradas', 'dentro')} icon={<FaUsers />} tono="info" valor={statsEntradas.dentro} label="Están Dentro" />
              <StatCard
                onClick={() => abrirDetalle('entradas', 'pendiente')}
                icon={<FaHourglassHalf />} tono="warn" valor={statsEntradas.faltan} label="Faltan por Ingresar"
                extra={<span className="pi-dash-porcentaje pi-dash-badge-pend">{statsEntradas.pctFaltan}%</span>}
              />
              <StatCard onClick={() => abrirDetalle('entradas', 'salio')} icon={<FaSignOutAlt />} valor={statsEntradas.salieron} label="Ya Salieron" />
            </div>

            <div className="pi-dash-progreso-barra">
              <div className="pi-dash-progreso-relleno" style={{ width: `${statsEntradas.pctIngresaron}%` }} />
            </div>

            <button type="button" className="pi-dash-btn-detalle" onClick={() => abrirDetalle('entradas')}>
              <FaUserCheck /> Ver detalle de participantes
            </button>
          </section>

          {/* --- PERSONAL DEL EVENTO --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo">Personal del Evento</h3>
            <div className="pi-dash-roles-grid">
              <button type="button" className="pi-dash-rol-card" onClick={() => abrirDetalle('negocios')}>
                <FaStore className="pi-dash-rol-icon" />
                <span className="numero">{datos.negocios.length}</span>
                <span className="label">Usuarios Negocio</span>
              </button>
              <button type="button" className="pi-dash-rol-card" onClick={() => abrirDetalle('recargadores')}>
                <FaCashRegister className="pi-dash-rol-icon" />
                <span className="numero">{datos.recargadores.length}</span>
                <span className="label">Recargadores</span>
              </button>
              <button type="button" className="pi-dash-rol-card" onClick={() => abrirDetalle('supervisores')}>
                <FaChartPie className="pi-dash-rol-icon" />
                <span className="numero">{datos.supervisores.length}</span>
                <span className="label">Supervisores</span>
              </button>
              <button type="button" className="pi-dash-rol-card" onClick={() => abrirDetalle('devoluciones')}>
                <FaBoxOpen className="pi-dash-rol-icon" />
                <span className="numero">{datos.devoluciones.length}</span>
                <span className="label">Devolución</span>
              </button>
              <button type="button" className="pi-dash-rol-card" onClick={() => abrirDetalle('negocios')}>
                <FaUserFriends className="pi-dash-rol-icon" />
                <span className="numero">{totalAyudantes}</span>
                <span className="label">Ayudantes (total)</span>
              </button>
            </div>
          </section>

          {/* --- HISTORIAL DE MANILLAS --- */}
          <section className="pi-dash-seccion">
            <HistorialManillas eventoId={eventoId} />
          </section>

          {/* --- ACTIVIDAD RECIENTE --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo"><FaClock color="var(--indigo-profundo)" /> Actividad del Evento</h3>
            <Buscador
              valor={busquedaActividad}
              onCambio={setBusquedaActividad}
              placeholder="Buscar por persona, documento, negocio o producto…"
              etiqueta="Buscar actividad"
              filtros={filtrosActividad}
              filtroActivo={filtroActividad}
              onFiltro={setFiltroActividad}
              etiquetaFiltros="Filtrar actividad por tipo"
            />
            <Tabla
              columnas={['Movimiento', 'Realizado por', 'Participante', 'Lugar / Detalle', 'Monto', 'Fecha / Hora']}
              datos={actividadFiltrada}
              porPagina={10}
              vacio={actividad.length === 0
                ? 'Todavía no hay actividad en este evento.'
                : 'Ningún movimiento coincide con la búsqueda.'}
              renderFila={a => {
                const f = new Date(a.fecha);
                let detalle;
                if (a.tipo === 'venta') {
                  detalle = (
                    <span className="pi-dash-act-detalle">
                      <strong>{a.negocio} · {a.puesto}</strong>
                      {a.items.length > 0 ? a.items.map(i => (
                        <span key={i.id} className="pi-dash-act-item">
                          <span>{i.cantidad}× {i.nombreProducto}</span>
                          <span className="pi-dash-act-precio">
                            {Number(i.precioUnitario) * i.cantidad} pts{i.cantidad > 1 && ` (${Number(i.precioUnitario)} c/u)`}
                          </span>
                        </span>
                      )) : <span className="pi-dash-act-sub">Venta sin detalle de productos</span>}
                    </span>
                  );
                } else if (a.tipo === 'devolucion') {
                  detalle = (
                    <span className="pi-dash-act-detalle">
                      <strong>{a.esNegocio ? 'Retiro de ganancias de negocio' : 'Retiro de saldo'}</strong>
                      {(a.motivo || a.nota) && (
                        <span className="pi-dash-act-sub">
                          {[a.motivo && String(a.motivo).replaceAll('_', ' '), a.nota].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  );
                } else {
                  detalle = (
                    <span className="pi-dash-act-detalle">
                      <strong>Carga de saldo</strong>
                      {a.nota && <span className="pi-dash-act-sub">{a.nota}</span>}
                    </span>
                  );
                }
                const signo = a.tipo === 'recarga' ? '+' : '-';
                return (
                  <tr key={a.key} className={a.anulada ? 'pi-dash-fila-anulada' : ''}>
                    <td>
                      <span className="pi-dash-act-tipo">
                        {iconoActividad[a.tipo]}
                        {{ recarga: 'Recarga de saldo', devolucion: 'Devolución', venta: 'Venta en puesto' }[a.tipo]}
                      </span>
                      {a.anulada && <span className="pi-dash-badge-anulada">Anulada</span>}
                    </td>
                    <td>
                      <span className="pi-dash-act-detalle">
                        <strong>{a.operador}</strong>
                        <span className="pi-dash-act-sub">{a.rolOperador}</span>
                      </span>
                    </td>
                    <td>
                      <span className="pi-dash-act-detalle">
                        <strong>{a.participante}</strong>
                        {a.documento && <span className="pi-dash-act-sub">Doc. {a.documento}</span>}
                      </span>
                    </td>
                    <td>{detalle}</td>
                    <td>
                      <span className="pi-dash-act-detalle">
                        <strong className={a.tipo === 'recarga' ? 'pi-dash-act-mas' : ''}>{signo}{a.monto} pts</strong>
                        {a.saldo != null && <span className="pi-dash-act-sub">Saldo: {a.saldo} pts</span>}
                      </span>
                    </td>
                    <td>
                      <span className="pi-dash-act-detalle">
                        <span>{f.toLocaleDateString('es-BO')}</span>
                        <span className="pi-dash-act-sub">{f.toLocaleTimeString('es-BO')}</span>
                      </span>
                      {a.venta && (
                        <button type="button" className="pi-dash-btn-ver" onClick={() => setVentaDetalle(a.venta)}>
                          Detalle
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }}
            />
          </section>
        </>
      )}

      {/* ================= DETALLE: ENTRADAS ================= */}
      {vistaActual === 'entradas' && (
        <section className="pi-dash-seccion">
          <h3 className="pi-dash-seccion-titulo">{tituloEntradasFiltro}</h3>

          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            placeholder="Buscar por nombre o documento…"
            etiqueta="Buscar por nombre o documento"
          />

          <Tabla
            columnas={['Participante', 'Documento', 'Entrada', 'Estado']}
            datos={entradasFiltradas}
            vacio="No se encontraron participantes."
            renderFila={p => (
              <tr key={p.id}>
                <td>
                  <div className="pi-dash-fila-persona">
                    {p.foto && <img width="32" height="32" src={p.foto} alt={p.nombre} className="pi-dash-mini-avatar" />}
                    <span>{p.nombre}</span>
                  </div>
                </td>
                <td>{ciDeEntrada(p) || '—'}</td>
                <td>{p.categoriaTicket?.nombre || '—'}</td>
                <td>
                  {p.estadoIngreso === 'salio'
                    ? <span className="pi-dash-badge pi-dash-badge-salio"><FaSignOutAlt /> Salió</span>
                    : p.estadoIngreso === 'ingresado'
                    ? <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Ingresó</span>
                    : <span className="pi-dash-badge pi-dash-badge-pend"><FaHourglassHalf /> Pendiente</span>}
                </td>
              </tr>
            )}
          />
        </section>
      )}

      {/* ================= DETALLE: RECARGADORES ================= */}
      {vistaActual === 'recargadores' && (
        <section className="pi-dash-seccion">
          {recargadorAbierto ? (
            <>
              <div className="pi-dash-detalle-header">
                <h3 className="pi-dash-seccion-titulo">{recargadorAbierto.nombre}</h3>
                <span className="pi-dash-detalle-total">Total recargado: <strong>{recargadorAbierto.totalRecargado} pts</strong></span>
              </div>
              <Tabla
                columnas={['Hora', 'Participante', 'Monto']}
                datos={recargadorAbierto.recargas}
                vacio="Este recargador no tiene recargas."
                renderFila={(t, i) => (
                  <tr key={i}>
                    <td>{t.hora}</td>
                    <td>{t.participante}</td>
                    <td className="pi-dash-monto-celda"><FaCoins color="var(--verde-recarga-texto)" /> {t.monto} pts</td>
                  </tr>
                )}
              />
            </>
          ) : (
            <>
              <h3 className="pi-dash-seccion-titulo">Recargadores</h3>

              <h4 className="pi-dash-subtitulo"><FaTrophy color="var(--coral-compra)" /> Top Recargadores</h4>
              <Podio lista={recargadoresOrdenados} valorKey="totalRecargado" unidad="pts" />

              <Tabla
                columnas={['Recargador', 'Total Recargado', { texto: 'Acciones', srOnly: true }]}
                datos={recargadoresOrdenados}
                vacio="Aún no hay recargas en este evento."
                renderFila={r => (
                  <tr key={r.id}>
                    <td>{r.nombre}</td>
                    <td className="pi-dash-monto-celda"><FaCoins color="var(--verde-recarga-texto)" /> {r.totalRecargado} pts</td>
                    <td>
                      <button type="button" className="pi-dash-btn-ver" onClick={() => abrirItem(r.id)}>
                        <FaExchangeAlt /> Ver recargas
                      </button>
                    </td>
                  </tr>
                )}
              />
            </>
          )}
        </section>
      )}

      {/* ================= DETALLE: DEVOLUCIONES ================= */}
      {vistaActual === 'devoluciones' && (
        <section className="pi-dash-seccion">
          {devolucionAbierta ? (
            <>
              <div className="pi-dash-detalle-header">
                <h3 className="pi-dash-seccion-titulo">{devolucionAbierta.nombre}</h3>
                <span className="pi-dash-detalle-total">Total devuelto: <strong>{devolucionAbierta.totalDevuelto} pts</strong></span>
              </div>
              <Tabla
                columnas={['Hora', 'Participante', 'Monto']}
                datos={devolucionAbierta.retiros}
                vacio="Este encargado no tiene devoluciones."
                renderFila={(t, i) => (
                  <tr key={i}>
                    <td>{t.hora}</td>
                    <td>{t.participante}</td>
                    <td className="pi-dash-monto-celda"><FaBoxOpen color="var(--ambar-aviso-texto)" /> {t.monto} pts</td>
                  </tr>
                )}
              />
            </>
          ) : (
            <>
              <h3 className="pi-dash-seccion-titulo">Encargados de Devolución</h3>

              <h4 className="pi-dash-subtitulo"><FaTrophy color="var(--coral-compra)" /> Top Devoluciones</h4>
              <Podio lista={devolucionesOrdenadas} valorKey="totalDevuelto" unidad="pts" />

              <Tabla
                columnas={['Encargado', 'Total Devuelto', { texto: 'Acciones', srOnly: true }]}
                datos={devolucionesOrdenadas}
                vacio="Aún no hay devoluciones en este evento."
                renderFila={d => (
                  <tr key={d.id}>
                    <td>{d.nombre}</td>
                    <td className="pi-dash-monto-celda"><FaBoxOpen color="var(--ambar-aviso-texto)" /> {d.totalDevuelto} pts</td>
                    <td>
                      <button type="button" className="pi-dash-btn-ver" onClick={() => abrirItem(d.id)}>
                        <FaExchangeAlt /> Ver devoluciones
                      </button>
                    </td>
                  </tr>
                )}
              />
            </>
          )}
        </section>
      )}

      {/* ================= DETALLE: NEGOCIOS ================= */}
      {vistaActual === 'negocios' && (
        <section className="pi-dash-seccion">
          {negocioAbierto ? (
            <>
              <div className="pi-dash-detalle-header">
                <h3 className="pi-dash-seccion-titulo">{negocioAbierto.nombre}</h3>
                <span className="pi-dash-detalle-total">Ventas totales: <strong>{negocioAbierto.ventasTotal} pts</strong> · {negocioAbierto.ayudantes} ayudante(s)</span>
              </div>
              <Tabla
                columnas={['Hora', 'Cliente', 'Ayudante', 'Productos', 'Monto', { texto: 'Acciones', srOnly: true }]}
                datos={negocioAbierto.ventas}
                vacio="Este negocio no tiene ventas."
                renderFila={(t, i) => (
                  <tr key={t.id || i} className={t.anulada ? 'pi-dash-fila-anulada' : ''}>
                    <td>{t.hora}</td>
                    <td>{t.cliente}</td>
                    <td>{t.ayudante}</td>
                    <td>
                      <ul className="pi-dash-items-lista">
                        {t.items.map(it => <li key={it.id}><strong>{it.cantidad}×</strong> {it.nombreProducto}</li>)}
                      </ul>
                    </td>
                    <td className="pi-dash-monto-celda"><FaShoppingBag color="var(--coral-compra)" /> {t.monto} pts</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="pi-dash-btn-ver" onClick={() => setVentaDetalle({ ...t, negocio: negocioAbierto.nombre })}>
                        Detalle
                      </button>{' '}
                      {t.anulada
                        ? <span className="pi-dash-badge-anulada">Anulada</span>
                        : !soloLectura && (
                          <button type="button" className="pi-dash-btn-anular" onClick={() => { setVentaAnular({ id: t.id, monto: t.monto, cliente: t.cliente }); setMotivoAnular(''); setErrAnularVenta(''); }}>
                            Anular
                          </button>
                        )}
                    </td>
                  </tr>
                )}
              />
            </>
          ) : (
            <>
              <h3 className="pi-dash-seccion-titulo">Usuarios Negocio</h3>

              <div className="pi-dash-total-destacado">
                <FaCoins color="var(--verde-recarga-texto)" />
                Consumo total de todos los clientes: <strong>{totalConsumoClientes} pts</strong>
              </div>

              <h4 className="pi-dash-subtitulo"><FaTrophy color="var(--coral-compra)" /> Top Negocios por Ventas</h4>
              <Podio lista={negociosOrdenados} valorKey="ventasTotal" unidad="pts" />

              <Tabla
                columnas={['Negocio', 'Ventas Totales', 'Ayudantes Asignados', { texto: 'Acciones', srOnly: true }]}
                datos={negociosOrdenados}
                vacio="Aún no hay ventas de negocios en este evento."
                renderFila={n => (
                  <tr key={n.id}>
                    <td>{n.nombre}</td>
                    <td className="pi-dash-monto-celda"><FaShoppingBag color="var(--coral-compra)" /> {n.ventasTotal} pts</td>
                    <td>{n.ayudantes}</td>
                    <td>
                      <button type="button" className="pi-dash-btn-ver" onClick={() => abrirItem(n.id)}>
                        <FaExchangeAlt /> Ver ventas
                      </button>
                    </td>
                  </tr>
                )}
              />

              <h4 className="pi-dash-subtitulo pi-dash-subtitulo-espaciado"><FaTrophy color="var(--cian-digital)" /> Top Clientes por Consumo</h4>
              <Tabla
                columnas={['Cliente', { texto: 'Compras', align: 'center' }, { texto: 'Unidades', align: 'center' }, 'Consumo Total', { texto: 'Acciones', srOnly: true }]}
                datos={topClientesOrdenados}
                vacio="Aún no hay consumo de clientes en este evento."
                renderFila={(c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{c.compras}</td>
                    <td style={{ textAlign: 'center' }}>{c.unidades}</td>
                    <td className="pi-dash-monto-celda">{c.total} pts</td>
                    <td>
                      <button type="button" className="pi-dash-btn-ver" onClick={() => setClienteAbierto(c)}>
                        <FaListUl /> Ver compras
                      </button>
                    </td>
                  </tr>
                )}
              />
            </>
          )}
        </section>
      )}

      {/* ================= DETALLE: SUPERVISORES ================= */}
      {vistaActual === 'supervisores' && (
        <section className="pi-dash-seccion">
          <h3 className="pi-dash-seccion-titulo">Supervisores</h3>
          <p className="pi-dash-incidencias-nota">
            El sistema no registra qué supervisor gestionó cada ingreso individual; en total,
            <strong> {statsEntradas.ingresaron}</strong> persona(s) ya ingresaron a este evento.
          </p>

          <Tabla
            columnas={['Nombre', 'Correo']}
            datos={datos.supervisores}
            vacio="No hay supervisores asignados a este evento."
            renderFila={s => (
              <tr key={s.id}>
                <td>{s.nombre}</td>
                <td>{s.email}</td>
              </tr>
            )}
          />
        </section>
      )}

      {/* ================= DETALLE: REPORTES (INCIDENCIAS DE RECARGA + DATOS DE ENTRADAS) ================= */}
      {vistaActual === 'incidencias' && (
        <section className="pi-dash-seccion">
          <div className="pi-dash-resumen-grid pi-dash-resumen-espaciado">
            <StatCard
              icon={<FaCoins />}
              tono={incidenciasPendientes.length ? 'warn' : 'ok'}
              valor={incidenciasPendientes.length}
              label="Incidencias de recarga pendientes"
              onClick={() => setTabReporte('incidencias')}
            />
            <StatCard
              icon={<FaTicketAlt />}
              tono={reportesEntradasPendientes.length ? 'warn' : 'ok'}
              valor={reportesEntradasPendientes.length}
              label="Reportes de datos pendientes"
              onClick={() => setTabReporte('datos')}
            />
          </div>

          <Filtros
            etiqueta="Tipo de reporte"
            activo={tabReporte}
            onCambio={setTabReporte}
            opciones={[
              { valor: 'incidencias', texto: <><FaCoins /> Incidencias de recarga</>, conteo: incidenciasPendientes.length },
              { valor: 'datos', texto: <><FaTicketAlt /> Datos de entradas</>, conteo: reportesEntradasPendientes.length },
            ]}
          />

          <Buscador
            valor={busquedaReporte}
            onCambio={setBusquedaReporte}
            placeholder={tabReporte === 'incidencias'
              ? 'Buscar por participante, recargador o evento…'
              : 'Buscar por persona, comprador o evento…'}
            filtros={FILTROS_ESTADO_REPORTE}
            filtroActivo={filtroEstadoReporte}
            onFiltro={setFiltroEstadoReporte}
            etiquetaFiltros="Filtrar por estado"
          />

          {tabReporte === 'incidencias' ? (
            <>
              <p className="pi-dash-incidencias-nota">
                Reportes de un Recargador contando qué pasó con una recarga. Abrí cada caso y decidí cuántos
                puntos acreditar para cerrarlo.
              </p>
              <Tabla
                columnas={[
                  reportesGlobal && 'Evento',
                  'Participante', 'Documento', 'Se le dio', 'Dijo que quería', 'Qué pasó', 'Recargador', 'Estado',
                  { texto: 'Acciones', srOnly: true },
                ].filter(Boolean)}
                datos={incidenciasFiltradas}
                vacio={hayFiltroReporte ? 'Ninguna incidencia coincide con el filtro.' : 'No hay incidencias de recarga reportadas.'}
                renderFila={inc => (
                  <tr key={inc.id}>
                    {reportesGlobal && <td>{inc.evento?.nombre || '—'}</td>}
                    <td>
                      <div className="pi-dash-fila-persona">
                        {inc.entrada.foto && <img width="32" height="32" src={inc.entrada.foto} alt={inc.entrada.nombre} className="pi-dash-mini-avatar" />}
                        <span>{inc.entrada.nombre}</span>
                      </div>
                    </td>
                    <td>{ciDeEntrada(inc.entrada) || '—'}</td>
                    <td>{inc.montoEntregado} pts</td>
                    <td>{inc.montoSolicitado != null ? `${inc.montoSolicitado} pts` : '—'}</td>
                    <td>{inc.nota || '—'}</td>
                    <td>{inc.recargador.nombre}</td>
                    <td>
                      {inc.estado === 'pendiente'
                        ? <span className="pi-dash-badge pi-dash-badge-pend"><FaExclamationTriangle /> Pendiente</span>
                        : <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Resuelta ({Number(inc.ajusteAplicado) > 0 ? '+' : ''}{Number(inc.ajusteAplicado)} pts por {inc.resueltoPor?.nombre})</span>}
                    </td>
                    <td>
                      {!soloLectura && inc.estado === 'pendiente' && (
                        <button type="button" className="pi-dash-btn-ver" onClick={() => abrirResolucion(inc)}>
                          <FaCoins /> Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              />
            </>
          ) : (
            <>
              <p className="pi-dash-incidencias-nota">
                Reportes de Usuario Normal sobre nombre, correo o celular mal puestos en una entrada ya aprobada.
                Abrí el reporte y corregí el dato para cerrarlo.
              </p>
              <Tabla
                columnas={[
                  reportesGlobal && 'Evento',
                  'Comprador', 'Persona', 'Dato reportado', 'Valor actual', 'Descripción', 'Estado',
                  { texto: 'Acciones', srOnly: true },
                ].filter(Boolean)}
                datos={reportesEntradasFiltrados}
                vacio={hayFiltroReporte ? 'Ningún reporte coincide con el filtro.' : 'No hay reportes de datos incorrectos.'}
                renderFila={rep => (
                  <tr key={rep.id}>
                    {reportesGlobal && <td>{rep.evento?.nombre || '—'}</td>}
                    <td>{rep.entrada.compra?.comprador.nombre || '—'}</td>
                    <td>{rep.entrada.nombre}</td>
                    <td>{ETIQUETA_CAMPO_ENTRADA[rep.campo]}</td>
                    <td>{rep.campo === 'nombre' ? rep.entrada.nombre : rep.campo === 'correo' ? rep.entrada.correo : (rep.entrada.celular || '—')}</td>
                    <td>{rep.descripcion}</td>
                    <td>
                      {rep.estado === 'pendiente'
                        ? <span className="pi-dash-badge pi-dash-badge-pend"><FaExclamationTriangle /> Pendiente</span>
                        : <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Corregido a "{rep.valorCorregido}"</span>}
                    </td>
                    <td>
                      {!soloLectura && rep.estado === 'pendiente' && (
                        <button type="button" className="pi-dash-btn-ver" onClick={() => abrirCorreccion(rep)}>Corregir</button>
                      )}
                    </td>
                  </tr>
                )}
              />
            </>
          )}
        </section>
      )}

      {/* ================= DETALLE: SOLICITUDES DE COMPRA DE ENTRADAS ================= */}
      {vistaActual === 'solicitudesEntradas' && (
        <section className="pi-dash-seccion">
          <h3 className="pi-dash-seccion-titulo">Solicitudes de Compra de Entradas</h3>
          <p className="pi-dash-incidencias-nota">
            Detalle de cada lote de entradas compradas: para quién, con qué correo y celular, y si ya fue aprobado.
          </p>

          <div className="pi-dash-resumen-grid pi-dash-resumen-espaciado">
            <StatCard icon={<FaTicketAlt />} tono="total" valor={solicitudes.length} label="Solicitudes" />
            <StatCard icon={<FaUsers />} tono="info" valor={totalEntradasCompradas} label="Entradas compradas en total" />
            <StatCard icon={<FaExclamationTriangle />} tono="warn" valor={reportesEntradasPendientes.length} label="Reportes de datos pendientes" />
          </div>

          <Filtros
            etiqueta="Filtrar solicitudes por estado"
            activo={filtroSolicitudes}
            onCambio={setFiltroSolicitudes}
            opciones={[
              { valor: 'pendiente', texto: <><FaHourglassHalf /> Pendientes</>, conteo: solicitudes.filter(c => c.estado === 'pendiente').length },
              { valor: 'confirmado', texto: <><FaCheckCircle /> Aprobados</>, conteo: solicitudes.filter(c => c.estado === 'confirmado').length },
              { valor: 'rechazado', texto: <><FaExclamationTriangle /> Rechazados</>, conteo: solicitudes.filter(c => c.estado === 'rechazado').length },
              { valor: 'todos', texto: 'Todos', conteo: solicitudes.length },
            ]}
          />

          <Tabla
            columnas={['Comprador', 'Entradas', 'Total', 'Estado', 'Fecha', { texto: 'Acciones', srOnly: true }]}
            datos={solicitudesFiltradas}
            vacio={solicitudes.length === 0 ? 'No hay solicitudes de compra registradas.' : 'No hay solicitudes con este estado.'}
            renderFila={compra => (
                  <tr key={compra.id}>
                    <td>
                      <div className="fila-nombre">{compra.comprador.nombre}</div>
                      <div className="celda-secundaria">{compra.comprador.email}</div>
                    </td>
                    <td>{compra.entradas.length}</td>
                    <td className="pi-dash-monto-celda">Bs. {compra.montoTotal}</td>
                    <td>
                      {compra.estado === 'confirmado' && <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Aprobado</span>}
                      {compra.estado === 'pendiente' && <span className="pi-dash-badge pi-dash-badge-pend"><FaHourglassHalf /> En revisión</span>}
                      {compra.estado === 'rechazado' && (
                        <span className="pi-dash-badge pi-dash-badge-salio" title={compra.motivoRechazo || ''}>
                          <FaExclamationTriangle /> Rechazado
                        </span>
                      )}
                    </td>
                    <td>{new Date(compra.createdAt).toLocaleDateString('es-BO')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!soloLectura && compra.estado === 'pendiente' && (
                          <>
                            <button type="button" className="pi-dash-btn-ver" onClick={() => aprobarSolicitud(compra)}>
                              <FaCheckCircle /> Aprobar
                            </button>
                            <button type="button" className="pi-dash-btn-ver" onClick={() => rechazarSolicitudCompra(compra)}>
                              <FaExclamationTriangle /> Rechazar
                            </button>
                          </>
                        )}
                        <button type="button" className="pi-dash-btn-ver" onClick={() => toggleSolicitud(compra.id)}>
                          Ver detalle
                        </button>
                      </div>
                    </td>
                  </tr>
            )}
          />

        </section>
      )}
        </>
      )}

      {/* --- CONTRASEÑAS GENERADAS AL APROBAR (no hay envío de correo real) --- */}
      {passwordsAMostrar && (
        <Modal
          titulo={<><FaKey aria-hidden="true" /> Cuentas nuevas creadas</>}
          onCerrar={() => setPasswordsAMostrar(null)}
        >
            <p className="pi-dash-incidencias-nota">
              No hay envío de correo automático — comparte esta contraseña temporal a mano con cada invitado. Solo se muestra esta vez.
            </p>
            <Tabla
              columnas={['N.º entrada', 'Nombre', 'Correo', 'Contraseña']}
              datos={passwordsAMostrar}
              porPagina={0}
              renderFila={(p, i) => (
                <tr key={i}><td>{p.numero ?? '—'}</td><td>{p.nombre}</td><td>{p.correo}</td><td><strong>{p.password}</strong></td></tr>
              )}
            />
        </Modal>
      )}

      {/* --- MODAL: DETALLE DE SOLICITUD DE COMPRA --- */}
      {compraAbierta && (
        <Modal
          titulo="Detalle de la solicitud"
          onCerrar={() => setSolicitudAbierta(null)}
          tamano="lg"
          className="pi-dash-modal-solicitud"
        >
            <div className="pi-dash-detalle-header">
              <div>
                <div className="fila-nombre">{compraAbierta.comprador.nombre}</div>
                <div className="celda-secundaria">{compraAbierta.comprador.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {compraAbierta.estado === 'confirmado' && <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Aprobado</span>}
                {compraAbierta.estado === 'pendiente' && <span className="pi-dash-badge pi-dash-badge-pend"><FaHourglassHalf /> En revisión</span>}
                {compraAbierta.estado === 'rechazado' && (
                  <span className="pi-dash-badge pi-dash-badge-salio" title={compraAbierta.motivoRechazo || ''}>
                    <FaExclamationTriangle /> Rechazado
                  </span>
                )}
                <span className="pi-dash-detalle-total">{new Date(compraAbierta.createdAt).toLocaleDateString('es-BO')}</span>
              </div>
            </div>
            {compraAbierta.estado === 'rechazado' && compraAbierta.motivoRechazo && (
              <p className="pi-dash-incidencias-nota"><strong>Motivo del rechazo:</strong> {compraAbierta.motivoRechazo}</p>
            )}

            <p style={{ fontWeight: 700, marginBottom: '10px' }}>Comprobante de pago</p>
            {compraAbierta.comprobanteUrl ? (
              <a href={compraAbierta.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="pi-dash-comprobante-link">
                <img
                  src={compraAbierta.comprobanteUrl}
                  alt={`Comprobante de ${compraAbierta.comprador.nombre}`}
                  className="pi-dash-comprobante-img"
                />
              </a>
            ) : (
              <span className="pi-dash-sin-resultados">Sin comprobante</span>
            )}

            <p style={{ fontWeight: 700, margin: '20px 0 10px' }}>Entradas de este lote</p>
            <Tabla
              columnas={['Persona', 'Nombre', 'Correo', 'Celular', 'Categoría', 'Precio']}
              datos={compraAbierta.entradas}
              porPagina={0}
              renderFila={(ent, i) => (
                <tr key={ent.id}>
                  <td>{ent.isTitular ? 'Titular' : `Invitado ${i + 1}`}</td>
                  <td>{ent.nombre}</td>
                  <td>{ent.correo}</td>
                  <td>{ent.celular || '—'}</td>
                  <td>{ent.categoriaTicket?.nombre || '—'}</td>
                  <td className="pi-dash-monto-celda">
                    {ent.categoriaTicket ? `Bs. ${ent.categoriaTicket.precio}` : '—'}
                  </td>
                </tr>
              )}
              pie={(
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                  <td className="pi-dash-monto-celda">Bs. {compraAbierta.montoTotal}</td>
                </tr>
              )}
            />

            {!soloLectura && compraAbierta.estado === 'pendiente' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button type="button" className="pi-dash-btn-ver" onClick={() => { aprobarSolicitud(compraAbierta); setSolicitudAbierta(null); }}>
                  <FaCheckCircle /> Aprobar
                </button>
                <button type="button" className="pi-dash-btn-ver" onClick={() => rechazarSolicitudCompra(compraAbierta)}>
                  <FaExclamationTriangle /> Rechazar
                </button>
              </div>
            )}
        </Modal>
      )}

      {/* --- MODAL: RESOLVER INCIDENCIA DE RECARGA --- */}
      {incidenciaModal && (
        <Modal
          titulo={<><FaCoins aria-hidden="true" /> Resolver incidencia de recarga</>}
          onCerrar={cerrarResolucion}
          className="pi-dash-modal-reporte"
        >
          <div className="pi-dash-reporte-datos">
            <div><span>Participante</span><strong>{incidenciaModal.entrada.nombre}</strong></div>
            <div><span>Documento</span><strong>{ciDeEntrada(incidenciaModal.entrada) || '—'}</strong></div>
            <div><span>Recargador</span><strong>{incidenciaModal.recargador.nombre}</strong></div>
            {reportesGlobal && <div><span>Evento</span><strong>{incidenciaModal.evento?.nombre || '—'}</strong></div>}
            <div><span>Se le cargó</span><strong>{incidenciaModal.montoEntregado} pts</strong></div>
            <div><span>Pagó en realidad</span><strong>{incidenciaModal.montoSolicitado != null ? `${incidenciaModal.montoSolicitado} pts` : '—'}</strong></div>
            {Number(incidenciaModal.montoBloqueado) > 0 && (
              <div><span>Retenido de su saldo</span><strong>{Number(incidenciaModal.montoBloqueado)} pts</strong></div>
            )}
          </div>
          {incidenciaModal.nota && (
            <p className="pi-dash-reporte-nota"><span>Qué pasó:</span> {incidenciaModal.nota}</p>
          )}

          <label className="pi-dash-reporte-label" htmlFor="ajuste-monto">Ajuste al saldo (pts)</label>
          <input
            id="ajuste-monto"
            className="pi-dash-reporte-input"
            type="number"
            inputMode="numeric"
            value={montoAjuste}
            onChange={(e) => setMontoAjuste(e.target.value)}
            autoFocus
          />
          {montoAjuste !== '' && !Number.isNaN(Number(montoAjuste)) && (
            <p className="pi-dash-reporte-ayuda">
              {Number(montoAjuste) > 0
                ? `Se le ACREDITAN ${Number(montoAjuste)} pts.`
                : Number(montoAjuste) < 0
                  ? `Se le DESCUENTAN ${Math.abs(Number(montoAjuste))} pts.`
                  : 'Sin movimiento de saldo.'}
              {Number(incidenciaModal.montoBloqueado) > 0 && ` Se libera lo retenido (${Number(incidenciaModal.montoBloqueado)} pts).`}
            </p>
          )}
          <p className="pi-dash-reporte-ayuda">
            <strong>+</strong> acredita (se le debía), <strong>−</strong> descuenta (se le cargó de más),
            <strong> 0</strong> cierra sin tocar el saldo.
          </p>

          <div className="pi-dash-reporte-acciones">
            <button type="button" className="pi-dash-btn-ver" onClick={cerrarResolucion}>Cancelar</button>
            <button type="button" className="pi-dash-btn-guardar" onClick={confirmarAjuste}>
              <FaCheckCircle /> Aplicar y cerrar
            </button>
          </div>
        </Modal>
      )}

      {/* --- MODAL: CORREGIR DATO DE UNA ENTRADA --- */}
      {reporteDatoModal && (
        <Modal
          titulo={<><FaTicketAlt aria-hidden="true" /> Corregir dato de la entrada</>}
          onCerrar={cerrarCorreccion}
          className="pi-dash-modal-reporte"
        >
          <div className="pi-dash-reporte-datos">
            <div><span>Persona</span><strong>{reporteDatoModal.entrada.nombre}</strong></div>
            <div><span>Comprador</span><strong>{reporteDatoModal.entrada.compra?.comprador.nombre || '—'}</strong></div>
            {reportesGlobal && <div><span>Evento</span><strong>{reporteDatoModal.evento?.nombre || '—'}</strong></div>}
            <div><span>Dato reportado</span><strong>{ETIQUETA_CAMPO_ENTRADA[reporteDatoModal.campo]}</strong></div>
            <div>
              <span>Valor actual</span>
              <strong>
                {reporteDatoModal.campo === 'nombre' ? reporteDatoModal.entrada.nombre
                  : reporteDatoModal.campo === 'correo' ? reporteDatoModal.entrada.correo
                  : (reporteDatoModal.entrada.celular || '—')}
              </strong>
            </div>
          </div>
          {reporteDatoModal.descripcion && (
            <p className="pi-dash-reporte-nota"><span>Lo que reportó:</span> {reporteDatoModal.descripcion}</p>
          )}

          <label className="pi-dash-reporte-label" htmlFor="correccion-valor">
            Nuevo valor de {ETIQUETA_CAMPO_ENTRADA[reporteDatoModal.campo]?.toLowerCase()}
          </label>
          <input
            id="correccion-valor"
            className="pi-dash-reporte-input"
            type={reporteDatoModal.campo === 'correo' ? 'email' : 'text'}
            value={valorCorreccion}
            onChange={(e) => setValorCorreccion(e.target.value)}
            autoFocus
          />

          <div className="pi-dash-reporte-acciones">
            <button type="button" className="pi-dash-btn-ver" onClick={cerrarCorreccion}>Cancelar</button>
            <button type="button" className="pi-dash-btn-guardar" onClick={guardarCorreccion} disabled={!valorCorreccion.trim()}>
              <FaCheckCircle /> Guardar corrección
            </button>
          </div>
        </Modal>
      )}

      {clienteAbierto && !ventaDetalle && (
        <Modal titulo={`Compras de ${clienteAbierto.nombre}`} onCerrar={() => setClienteAbierto(null)} tamano="lg">
          <div className="pi-dash-cliente-resumen">
            <StatCard icon={<FaShoppingBag />} valor={clienteAbierto.compras} label="Compras" />
            <StatCard icon={<FaBoxes />} tono="info" valor={clienteAbierto.unidades} label="Unidades" />
            <StatCard icon={<FaCoins />} tono="ok" valor={`${clienteAbierto.total} pts`} label="Gastado" />
          </div>
          <Tabla
            columnas={['Hora', 'Negocio', 'Productos', 'Monto', { texto: 'Acciones', srOnly: true }]}
            datos={clienteAbierto.ventas}
            porPagina={8}
            renderFila={(v) => (
              <tr key={v.id}>
                <td>{v.hora}</td>
                <td>{v.negocio}</td>
                <td>
                  <ul className="pi-dash-items-lista">
                    {v.items.map(it => <li key={it.id}><strong>{it.cantidad}×</strong> {it.nombreProducto}</li>)}
                  </ul>
                </td>
                <td className="pi-dash-monto-celda">{v.monto} pts</td>
                <td>
                  <button type="button" className="pi-dash-btn-ver" onClick={() => setVentaDetalle(v)}>Detalle</button>
                </td>
              </tr>
            )}
          />
        </Modal>
      )}

      {ventaDetalle && (
        <DetalleVentaModal
          venta={{
            fecha: ventaDetalle.fecha,
            cliente: ventaDetalle.cliente,
            documento: ventaDetalle.documento,
            puesto: ventaDetalle.negocio ? `${ventaDetalle.negocio} · ${ventaDetalle.puesto}` : ventaDetalle.puesto,
            ayudante: ventaDetalle.ayudante,
            anulada: ventaDetalle.anulada,
            motivoAnulacion: ventaDetalle.motivoAnulacion,
            monto: ventaDetalle.monto,
            items: ventaDetalle.items,
          }}
          onCerrar={() => setVentaDetalle(null)}
        />
      )}

      {ventaAnular && (
        <Modal titulo="Anular venta" onCerrar={() => setVentaAnular(null)} tamano="sm">
          <div className="pi-dash-form-anular">
            <p>
              Anular la venta de <strong>{ventaAnular.monto} pts</strong> a {ventaAnular.cliente}.
              El saldo vuelve al comprador y se le descuenta al negocio.
            </p>
            <label htmlFor="admin-motivo-anular">Motivo</label>
            <textarea
              id="admin-motivo-anular"
              rows={2}
              placeholder="Ej: el ayudante cobró de más"
              value={motivoAnular}
              onChange={(e) => setMotivoAnular(e.target.value)}
              autoFocus
            />
            {errAnularVenta && <p className="pi-dash-err-anular">{errAnularVenta}</p>}
            <div className="pi-dash-form-anular-acciones">
              <button type="button" className="pi-dash-btn-cancelar-anular" onClick={() => setVentaAnular(null)} disabled={anulandoVenta}>Cancelar</button>
              <button type="button" className="pi-dash-btn-anular pi-dash-btn-anular--fuerte" onClick={confirmarAnularVenta} disabled={anulandoVenta || motivoAnular.trim().length < 3}>
                Anular venta
              </button>
            </div>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
