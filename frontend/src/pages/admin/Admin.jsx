import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaCheckCircle, FaHourglassHalf, FaUserCheck,
  FaStore, FaCashRegister, FaChartPie, FaBoxOpen, FaUserFriends, FaUsers,
  FaArrowLeft, FaSearch, FaTrophy, FaCoins, FaShoppingBag, FaWallet,
  FaExchangeAlt, FaClock, FaExclamationTriangle, FaSignOutAlt, FaMapMarkerAlt,
  FaKey, FaTimes
} from 'react-icons/fa';
import { leerSesion } from '../../api/client.js';
import api from '../../api/index.js';
import { formatearFecha } from '../../utils/eventos.js';
import './Admin.css';

const ETIQUETA_CAMPO_ENTRADA = { nombre: 'Nombre completo', correo: 'Correo electrónico', celular: 'Celular' };

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
      hora: hora(t.createdAt),
      participante: t.entrada?.nombre || 'Retiro de Usuario Negocio',
      monto: Number(t.monto),
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
      hora: hora(v.createdAt),
      cliente: v.entrada?.nombre || '—',
      monto: Number(v.montoTotal),
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

export default function Admin({ soloLectura = false, eventosPermitidos = null } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  // /admin/reportes y /admin/solicitudes abren directo su apartado (accesibles también desde
  // el menú lateral o desde los accesos rápidos de Gestión de Eventos), sin pasar por la
  // tarjeta del dashboard. Si llegan con state.eventoId (ej. desde Gestión de Eventos), se
  // abren ya sobre ese evento específico.
  const enReportes = location.pathname.endsWith('/reportes');
  const enSolicitudes = location.pathname.endsWith('/solicitudes');
  const eventoIdDesdeState = location.state?.eventoId || '';

  const [eventosDisponibles, setEventosDisponibles] = useState([]);
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

  useEffect(() => {
    api.eventos.listar().then(todos => {
      const disponibles = eventosPermitidos ? todos.filter(ev => eventosPermitidos.includes(ev.id)) : todos;
      setEventosDisponibles(disponibles);
      setEventoId(prev => prev || disponibles[0]?.id || '');
      if (soloLectura && disponibles.length > 0) setEventoSeleccionado(true);
    });
  }, [eventosPermitidos, soloLectura]);

  const [datos, setDatos] = useState(EVENTO_ACTIVIDAD_VACIA);
  const [incidencias, setIncidencias] = useState([]);
  const [incidenciaEnResolucion, setIncidenciaEnResolucion] = useState(null);
  const [montoAjuste, setMontoAjuste] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [reportesEntradas, setReportesEntradas] = useState([]);

  const cargarDatosEvento = async () => {
    if (!eventoId) return;
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

    setIncidencias(incidenciasR);
    setReportesEntradas(reportesR);
    setSolicitudes(comprasR);
    setDatos({
      entradas,
      recargadores: agruparPorOperador(recargasR, staffDe('Recargador'), 'recargas'),
      devoluciones: agruparPorOperador(devolucionesR, staffDe('Devolucion'), 'retiros'),
      negocios: agruparVentasPorNegocio(ventasR, puestosR, usuariosPorId),
      supervisores: staffDe('Supervisor'),
    });
  };

  useEffect(() => { cargarDatosEvento(); }, [eventoId]);

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

  const confirmarAjuste = async (incidencia) => {
    const valor = Number(montoAjuste);
    if (montoAjuste === '' || Number.isNaN(valor) || valor < 0) return;

    await api.incidencias.resolver(incidencia.id, valor);
    setIncidencias(await api.incidencias.listar({ eventoId }));
    cancelarResolucion();
  };

  // --- SOLICITUDES DE COMPRA DE ENTRADAS Y REPORTES DE DATOS ---
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

  // No hay envío de correo real: las contraseñas de las cuentas nuevas (invitados sin cuenta
  // previa) solo se ven una vez, en la respuesta de esta llamada — hay que compartirlas a mano.
  const [passwordsAMostrar, setPasswordsAMostrar] = useState(null);

  const aprobarSolicitud = async (compra) => {
    const { passwordsGeneradas, ...actualizada } = await api.compras.aprobar(compra.id);
    setSolicitudes(prev => prev.map(c => c.id === actualizada.id ? actualizada : c));
    if (Object.keys(passwordsGeneradas || {}).length > 0) {
      const entradasPorId = new Map(actualizada.entradas.map(e => [e.id, e]));
      setPasswordsAMostrar(Object.entries(passwordsGeneradas).map(([entradaId, password]) => ({
        nombre: entradasPorId.get(entradaId)?.nombre, correo: entradasPorId.get(entradaId)?.correo, password,
      })));
    }
  };

  const rechazarSolicitudCompra = async (compra) => {
    const motivo = window.prompt(`¿Por qué se rechaza la solicitud de ${compra.comprador.nombre}? (lo verá el comprador)`);
    if (motivo === null) return;
    const actualizada = await api.compras.rechazar(compra.id, motivo);
    setSolicitudes(prev => prev.map(c => c.id === actualizada.id ? actualizada : c));
  };

  const abrirCorreccion = (reporte) => {
    setReporteEnEdicion(reporte.id);
    const valorActual = reporte.campo === 'nombre' ? reporte.entrada.nombre
      : reporte.campo === 'correo' ? reporte.entrada.correo
      : reporte.entrada.celular;
    setValorCorreccion(valorActual || '');
  };

  const cancelarCorreccion = () => {
    setReporteEnEdicion(null);
    setValorCorreccion('');
  };

  const guardarCorreccion = async (reporte) => {
    if (!valorCorreccion.trim()) return;
    await api.reportesEntrada.corregir(reporte.id, valorCorreccion.trim());
    setReportesEntradas(await api.reportesEntrada.listar({ eventoId }));
    await cargarDatosEvento();
    cancelarCorreccion();
  };

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
    return eventos.sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 8);
  }, [datos]);

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
        (p.documento || '').toLowerCase().includes(busqueda.toLowerCase())
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
      cancelarCorreccion();
    }
    // Refrescamos por si hay solicitudes nuevas de Usuario Normal.
    if (vista === 'solicitudesEntradas') {
      api.compras.listar({ eventoId }).then(setSolicitudes);
      setSolicitudAbierta(null);
    }
  };

  const volver = () => {
    setBusqueda('');
    setItemSeleccionado(null);
    setVistaDetalle(null);
    setFiltroEntradas(null);
    // Si se entró directo por /admin/reportes o /admin/solicitudes, "volver" regresa al dashboard real.
    if (enReportes || enSolicitudes) navigate('/admin');
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

  const volverALaLista = () => setItemSeleccionado(null);

  const recargadorAbierto = vistaActual === 'recargadores' && itemSeleccionado
    ? recargadoresOrdenados.find(r => r.id === itemSeleccionado) : null;
  const devolucionAbierta = vistaActual === 'devoluciones' && itemSeleccionado
    ? devolucionesOrdenadas.find(d => d.id === itemSeleccionado) : null;
  const negocioAbierto = vistaActual === 'negocios' && itemSeleccionado
    ? negociosOrdenados.find(n => n.id === itemSeleccionado) : null;

  return (
    <div className="pi-dash-container">

      <div className="pi-dash-header">
        {mostrarSelectorEventos ? (
          <h2>Selecciona un Evento</h2>
        ) : (
          <div className="pi-dash-header-titulo">
            <button className="pi-dash-btn-volver-evento" onClick={volverASeleccionEvento}>
              <FaArrowLeft /> Cambiar de evento
            </button>
            <h2>{eventoActual?.nombre}</h2>
          </div>
        )}
      </div>

      {mostrarSelectorEventos ? (
        <section className="pi-dash-seccion">
          <div className="pi-dash-eventos-grid">
            {eventosDisponibles.map(ev => (
              <button key={ev.id} className="pi-dash-evento-card" onClick={() => seleccionarEvento(ev.id)}>
                <img src={ev.imagen} alt={ev.nombre} className="pi-dash-evento-imagen" />
                <div className="pi-dash-evento-info">
                  <strong>{ev.nombre}</strong>
                  <span><FaMapMarkerAlt /> {ev.lugar} · {formatearFecha(ev.fecha)}</span>
                </div>
              </button>
            ))}
            {eventosDisponibles.length === 0 && (
              <p className="pi-dash-sin-resultados">
                {soloLectura ? 'Todavía no tienes eventos asignados.' : 'No hay eventos disponibles.'}
              </p>
            )}
          </div>
        </section>
      ) : (
        <>

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
              <button className="pi-dash-stat-card pi-dash-stat-card-click" onClick={() => abrirDetalle('entradas')}>
                <div className="pi-dash-stat-icon pi-dash-icon-total"><FaTicketAlt /></div>
                <div className="pi-dash-stat-info">
                  <span className="numero">{statsEntradas.total}</span>
                  <span className="label">Total de Entradas</span>
                </div>
              </button>
              <button className="pi-dash-stat-card pi-dash-stat-card-click" onClick={() => abrirDetalle('entradas', 'ingresado')}>
                <div className="pi-dash-stat-icon pi-dash-icon-ok"><FaCheckCircle /></div>
                <div className="pi-dash-stat-info">
                  <span className="numero">{statsEntradas.ingresaron}</span>
                  <span className="label">Ya Ingresaron</span>
                </div>
                <span className="pi-dash-porcentaje pi-dash-badge-ok">{statsEntradas.pctIngresaron}%</span>
              </button>
              <button className="pi-dash-stat-card pi-dash-stat-card-click" onClick={() => abrirDetalle('entradas', 'dentro')}>
                <div className="pi-dash-stat-icon pi-dash-icon-dentro"><FaUsers /></div>
                <div className="pi-dash-stat-info">
                  <span className="numero">{statsEntradas.dentro}</span>
                  <span className="label">Están Dentro</span>
                </div>
              </button>
              <button className="pi-dash-stat-card pi-dash-stat-card-click" onClick={() => abrirDetalle('entradas', 'pendiente')}>
                <div className="pi-dash-stat-icon pi-dash-icon-pend"><FaHourglassHalf /></div>
                <div className="pi-dash-stat-info">
                  <span className="numero">{statsEntradas.faltan}</span>
                  <span className="label">Faltan por Ingresar</span>
                </div>
                <span className="pi-dash-porcentaje pi-dash-badge-pend">{statsEntradas.pctFaltan}%</span>
              </button>
              <button className="pi-dash-stat-card pi-dash-stat-card-click" onClick={() => abrirDetalle('entradas', 'salio')}>
                <div className="pi-dash-stat-icon pi-dash-icon-salio"><FaSignOutAlt /></div>
                <div className="pi-dash-stat-info">
                  <span className="numero">{statsEntradas.salieron}</span>
                  <span className="label">Ya Salieron</span>
                </div>
              </button>
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
          <h3 className="pi-dash-seccion-titulo">{tituloEntradasFiltro}</h3>

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
                </tr>
              </thead>
              <tbody>
                {entradasFiltradas.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="pi-dash-fila-persona">
                        {p.foto && <img src={p.foto} alt={p.nombre} className="pi-dash-mini-avatar" />}
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.documento || '—'}</td>
                    <td>{p.categoriaTicket?.nombre || '—'}</td>
                    <td>
                      {p.estadoIngreso === 'salio'
                        ? <span className="pi-dash-badge pi-dash-badge-salio"><FaSignOutAlt /> Salió</span>
                        : p.estadoIngreso === 'ingresado'
                        ? <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Ingresó</span>
                        : <span className="pi-dash-badge pi-dash-badge-pend"><FaHourglassHalf /> Pendiente</span>}
                    </td>
                  </tr>
                ))}
                {entradasFiltradas.length === 0 && (
                  <tr><td colSpan={4} className="pi-dash-sin-resultados">No se encontraron participantes.</td></tr>
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
          <button className="pi-dash-btn-volver" onClick={volver}><FaArrowLeft /> Volver al dashboard</button>
          <h3 className="pi-dash-seccion-titulo">Supervisores</h3>
          <p className="pi-dash-incidencias-nota">
            El sistema no registra qué supervisor gestionó cada ingreso individual; en total,
            <strong> {statsEntradas.ingresaron}</strong> persona(s) ya ingresaron a este evento.
          </p>

          <div className="pi-dash-tabla-wrapper">
            <table className="pi-dash-tabla">
              <thead>
                <tr><th>Nombre</th><th>Correo</th></tr>
              </thead>
              <tbody>
                {datos.supervisores.map(s => (
                  <tr key={s.id}>
                    <td>{s.nombre}</td>
                    <td>{s.email}</td>
                  </tr>
                ))}
                {datos.supervisores.length === 0 && (
                  <tr><td colSpan={2} className="pi-dash-sin-resultados">No hay supervisores asignados a este evento.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
                        {inc.entrada.foto && <img src={inc.entrada.foto} alt={inc.entrada.nombre} className="pi-dash-mini-avatar" />}
                        <span>{inc.entrada.nombre}</span>
                      </div>
                    </td>
                    <td>{inc.entrada.documento || '—'}</td>
                    <td>{inc.montoEntregado} pts</td>
                    <td>{inc.montoSolicitado != null ? `${inc.montoSolicitado} pts` : '—'}</td>
                    <td>{inc.nota || '—'}</td>
                    <td>{inc.recargador.nombre}</td>
                    <td>
                      {inc.estado === 'pendiente'
                        ? <span className="pi-dash-badge pi-dash-badge-pend"><FaExclamationTriangle /> Pendiente</span>
                        : <span className="pi-dash-badge pi-dash-badge-ok"><FaCheckCircle /> Resuelta (+{inc.ajusteAplicado} pts por {inc.resueltoPor?.nombre})</span>}
                    </td>
                    <td>
                      {!soloLectura && inc.estado === 'pendiente' && (
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
                              <button className="pi-dash-btn-ver" onClick={() => aprobarSolicitud(compra)}>
                                <FaCheckCircle /> Aprobar
                              </button>
                              <button className="pi-dash-btn-ver" onClick={() => rechazarSolicitudCompra(compra)}>
                                <FaExclamationTriangle /> Rechazar
                              </button>
                            </>
                          )}
                          <button className="pi-dash-btn-ver" onClick={() => toggleSolicitud(compra.id)}>
                            {solicitudAbierta === compra.id ? 'Ocultar' : 'Ver detalle'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {solicitudAbierta === compra.id && (
                      <tr>
                        <td colSpan={6} className="pi-dash-solicitud-detalle-celda">
                          <div className="pi-dash-solicitud-detalle" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '0 0 auto' }}>
                              <p style={{ fontWeight: 700, marginBottom: '8px' }}>Comprobante de pago</p>
                              {compra.comprobanteUrl ? (
                                <a href={compra.comprobanteUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={compra.comprobanteUrl}
                                    alt={`Comprobante de ${compra.comprador.nombre}`}
                                    style={{ maxWidth: '220px', maxHeight: '280px', borderRadius: '8px', border: '1px solid var(--borde-suave)', objectFit: 'contain' }}
                                  />
                                </a>
                              ) : (
                                <span className="pi-dash-sin-resultados">Sin comprobante</span>
                              )}
                            </div>
                            <table className="pi-dash-tabla" style={{ flex: '1 1 320px' }}>
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
                                    <td>{ent.categoriaTicket?.nombre || '—'}</td>
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
        </>
      )}

      {/* --- CONTRASEÑAS GENERADAS AL APROBAR (no hay envío de correo real) --- */}
      {passwordsAMostrar && (
        <div
          onClick={() => setPasswordsAMostrar(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--blanco, #fff)', borderRadius: '12px', padding: '24px', maxWidth: '520px', width: '90%', position: 'relative' }}
          >
            <button
              onClick={() => setPasswordsAMostrar(null)}
              style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              <FaTimes />
            </button>
            <h3><FaKey /> Cuentas nuevas creadas</h3>
            <p className="pi-dash-incidencias-nota">
              No hay envío de correo automático — comparte esta contraseña temporal a mano con cada invitado. Solo se muestra esta vez.
            </p>
            <div className="pi-dash-tabla-wrapper">
              <table className="pi-dash-tabla">
                <thead><tr><th>Nombre</th><th>Correo</th><th>Contraseña</th></tr></thead>
                <tbody>
                  {passwordsAMostrar.map((p, i) => (
                    <tr key={i}><td>{p.nombre}</td><td>{p.correo}</td><td><strong>{p.password}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
