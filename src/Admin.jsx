import { Fragment, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaTicketAlt, FaCheckCircle, FaHourglassHalf, FaUserCheck,
  FaStore, FaCashRegister, FaChartPie, FaBoxOpen, FaUserFriends, FaUsers,
  FaArrowLeft, FaSearch, FaTrophy, FaCoins, FaShoppingBag, FaWallet,
  FaExchangeAlt, FaClock, FaExclamationTriangle
} from 'react-icons/fa';
import './Admin.css';

// --- INCIDENCIAS DE RECARGA INCOMPLETA (reportadas por Recargador vía localStorage) ---
const CLAVE_INCIDENCIAS = 'qpass_incidencias_recarga';

const leerIncidencias = () => {
  const guardado = localStorage.getItem(CLAVE_INCIDENCIAS);
  return guardado ? JSON.parse(guardado) : [];
};

const guardarIncidencias = (lista) => {
  localStorage.setItem(CLAVE_INCIDENCIAS, JSON.stringify(lista));
};

// --- SOLICITUDES DE COMPRA DE ENTRADAS Y REPORTES DE DATOS (de Usuario Normal, vía localStorage) ---
const CLAVE_SOLICITUDES = 'qpass_solicitudes_entradas';
const CLAVE_REPORTES_ENTRADAS = 'qpass_reportes_entradas';

const leerSolicitudes = () => {
  const guardado = localStorage.getItem(CLAVE_SOLICITUDES);
  return guardado ? JSON.parse(guardado) : [];
};

const guardarSolicitudes = (lista) => {
  localStorage.setItem(CLAVE_SOLICITUDES, JSON.stringify(lista));
};

const leerReportesEntradas = () => {
  const guardado = localStorage.getItem(CLAVE_REPORTES_ENTRADAS);
  return guardado ? JSON.parse(guardado) : [];
};

const guardarReportesEntradas = (lista) => {
  localStorage.setItem(CLAVE_REPORTES_ENTRADAS, JSON.stringify(lista));
};

const ETIQUETA_CAMPO_ENTRADA = { nombre: 'Nombre completo', correo: 'Correo electrónico', celular: 'Celular' };
const ETIQUETA_CATEGORIA = { general: 'General', vip: 'VIP' };

// --- DATOS SIMULADOS POR EVENTO ---
const eventosDisponibles = [
  { id: 'ev1', nombre: 'Festival QPass 2026' },
  { id: 'ev2', nombre: 'Feria Gastronómica La Paz' },
];

const datosPorEvento = {
  ev1: {
    entradas: [
      { id: 1, nombre: 'María Fernanda Rojas', documento: '7451236 LP', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=47', estado: 'ingresado', horaIngreso: '08:12' },
      { id: 2, nombre: 'Jorge Luis Quispe', documento: '6621345 SC', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=12', estado: 'ingresado', horaIngreso: '08:20' },
      { id: 3, nombre: 'Ana Belén Castro', documento: '5589214 CB', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=32', estado: 'ingresado', horaIngreso: '08:35' },
      { id: 4, nombre: 'Ricardo Alanoca Mamani', documento: '4471258 LP', tipoEntrada: 'Staff', foto: 'https://i.pravatar.cc/300?img=51', estado: 'ingresado', horaIngreso: '08:41' },
      { id: 5, nombre: 'Daniela Vargas Soto', documento: '7789456 SC', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=25', estado: 'ingresado', horaIngreso: '09:02' },
      { id: 6, nombre: 'Sergio Fabián Choque', documento: '3312589 OR', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=15', estado: 'pendiente', horaIngreso: null },
      { id: 7, nombre: 'Paola Andrea Terrazas', documento: '6654123 CB', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=45', estado: 'pendiente', horaIngreso: null },
      { id: 8, nombre: 'Luis Fernando Mamani', documento: '5521478 LP', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=13', estado: 'pendiente', horaIngreso: null },
      { id: 9, nombre: 'Carla Ximena Flores', documento: '4498712 SC', tipoEntrada: 'Staff', foto: 'https://i.pravatar.cc/300?img=44', estado: 'pendiente', horaIngreso: null },
      { id: 10, nombre: 'Diego Armando Peñaranda', documento: '7712365 TJ', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=59', estado: 'pendiente', horaIngreso: null },
      { id: 11, nombre: 'Valeria Nicole Guzmán', documento: '3387654 LP', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=48', estado: 'pendiente', horaIngreso: null },
      { id: 12, nombre: 'Marco Antonio Villca', documento: '6698741 CB', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=14', estado: 'pendiente', horaIngreso: null },
    ],
    negocios: [
      {
        id: 1, nombre: 'Restaurante El Fogón', ayudantes: 3,
        ventas: [
          { hora: '12:30', cliente: 'María Fernanda Rojas', monto: 60 },
          { hora: '13:15', cliente: 'Jorge Luis Quispe', monto: 45 },
          { hora: '14:40', cliente: 'Ana Belén Castro', monto: 75 },
          { hora: '16:05', cliente: 'Ricardo Alanoca Mamani', monto: 90 },
        ],
      },
      {
        id: 2, nombre: 'Foodtruck La Paceña', ayudantes: 2,
        ventas: [
          { hora: '12:50', cliente: 'Ana Belén Castro', monto: 40 },
          { hora: '15:10', cliente: 'Daniela Vargas Soto', monto: 55 },
          { hora: '17:20', cliente: 'Sergio Fabián Choque', monto: 35 },
        ],
      },
      {
        id: 3, nombre: 'Cervecería Andina', ayudantes: 4,
        ventas: [
          { hora: '13:00', cliente: 'María Fernanda Rojas', monto: 120 },
          { hora: '15:45', cliente: 'Ricardo Alanoca Mamani', monto: 60 },
          { hora: '18:30', cliente: 'Jorge Luis Quispe', monto: 105 },
          { hora: '19:15', cliente: 'Paola Andrea Terrazas', monto: 80 },
        ],
      },
      {
        id: 4, nombre: 'Dulces Doña Rosa', ayudantes: 1,
        ventas: [
          { hora: '14:00', cliente: 'Daniela Vargas Soto', monto: 25 },
          { hora: '16:40', cliente: 'Carla Ximena Flores', monto: 30 },
        ],
      },
    ],
    recargadores: [
      {
        id: 1, nombre: 'Juan Recargador',
        recargas: [
          { hora: '08:15', participante: 'María Fernanda Rojas', monto: 100 },
          { hora: '09:02', participante: 'Jorge Luis Quispe', monto: 150 },
          { hora: '10:30', participante: 'Ana Belén Castro', monto: 80 },
          { hora: '11:45', participante: 'Sergio Fabián Choque', monto: 200 },
        ],
      },
      {
        id: 2, nombre: 'Lucía Paredes',
        recargas: [
          { hora: '08:40', participante: 'Paola Andrea Terrazas', monto: 120 },
          { hora: '09:55', participante: 'Luis Fernando Mamani', monto: 90 },
          { hora: '12:10', participante: 'Carla Ximena Flores', monto: 150 },
        ],
      },
      {
        id: 3, nombre: 'Marcos Vidal',
        recargas: [
          { hora: '09:20', participante: 'Diego Armando Peñaranda', monto: 100 },
          { hora: '10:05', participante: 'Valeria Nicole Guzmán', monto: 130 },
        ],
      },
    ],
    devoluciones: [
      {
        id: 1, nombre: 'Luis Devoluciones',
        retiros: [
          { hora: '17:30', participante: 'María Fernanda Rojas', monto: 40 },
          { hora: '18:05', participante: 'Ricardo Alanoca Mamani', monto: 60 },
          { hora: '18:40', participante: 'Daniela Vargas Soto', monto: 70 },
        ],
      },
      {
        id: 2, nombre: 'Patricia Rojas',
        retiros: [
          { hora: '17:50', participante: 'Jorge Luis Quispe', monto: 80 },
          { hora: '19:00', participante: 'Carla Ximena Flores', monto: 50 },
        ],
      },
    ],
    supervisores: [
      {
        id: 1, nombre: 'Ana Supervisor', email: 'supervisor@proyectodeingresos.com',
        ingresos: [
          { participante: 'María Fernanda Rojas', hora: '08:12' },
          { participante: 'Jorge Luis Quispe', hora: '08:20' },
          { participante: 'Ana Belén Castro', hora: '08:35' },
        ],
      },
      {
        id: 2, nombre: 'Carlos Mendoza', email: 'carlos.mendoza@qpass.com',
        ingresos: [
          { participante: 'Ricardo Alanoca Mamani', hora: '08:41' },
          { participante: 'Daniela Vargas Soto', hora: '09:02' },
        ],
      },
    ],
  },
  ev2: {
    entradas: [
      { id: 1, nombre: 'Pedro Callisaya', documento: '2214563 LP', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=33', estado: 'ingresado', horaIngreso: '10:05' },
      { id: 2, nombre: 'Rosa Elena Mamani', documento: '3321654 LP', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=29', estado: 'ingresado', horaIngreso: '10:22' },
      { id: 3, nombre: 'Freddy Choque Apaza', documento: '4478912 LP', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=17', estado: 'pendiente', horaIngreso: null },
      { id: 4, nombre: 'Ximena Torrez', documento: '5589431 LP', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=38', estado: 'pendiente', horaIngreso: null },
    ],
    negocios: [
      {
        id: 1, nombre: 'Anticuchos Doña Julia', ayudantes: 1,
        ventas: [
          { hora: '11:15', cliente: 'Pedro Callisaya', monto: 35 },
          { hora: '12:40', cliente: 'Rosa Elena Mamani', monto: 25 },
        ],
      },
      {
        id: 2, nombre: "Jugos Naturales K'oa", ayudantes: 1,
        ventas: [
          { hora: '11:50', cliente: 'Rosa Elena Mamani', monto: 20 },
          { hora: '13:20', cliente: 'Pedro Callisaya', monto: 25 },
        ],
      },
    ],
    recargadores: [
      {
        id: 1, nombre: 'Juan Recargador',
        recargas: [
          { hora: '10:00', participante: 'Pedro Callisaya', monto: 60 },
          { hora: '10:15', participante: 'Rosa Elena Mamani', monto: 50 },
        ],
      },
    ],
    devoluciones: [
      {
        id: 1, nombre: 'Luis Devoluciones',
        retiros: [
          { hora: '19:30', participante: 'Pedro Callisaya', monto: 20 },
        ],
      },
    ],
    supervisores: [
      {
        id: 1, nombre: 'Ana Supervisor', email: 'supervisor@proyectodeingresos.com',
        ingresos: [
          { participante: 'Pedro Callisaya', hora: '10:05' },
          { participante: 'Rosa Elena Mamani', hora: '10:22' },
        ],
      },
    ],
  },
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

export default function Admin() {
  const location = useLocation();
  const navigate = useNavigate();
  // /admin/reportes abre directamente el apartado de Incidencias (accesible también
  // desde el menú lateral), sin pasar por la tarjeta del dashboard.
  const enReportes = location.pathname.endsWith('/reportes');

  const [eventoId, setEventoId] = useState(eventosDisponibles[0].id);
  const [vistaDetalle, setVistaDetalle] = useState(null); // null | entradas | recargadores | devoluciones | negocios | supervisores | incidencias
  const [itemSeleccionado, setItemSeleccionado] = useState(null); // id de la persona/negocio abierto dentro de una vista
  const [busqueda, setBusqueda] = useState('');

  const vistaActual = enReportes ? 'incidencias' : vistaDetalle;

  const [usuarioAdmin] = useState(() => {
    const guardado = localStorage.getItem('usuarioProyectoIngresos');
    return guardado ? JSON.parse(guardado) : { nombre: 'Admin' };
  });
  const [incidencias, setIncidencias] = useState(leerIncidencias);
  const [incidenciaEnResolucion, setIncidenciaEnResolucion] = useState(null);
  const [montoAjuste, setMontoAjuste] = useState('');

  const incidenciasPendientes = useMemo(
    () => incidencias.filter(i => i.estado === 'pendiente'),
    [incidencias]
  );

  const abrirResolucion = (incidencia) => {
    setIncidenciaEnResolucion(incidencia.id);
    // Admin decide libremente cuánto acreditar; si el recargador dejó un monto
    // de referencia lo usamos como punto de partida, si no arranca en blanco.
    setMontoAjuste(incidencia.montoSolicitado != null ? String(incidencia.montoSolicitado) : '');
  };

  const cancelarResolucion = () => {
    setIncidenciaEnResolucion(null);
    setMontoAjuste('');
  };

  const confirmarAjuste = (incidencia) => {
    const valor = Number(montoAjuste);
    if (montoAjuste === '' || Number.isNaN(valor) || valor < 0) return;

    const listaActualizada = incidencias.map(i => i.id === incidencia.id
      ? { ...i, estado: 'resuelto', ajusteAplicado: valor, resueltoPor: usuarioAdmin.nombre }
      : i);

    setIncidencias(listaActualizada);
    guardarIncidencias(listaActualizada);
    cancelarResolucion();
  };

  // --- SOLICITUDES DE COMPRA DE ENTRADAS Y REPORTES DE DATOS ---
  const [solicitudes, setSolicitudes] = useState(leerSolicitudes);
  const [reportesEntradas, setReportesEntradas] = useState(leerReportesEntradas);
  const [solicitudAbierta, setSolicitudAbierta] = useState(null);
  const [reporteEnEdicion, setReporteEnEdicion] = useState(null);
  const [valorCorreccion, setValorCorreccion] = useState('');

  const totalEntradasCompradas = useMemo(
    () => solicitudes.reduce((suma, c) => suma + c.entradas.length, 0),
    [solicitudes]
  );
  const reportesEntradasPendientes = useMemo(
    () => reportesEntradas.filter(r => r.estado === 'pendiente'),
    [reportesEntradas]
  );

  const toggleSolicitud = (id) => setSolicitudAbierta(prev => prev === id ? null : id);

  const abrirCorreccion = (reporte) => {
    setReporteEnEdicion(reporte.id);
    const valorActual = reporte.campo === 'nombre' ? reporte.participanteNombre
      : reporte.campo === 'correo' ? reporte.correoActual
      : reporte.celularActual;
    setValorCorreccion(valorActual || '');
  };

  const cancelarCorreccion = () => {
    setReporteEnEdicion(null);
    setValorCorreccion('');
  };

  const guardarCorreccion = (reporte) => {
    if (!valorCorreccion.trim()) return;

    const solicitudesActualizadas = solicitudes.map(compra => {
      if (compra.id !== reporte.compraId) return compra;
      return {
        ...compra,
        entradas: compra.entradas.map(ent => ent.id === reporte.entradaId
          ? { ...ent, [reporte.campo]: valorCorreccion.trim() }
          : ent),
      };
    });
    setSolicitudes(solicitudesActualizadas);
    guardarSolicitudes(solicitudesActualizadas);

    const reportesActualizados = reportesEntradas.map(r => r.id === reporte.id
      ? { ...r, estado: 'resuelto', valorCorregido: valorCorreccion.trim(), resueltoPor: usuarioAdmin.nombre }
      : r);
    setReportesEntradas(reportesActualizados);
    guardarReportesEntradas(reportesActualizados);

    cancelarCorreccion();
  };

  const datos = datosPorEvento[eventoId];

  const statsEntradas = useMemo(() => {
    const total = datos.entradas.length;
    const ingresaron = datos.entradas.filter(p => p.estado === 'ingresado').length;
    const faltan = total - ingresaron;
    const pctIngresaron = total ? Math.round((ingresaron / total) * 1000) / 10 : 0;
    const pctFaltan = total ? Math.round((faltan / total) * 1000) / 10 : 0;
    return { total, ingresaron, faltan, pctIngresaron, pctFaltan };
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
      .map(n => ({ ...n, ventasTotal: sumar(n.ventas, 'monto') }))
      .sort((a, b) => b.ventasTotal - a.ventasTotal),
    [datos]
  );

  const topClientesOrdenados = useMemo(() => {
    const consumos = {};
    datos.negocios.forEach(n => {
      n.ventas.forEach(v => {
        const clave = v.cliente;
        consumos[clave] = (consumos[clave] || 0) + v.monto;
      });
    });
    return Object.entries(consumos)
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [datos]);

  // --- RESUMEN FINANCIERO GENERAL (para que el dashboard no se vea vacío) ---
  const totalRecargadoEvento = useMemo(() => sumar(recargadoresOrdenados, 'totalRecargado'), [recargadoresOrdenados]);
  const totalDevueltoEvento = useMemo(() => sumar(devolucionesOrdenadas, 'totalDevuelto'), [devolucionesOrdenadas]);
  const totalConsumoClientes = useMemo(() => sumar(negociosOrdenados, 'ventasTotal'), [negociosOrdenados]);

  const actividadReciente = useMemo(() => {
    const eventos = [];
    datos.recargadores.forEach(r => r.recargas.forEach(t => eventos.push({
      hora: t.hora, tipo: 'recarga', detalle: `${r.nombre} recargó a ${t.participante}`, monto: t.monto,
    })));
    datos.devoluciones.forEach(d => d.retiros.forEach(t => eventos.push({
      hora: t.hora, tipo: 'devolucion', detalle: `${d.nombre} devolvió saldo a ${t.participante}`, monto: t.monto,
    })));
    datos.negocios.forEach(n => n.ventas.forEach(t => eventos.push({
      hora: t.hora, tipo: 'venta', detalle: `${n.nombre} le vendió a ${t.cliente}`, monto: t.monto,
    })));
    datos.supervisores.forEach(s => s.ingresos.forEach(t => eventos.push({
      hora: t.hora, tipo: 'ingreso', detalle: `${s.nombre} dejó ingresar a ${t.participante}`, monto: null,
    })));
    return eventos.sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 8);
  }, [datos]);

  const iconoActividad = {
    recarga: <FaCoins color="var(--verde-recarga-texto)" />,
    devolucion: <FaBoxOpen color="var(--ambar-aviso-texto)" />,
    venta: <FaShoppingBag color="var(--coral-compra)" />,
    ingreso: <FaUserCheck color="var(--cian-digital-texto)" />,
  };

  const entradasFiltradas = useMemo(() => {
    return datos.entradas.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.documento.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [datos, busqueda]);

  const abrirDetalle = (vista) => {
    setBusqueda('');
    setItemSeleccionado(null);
    setVistaDetalle(vista);
    // La vista de "Reportes" agrupa incidencias de recarga y reportes de datos de entradas.
    if (vista === 'incidencias') {
      setIncidencias(leerIncidencias());
      setReportesEntradas(leerReportesEntradas());
      cancelarCorreccion();
    }
    // Refrescamos por si hay solicitudes nuevas de Usuario Normal.
    if (vista === 'solicitudesEntradas') {
      setSolicitudes(leerSolicitudes());
      setSolicitudAbierta(null);
    }
  };

  const volver = () => {
    setBusqueda('');
    setItemSeleccionado(null);
    setVistaDetalle(null);
    // Si se entró directo por /admin/reportes, "volver" regresa al dashboard real.
    if (enReportes) navigate('/admin');
  };

  const volverALaLista = () => setItemSeleccionado(null);

  const recargadorAbierto = vistaActual === 'recargadores' && itemSeleccionado
    ? recargadoresOrdenados.find(r => r.id === itemSeleccionado) : null;
  const devolucionAbierta = vistaActual === 'devoluciones' && itemSeleccionado
    ? devolucionesOrdenadas.find(d => d.id === itemSeleccionado) : null;
  const negocioAbierto = vistaActual === 'negocios' && itemSeleccionado
    ? negociosOrdenados.find(n => n.id === itemSeleccionado) : null;
  const supervisorAbierto = vistaActual === 'supervisores' && itemSeleccionado
    ? datos.supervisores.find(s => s.id === itemSeleccionado) : null;

  return (
    <div className="pi-dash-container">

      <div className="pi-dash-header">
        <h2>Dashboard General</h2>
        <div className="pi-dash-selector-evento">
          <FaCalendarAlt />
          <select value={eventoId} onChange={(e) => { setEventoId(e.target.value); volver(); }}>
            {eventosDisponibles.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= VISTA GENERAL ================= */}
      {vistaActual === null && (
        <>
          {/* --- RESUMEN FINANCIERO --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo">Resumen Financiero del Evento</h3>
            <div className="pi-dash-resumen-grid">
              <div className="pi-dash-resumen-card">
                <FaCoins color="var(--verde-recarga-texto)" size={22} />
                <span className="numero">{totalRecargadoEvento} pts</span>
                <span className="label">Total Recargado</span>
              </div>
              <div className="pi-dash-resumen-card">
                <FaBoxOpen color="var(--ambar-aviso-texto)" size={22} />
                <span className="numero">{totalDevueltoEvento} pts</span>
                <span className="label">Total Devuelto</span>
              </div>
              <div className="pi-dash-resumen-card">
                <FaShoppingBag color="var(--coral-compra)" size={22} />
                <span className="numero">{totalConsumoClientes} pts</span>
                <span className="label">Consumido por Clientes (total de totales)</span>
              </div>
              <div className="pi-dash-resumen-card">
                <FaWallet color="var(--indigo-profundo)" size={22} />
                <span className="numero">{totalRecargadoEvento - totalDevueltoEvento - totalConsumoClientes} pts</span>
                <span className="label">Saldo en Circulación</span>
              </div>
            </div>
          </section>

          {/* --- ENTRADAS AL EVENTO --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo">Entradas al Evento</h3>
            <div className="pi-dash-stats-grid">
              <div className="pi-dash-stat-card">
                <div className="pi-dash-stat-icon pi-dash-icon-total"><FaTicketAlt /></div>
                <div className="pi-dash-stat-info">
                  <span className="numero">{statsEntradas.total}</span>
                  <span className="label">Total de Entradas</span>
                </div>
              </div>
              <div className="pi-dash-stat-card">
                <div className="pi-dash-stat-icon pi-dash-icon-ok"><FaCheckCircle /></div>
                <div className="pi-dash-stat-info">
                  <span className="numero">{statsEntradas.ingresaron}</span>
                  <span className="label">Ya Ingresaron</span>
                </div>
                <span className="pi-dash-porcentaje pi-dash-badge-ok">{statsEntradas.pctIngresaron}%</span>
              </div>
              <div className="pi-dash-stat-card">
                <div className="pi-dash-stat-icon pi-dash-icon-pend"><FaHourglassHalf /></div>
                <div className="pi-dash-stat-info">
                  <span className="numero">{statsEntradas.faltan}</span>
                  <span className="label">Faltan por Ingresar</span>
                </div>
                <span className="pi-dash-porcentaje pi-dash-badge-pend">{statsEntradas.pctFaltan}%</span>
              </div>
            </div>

            <div className="pi-dash-progreso-barra">
              <div className="pi-dash-progreso-relleno" style={{ width: `${statsEntradas.pctIngresaron}%` }} />
            </div>

            <button className="pi-dash-btn-detalle" onClick={() => abrirDetalle('entradas')}>
              <FaUserCheck /> Ver detalle de participantes
            </button>
          </section>

          {/* --- PERSONAL DEL EVENTO --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo">Personal del Evento</h3>
            <div className="pi-dash-roles-grid">
              <button className="pi-dash-rol-card" onClick={() => abrirDetalle('negocios')}>
                <FaStore className="pi-dash-rol-icon" />
                <span className="numero">{datos.negocios.length}</span>
                <span className="label">Usuarios Negocio</span>
              </button>
              <button className="pi-dash-rol-card" onClick={() => abrirDetalle('recargadores')}>
                <FaCashRegister className="pi-dash-rol-icon" />
                <span className="numero">{datos.recargadores.length}</span>
                <span className="label">Recargadores</span>
              </button>
              <button className="pi-dash-rol-card" onClick={() => abrirDetalle('supervisores')}>
                <FaChartPie className="pi-dash-rol-icon" />
                <span className="numero">{datos.supervisores.length}</span>
                <span className="label">Supervisores</span>
              </button>
              <button className="pi-dash-rol-card" onClick={() => abrirDetalle('devoluciones')}>
                <FaBoxOpen className="pi-dash-rol-icon" />
                <span className="numero">{datos.devoluciones.length}</span>
                <span className="label">Devolución</span>
              </button>
              <button className="pi-dash-rol-card" onClick={() => abrirDetalle('negocios')}>
                <FaUserFriends className="pi-dash-rol-icon" />
                <span className="numero">{totalAyudantes}</span>
                <span className="label">Ayudantes (total)</span>
              </button>
              <button className="pi-dash-rol-card pi-dash-rol-card-alerta" onClick={() => abrirDetalle('incidencias')}>
                <FaExclamationTriangle className="pi-dash-rol-icon" />
                <span className="numero">{incidenciasPendientes.length + reportesEntradasPendientes.length}</span>
                <span className="label">Reportes</span>
              </button>
              <button className="pi-dash-rol-card pi-dash-rol-card-alerta" onClick={() => abrirDetalle('solicitudesEntradas')}>
                <FaTicketAlt className="pi-dash-rol-icon" />
                <span className="numero">{solicitudes.length}</span>
                <span className="label">Solicitudes de Entradas</span>
              </button>
            </div>
          </section>

          {/* --- ACTIVIDAD RECIENTE --- */}
          <section className="pi-dash-seccion">
            <h3 className="pi-dash-seccion-titulo"><FaClock color="var(--indigo-profundo)" /> Actividad Reciente</h3>
            <div className="pi-dash-actividad-lista">
              {actividadReciente.map((a, i) => (
                <div className="pi-dash-actividad-item" key={i}>
                  <span className="pi-dash-actividad-icono">{iconoActividad[a.tipo]}</span>
                  <span className="pi-dash-actividad-detalle">{a.detalle}</span>
                  {a.monto !== null && <span className="pi-dash-actividad-monto">{a.monto} pts</span>}
                  <span className="pi-dash-actividad-hora">{a.hora}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ================= DETALLE: ENTRADAS ================= */}
      {vistaActual === 'entradas' && (
        <section className="pi-dash-seccion">
          <button className="pi-dash-btn-volver" onClick={volver}><FaArrowLeft /> Volver al dashboard</button>
          <h3 className="pi-dash-seccion-titulo">Detalle de Participantes</h3>

          <div className="pi-dash-buscador">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="pi-dash-tabla-wrapper">
            <table className="pi-dash-tabla">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Documento</th>
                  <th>Entrada</th>
                  <th>Estado</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {entradasFiltradas.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="pi-dash-fila-persona">
                        <img src={p.foto} alt={p.nombre} className="pi-dash-mini-avatar" />
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.documento}</td>
                    <td>{p.tipoEntrada}</td>
                    <td>
                      {p.estado === 'ingresado'
                        ? <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Ingresó</span>
                        : <span className="pi-dash-badge pi-dash-badge-pend"><FaHourglassHalf /> Pendiente</span>}
                    </td>
                    <td>{p.horaIngreso || '—'}</td>
                  </tr>
                ))}
                {entradasFiltradas.length === 0 && (
                  <tr><td colSpan={5} className="pi-dash-sin-resultados">No se encontraron participantes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= DETALLE: RECARGADORES ================= */}
      {vistaActual === 'recargadores' && (
        <section className="pi-dash-seccion">
          {recargadorAbierto ? (
            <>
              <button className="pi-dash-btn-volver" onClick={volverALaLista}><FaArrowLeft /> Volver a Recargadores</button>
              <div className="pi-dash-detalle-header">
                <h3 className="pi-dash-seccion-titulo">{recargadorAbierto.nombre}</h3>
                <span className="pi-dash-detalle-total">Total recargado: <strong>{recargadorAbierto.totalRecargado} pts</strong></span>
              </div>
              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead><tr><th>Hora</th><th>Participante</th><th>Monto</th></tr></thead>
                  <tbody>
                    {recargadorAbierto.recargas.map((t, i) => (
                      <tr key={i}>
                        <td>{t.hora}</td>
                        <td>{t.participante}</td>
                        <td className="pi-dash-monto-celda"><FaCoins color="var(--verde-recarga-texto)" /> {t.monto} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <button className="pi-dash-btn-volver" onClick={volver}><FaArrowLeft /> Volver al dashboard</button>
              <h3 className="pi-dash-seccion-titulo">Recargadores</h3>

              <h4 className="pi-dash-subtitulo"><FaTrophy color="var(--coral-compra)" /> Top Recargadores</h4>
              <Podio lista={recargadoresOrdenados} valorKey="totalRecargado" unidad="pts" />

              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead>
                    <tr><th>Recargador</th><th>Total Recargado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {recargadoresOrdenados.map(r => (
                      <tr key={r.id}>
                        <td>{r.nombre}</td>
                        <td className="pi-dash-monto-celda"><FaCoins color="var(--verde-recarga-texto)" /> {r.totalRecargado} pts</td>
                        <td>
                          <button className="pi-dash-btn-ver" onClick={() => setItemSeleccionado(r.id)}>
                            <FaExchangeAlt /> Ver recargas
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* ================= DETALLE: DEVOLUCIONES ================= */}
      {vistaActual === 'devoluciones' && (
        <section className="pi-dash-seccion">
          {devolucionAbierta ? (
            <>
              <button className="pi-dash-btn-volver" onClick={volverALaLista}><FaArrowLeft /> Volver a Devoluciones</button>
              <div className="pi-dash-detalle-header">
                <h3 className="pi-dash-seccion-titulo">{devolucionAbierta.nombre}</h3>
                <span className="pi-dash-detalle-total">Total devuelto: <strong>{devolucionAbierta.totalDevuelto} pts</strong></span>
              </div>
              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead><tr><th>Hora</th><th>Participante</th><th>Monto</th></tr></thead>
                  <tbody>
                    {devolucionAbierta.retiros.map((t, i) => (
                      <tr key={i}>
                        <td>{t.hora}</td>
                        <td>{t.participante}</td>
                        <td className="pi-dash-monto-celda"><FaBoxOpen color="var(--ambar-aviso-texto)" /> {t.monto} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <button className="pi-dash-btn-volver" onClick={volver}><FaArrowLeft /> Volver al dashboard</button>
              <h3 className="pi-dash-seccion-titulo">Encargados de Devolución</h3>

              <h4 className="pi-dash-subtitulo"><FaTrophy color="var(--coral-compra)" /> Top Devoluciones</h4>
              <Podio lista={devolucionesOrdenadas} valorKey="totalDevuelto" unidad="pts" />

              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead>
                    <tr><th>Encargado</th><th>Total Devuelto</th><th></th></tr>
                  </thead>
                  <tbody>
                    {devolucionesOrdenadas.map(d => (
                      <tr key={d.id}>
                        <td>{d.nombre}</td>
                        <td className="pi-dash-monto-celda"><FaBoxOpen color="var(--ambar-aviso-texto)" /> {d.totalDevuelto} pts</td>
                        <td>
                          <button className="pi-dash-btn-ver" onClick={() => setItemSeleccionado(d.id)}>
                            <FaExchangeAlt /> Ver devoluciones
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* ================= DETALLE: NEGOCIOS ================= */}
      {vistaActual === 'negocios' && (
        <section className="pi-dash-seccion">
          {negocioAbierto ? (
            <>
              <button className="pi-dash-btn-volver" onClick={volverALaLista}><FaArrowLeft /> Volver a Usuarios Negocio</button>
              <div className="pi-dash-detalle-header">
                <h3 className="pi-dash-seccion-titulo">{negocioAbierto.nombre}</h3>
                <span className="pi-dash-detalle-total">Ventas totales: <strong>{negocioAbierto.ventasTotal} pts</strong> · {negocioAbierto.ayudantes} ayudante(s)</span>
              </div>
              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead><tr><th>Hora</th><th>Cliente</th><th>Monto</th></tr></thead>
                  <tbody>
                    {negocioAbierto.ventas.map((t, i) => (
                      <tr key={i}>
                        <td>{t.hora}</td>
                        <td>{t.cliente}</td>
                        <td className="pi-dash-monto-celda"><FaShoppingBag color="var(--coral-compra)" /> {t.monto} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <button className="pi-dash-btn-volver" onClick={volver}><FaArrowLeft /> Volver al dashboard</button>
              <h3 className="pi-dash-seccion-titulo">Usuarios Negocio</h3>

              <div className="pi-dash-total-destacado">
                <FaCoins color="var(--verde-recarga-texto)" />
                Consumo total de todos los clientes: <strong>{totalConsumoClientes} pts</strong>
              </div>

              <h4 className="pi-dash-subtitulo"><FaTrophy color="var(--coral-compra)" /> Top Negocios por Ventas</h4>
              <Podio lista={negociosOrdenados} valorKey="ventasTotal" unidad="pts" />

              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead>
                    <tr><th>Negocio</th><th>Ventas Totales</th><th>Ayudantes Asignados</th><th></th></tr>
                  </thead>
                  <tbody>
                    {negociosOrdenados.map(n => (
                      <tr key={n.id}>
                        <td>{n.nombre}</td>
                        <td className="pi-dash-monto-celda"><FaShoppingBag color="var(--coral-compra)" /> {n.ventasTotal} pts</td>
                        <td>{n.ayudantes}</td>
                        <td>
                          <button className="pi-dash-btn-ver" onClick={() => setItemSeleccionado(n.id)}>
                            <FaExchangeAlt /> Ver ventas
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="pi-dash-subtitulo pi-dash-subtitulo-espaciado"><FaTrophy color="var(--cian-digital)" /> Top Clientes por Consumo</h4>
              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead>
                    <tr><th>Cliente</th><th>Consumo Total</th></tr>
                  </thead>
                  <tbody>
                    {topClientesOrdenados.map((c, i) => (
                      <tr key={i}>
                        <td>{c.nombre}</td>
                        <td className="pi-dash-monto-celda">{c.monto} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* ================= DETALLE: SUPERVISORES ================= */}
      {vistaActual === 'supervisores' && (
        <section className="pi-dash-seccion">
          {supervisorAbierto ? (
            <>
              <button className="pi-dash-btn-volver" onClick={volverALaLista}><FaArrowLeft /> Volver a Supervisores</button>
              <div className="pi-dash-detalle-header">
                <h3 className="pi-dash-seccion-titulo">{supervisorAbierto.nombre}</h3>
                <span className="pi-dash-detalle-total">Dejó ingresar a <strong>{supervisorAbierto.ingresos.length}</strong> persona(s)</span>
              </div>
              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead><tr><th>Participante</th><th>Hora de Ingreso</th></tr></thead>
                  <tbody>
                    {supervisorAbierto.ingresos.map((t, i) => (
                      <tr key={i}>
                        <td>{t.participante}</td>
                        <td><FaCheckCircle color="var(--verde-recarga-texto)" /> {t.hora}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <button className="pi-dash-btn-volver" onClick={volver}><FaArrowLeft /> Volver al dashboard</button>
              <h3 className="pi-dash-seccion-titulo">Supervisores</h3>

              <div className="pi-dash-tabla-wrapper">
                <table className="pi-dash-tabla">
                  <thead>
                    <tr><th>Nombre</th><th>Correo</th><th>Personas que dejó ingresar</th><th></th></tr>
                  </thead>
                  <tbody>
                    {datos.supervisores.map(s => (
                      <tr key={s.id}>
                        <td>{s.nombre}</td>
                        <td>{s.email}</td>
                        <td>{s.ingresos.length}</td>
                        <td>
                          <button className="pi-dash-btn-ver" onClick={() => setItemSeleccionado(s.id)}>
                            <FaExchangeAlt /> Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* ================= DETALLE: REPORTES (INCIDENCIAS DE RECARGA + DATOS DE ENTRADAS) ================= */}
      {vistaActual === 'incidencias' && (
        <section className="pi-dash-seccion">
          <button className="pi-dash-btn-volver" onClick={volver}><FaArrowLeft /> Volver al dashboard</button>
          <h3 className="pi-dash-seccion-titulo">Reportes</h3>

          <h4 className="pi-dash-subtitulo"><FaCoins color="var(--verde-recarga-texto)" /> Incidencias de Recarga</h4>
          <p className="pi-dash-incidencias-nota">
            Reportes de un Recargador contando qué pasó con una recarga. Lee cada caso y decide qué hacer
            (por ejemplo, cuántos puntos acreditar) para cerrarlo.
          </p>

          <div className="pi-dash-tabla-wrapper">
            <table className="pi-dash-tabla">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Documento</th>
                  <th>Se le dio</th>
                  <th>Dijo que quería</th>
                  <th>Qué pasó</th>
                  <th>Recargador</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {incidencias.map(inc => (
                  <tr key={inc.id}>
                    <td>
                      <div className="pi-dash-fila-persona">
                        <img src={inc.foto} alt={inc.participante} className="pi-dash-mini-avatar" />
                        <span>{inc.participante}</span>
                      </div>
                    </td>
                    <td>{inc.documento}</td>
                    <td>{inc.montoEntregado} pts</td>
                    <td>{inc.montoSolicitado != null ? `${inc.montoSolicitado} pts` : '—'}</td>
                    <td>{inc.nota || '—'}</td>
                    <td>{inc.recargador}</td>
                    <td>
                      {inc.estado === 'pendiente'
                        ? <span className="pi-dash-badge pi-dash-badge-pend"><FaExclamationTriangle /> Pendiente</span>
                        : <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Resuelta (+{inc.ajusteAplicado} pts por {inc.resueltoPor})</span>}
                    </td>
                    <td>
                      {inc.estado === 'pendiente' && (
                        incidenciaEnResolucion === inc.id ? (
                          <div className="pi-dash-resolver-form">
                            <input
                              type="number"
                              min="0"
                              value={montoAjuste}
                              onChange={(e) => setMontoAjuste(e.target.value)}
                              autoFocus
                            />
                            <button className="pi-dash-btn-ver" onClick={() => confirmarAjuste(inc)}>
                              <FaCheckCircle /> Aplicar
                            </button>
                            <button className="pi-dash-btn-ver" onClick={cancelarResolucion}>Cancelar</button>
                          </div>
                        ) : (
                          <button className="pi-dash-btn-ver" onClick={() => abrirResolucion(inc)}>
                            <FaCoins /> Resolver
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
                {incidencias.length === 0 && (
                  <tr>
                    <td colSpan={8} className="pi-dash-sin-resultados">No hay incidencias de recarga reportadas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h4 className="pi-dash-subtitulo pi-dash-subtitulo-espaciado">
            <FaTicketAlt color="var(--ambar-aviso-texto)" /> Reportes de Datos de Entradas
          </h4>
          <p className="pi-dash-incidencias-nota">
            Reportes de Usuario Normal sobre nombre, correo o celular mal puestos en una entrada ya aprobada.
            Corrige el dato para cerrar el reporte.
          </p>
          <div className="pi-dash-tabla-wrapper">
            <table className="pi-dash-tabla">
              <thead>
                <tr>
                  <th>Comprador</th>
                  <th>Persona</th>
                  <th>Dato reportado</th>
                  <th>Valor actual</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reportesEntradas.map(rep => (
                  <tr key={rep.id}>
                    <td>{rep.compradorNombre}</td>
                    <td>{rep.participanteNombre}</td>
                    <td>{ETIQUETA_CAMPO_ENTRADA[rep.campo]}</td>
                    <td>{rep.campo === 'nombre' ? rep.participanteNombre : rep.campo === 'correo' ? rep.correoActual : (rep.celularActual || '—')}</td>
                    <td>{rep.descripcion}</td>
                    <td>
                      {rep.estado === 'pendiente'
                        ? <span className="pi-dash-badge pi-dash-badge-pend"><FaExclamationTriangle /> Pendiente</span>
                        : <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Corregido a "{rep.valorCorregido}"</span>}
                    </td>
                    <td>
                      {rep.estado === 'pendiente' && (
                        reporteEnEdicion === rep.id ? (
                          <div className="pi-dash-resolver-form ancho">
                            <input
                              type="text"
                              value={valorCorreccion}
                              onChange={(e) => setValorCorreccion(e.target.value)}
                              autoFocus
                            />
                            <button className="pi-dash-btn-ver" onClick={() => guardarCorreccion(rep)}>
                              <FaCheckCircle /> Guardar
                            </button>
                            <button className="pi-dash-btn-ver" onClick={cancelarCorreccion}>Cancelar</button>
                          </div>
                        ) : (
                          <button className="pi-dash-btn-ver" onClick={() => abrirCorreccion(rep)}>Corregir</button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
                {reportesEntradas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="pi-dash-sin-resultados">No hay reportes de datos incorrectos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= DETALLE: SOLICITUDES DE COMPRA DE ENTRADAS ================= */}
      {vistaActual === 'solicitudesEntradas' && (
        <section className="pi-dash-seccion">
          <button className="pi-dash-btn-volver" onClick={volver}><FaArrowLeft /> Volver al dashboard</button>
          <h3 className="pi-dash-seccion-titulo">Solicitudes de Compra de Entradas</h3>
          <p className="pi-dash-incidencias-nota">
            Detalle de cada lote de entradas compradas: para quién, con qué correo y celular, y si ya fue aprobado.
          </p>

          <div className="pi-dash-resumen-grid pi-dash-resumen-espaciado">
            <div className="pi-dash-resumen-card">
              <FaTicketAlt color="var(--indigo-profundo)" size={20} />
              <span className="numero">{solicitudes.length}</span>
              <span className="label">Solicitudes</span>
            </div>
            <div className="pi-dash-resumen-card">
              <FaUsers color="var(--cian-digital-texto)" size={20} />
              <span className="numero">{totalEntradasCompradas}</span>
              <span className="label">Entradas compradas en total</span>
            </div>
            <div className="pi-dash-resumen-card">
              <FaExclamationTriangle color="var(--ambar-aviso-texto)" size={20} />
              <span className="numero">{reportesEntradasPendientes.length}</span>
              <span className="label">Reportes de datos pendientes</span>
            </div>
          </div>

          <div className="pi-dash-tabla-wrapper">
            <table className="pi-dash-tabla">
              <thead>
                <tr>
                  <th>Comprador</th>
                  <th>Entradas</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(compra => (
                  <Fragment key={compra.id}>
                    <tr>
                      <td>
                        <div className="fila-nombre">{compra.compradorNombre}</div>
                        <div className="celda-secundaria">{compra.compradorEmail}</div>
                      </td>
                      <td>{compra.entradas.length}</td>
                      <td className="pi-dash-monto-celda">Bs. {compra.montoTotal}</td>
                      <td>
                        {compra.estado === 'confirmado'
                          ? <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Aprobado</span>
                          : <span className="pi-dash-badge pi-dash-badge-pend"><FaHourglassHalf /> En revisión</span>}
                      </td>
                      <td>{compra.fecha}</td>
                      <td>
                        <button className="pi-dash-btn-ver" onClick={() => toggleSolicitud(compra.id)}>
                          {solicitudAbierta === compra.id ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </td>
                    </tr>
                    {solicitudAbierta === compra.id && (
                      <tr>
                        <td colSpan={6} className="pi-dash-solicitud-detalle-celda">
                          <div className="pi-dash-solicitud-detalle">
                            <table className="pi-dash-tabla">
                              <thead>
                                <tr><th>Persona</th><th>Nombre</th><th>Correo</th><th>Celular</th><th>Categoría</th></tr>
                              </thead>
                              <tbody>
                                {compra.entradas.map((ent, i) => (
                                  <tr key={ent.id}>
                                    <td>{ent.isTitular ? 'Titular' : `Invitado ${i + 1}`}</td>
                                    <td>{ent.nombre}</td>
                                    <td>{ent.correo}</td>
                                    <td>{ent.celular || '—'}</td>
                                    <td>{ETIQUETA_CATEGORIA[ent.categoriaId] || ent.categoriaId}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {solicitudes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="pi-dash-sin-resultados">No hay solicitudes de compra registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </section>
      )}
    </div>
  );
}
