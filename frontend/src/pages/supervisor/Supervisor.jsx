import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useModal } from '../../utils/useModal.js';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Buscador from '../../components/Buscador.jsx';
import FiltroJornada from '../../components/FiltroJornada.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useApi } from '../../utils/useApi.js';
import { useDetalleUrl } from '../../utils/useDetalleUrl.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaUsers, FaCheckCircle, FaQrcode, FaTimes,
  FaIdCard, FaTicketAlt,  FaUserCheck, FaExclamationTriangle,
  FaSignOutAlt, FaCamera, FaHistory, FaSignInAlt, FaUserSecret, FaSyncAlt,
  FaArrowLeft, FaCalendarAlt, FaMoon
} from 'react-icons/fa';

// Debe coincidir con MARGEN_INGRESO_ANTICIPADO_HORAS del backend
// (backend/src/modules/entradas/entradas.service.ts). Ver README → "Reglas de negocio".
const MARGEN_INGRESO_ANTICIPADO_HORAS = 3;
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { subirFotoCapturada } from '../../utils/imagenes.js';
import { formatearFecha, nombreJornada, mostrarJornada, opcionesJornada, estadoEvento, filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import CapturarFoto from '../../components/CapturarFoto.jsx';
import FotoZoom from '../../components/FotoZoom.jsx';
import './Supervisor.css';
import './GestionEntrega.css';

export default function Supervisor() {
  useTituloPagina('Control de acceso');
  const sesion = leerSesion();

  // Carga primaria (eventos asignados) con estados cargando/error/reintentar (Manual 8.9).
  const cargarEventos = useCallback(
    () => api.eventos.misAsignados(sesion.id, sesion.rol),
    [sesion.id, sesion.rol],
  );
  const {
    data: eventos,
    cargando: cargandoEventos,
    error: errorEventos,
    recargar: recargarEventos,
  } = useApi(cargarEventos, { inicial: [] });

  // El evento abierto vive en la URL (?evento=<id>): el botón "Atrás" del
  // navegador vuelve al selector en vez de salir de la página.
  const [eventoIdDetalle, abrirEventoUrl, cerrarEventoUrl] = useDetalleUrl('evento');
  const [participantes, setParticipantes] = useState([]);

  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [historialTarjeta, setHistorialTarjeta] = useState([]);
  const [fotoCapturadaTemporal, setFotoCapturadaTemporal] = useState(null);
  const [capturandoFoto, setCapturandoFoto] = useState(false);
  const [escaneando, setEscaneando] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');

  const [filtro, setFiltro] = useState('todos');
  const [filtroJornada, setFiltroJornada] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  // Buscador de la pantalla de selección de evento (antes de entrar a uno)
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [alertaToggle, setAlertaToggle] = useState(''); // Mensaje de error interno del modal
  // Al registrar un movimiento: un "flash" de confirmación de ~1 s ({ tipo, nombre }) y
  // después se vuelve a mostrar la tarjeta del asistente ya actualizada (como un reescaneo),
  // que se cierra a mano o sola a los 5 s (tarjetaAutoCierre).
  const [confirmacion, setConfirmacion] = useState(null);
  const [tarjetaAutoCierre, setTarjetaAutoCierre] = useState(false);


  const eventoDetalle = eventos.find(ev => ev.id === eventoIdDetalle) || null;

  // Carga los participantes del evento de la URL. Cubre abrir desde el selector,
  // refrescar la página y el botón Atrás/Adelante del navegador.
  useEffect(() => {
    if (!eventoIdDetalle) return;
    api.entradas.listar({ eventoId: eventoIdDetalle }).then(setParticipantes);
  }, [eventoIdDetalle]);

  const abrirEvento = (ev) => abrirEventoUrl(ev.id);
  const volverALista = () => cerrarEventoUrl();

  const stats = useMemo(() => {
    const total = participantes.length;
    const adentro = participantes.filter(p => p.estadoIngreso === 'ingresado').length;
    const afuera = participantes.filter(p => p.estadoIngreso === 'salio').length;
    const pendientes = participantes.filter(p => p.estadoIngreso === 'pendiente').length;
    const pctAdentro = total ? Math.round((adentro / total) * 1000) / 10 : 0;
    return { total, adentro, afuera, pendientes, pctAdentro };
  }, [participantes]);

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  const filtrosJornada = useMemo(() => opcionesJornada(participantes), [participantes]);
  const multiJornada = filtrosJornada.length > 0;

  const listaFiltrada = useMemo(() => {
    return participantes.filter(p => {
      const coincideFiltro = filtro === 'todos' || p.estadoIngreso === filtro;
      const coincideJornada =
        filtroJornada === 'todas' || (p.diaEventoId ?? null) === filtroJornada;
      const coincideBusqueda =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.documento || '').toLowerCase().includes(busqueda.toLowerCase());
      return coincideFiltro && coincideJornada && coincideBusqueda;
    });
  }, [participantes, filtro, filtroJornada, busqueda]);

  // ========================================================
  // ESCANEO REAL: abre la cámara, lee el QR y recién ahí le pregunta a la base quién es.
  // ========================================================
  const iniciarEscaneo = () => {
    setErrorEscaneo('');
    setEscaneando(true);
  };

  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setBuscando(true);
    try {
      const entrada = await api.entradas.buscarPorCodigo(codigo);
      setFotoCapturadaTemporal(null);
      setAlertaToggle('');
      setConfirmacion(null);
      setTarjetaAutoCierre(false);
      setTarjetaQR(entrada);
      api.entradas.registros(entrada.id).then(setHistorialTarjeta);
    } catch (err) {
      setErrorEscaneo(err.message);
    } finally {
      setBuscando(false);
    }
  };

  // ========================================================
  // FUNCIONES DE CÁMARA
  // ========================================================
  const descartarFoto = () => setFotoCapturadaTemporal(null);

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setHistorialTarjeta([]);
    setFotoCapturadaTemporal(null);
    setCapturandoFoto(false);
    setAlertaToggle('');
    setConfirmacion(null);
    setTarjetaAutoCierre(false);
  };

  // Modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  // Foco + ESC + scroll-lock de la tarjeta del asistente (look propio). El
  // escáner usa <Modal>; el flash de confirmación es transitorio (1 s).
  const refTarjeta = useModal(!!tarjetaQR, cerrarTarjeta);

  // Paso 1: el flash de confirmación dura ~1 s; al terminar se vuelve a la tarjeta del
  // asistente (ya actualizada) y arranca su cuenta regresiva de cierre.
  useEffect(() => {
    if (!confirmacion) return;
    const t = setTimeout(() => {
      setConfirmacion(null);
      setTarjetaAutoCierre(true);
    }, 1000);
    return () => clearTimeout(t);
  }, [confirmacion]);

  // Paso 2: esa tarjeta reabierta tras registrar se cierra sola a los 5 s, salvo que el
  // operador la cierre antes o se ponga a tomar otra foto.
  useEffect(() => {
    if (!tarjetaAutoCierre || !tarjetaQR || capturandoFoto) return;
    const t = setTimeout(() => cerrarTarjeta(), 5000);
    return () => clearTimeout(t);
  }, [tarjetaAutoCierre, tarjetaQR, capturandoFoto]);

  // ========================================================
  // REGISTRAR INGRESO / SALIDA — la foto es UNA sola por Entrada (persona-evento), guardada en
  // Entrada.foto. Es obligatoria mientras esa entrada no tenga foto todavía (primera vez, o si
  // se olvidó tomarla); una vez que existe, se reutiliza en cada ingreso/salida siguiente y no
  // hace falta volver a tomarla. El supervisor puede retomarla manualmente si quiere corregirla.
  // ========================================================
  const requiereFoto = !tarjetaQR?.usuario?.foto && !tarjetaQR?.foto;

  // La entrada escaneada está vinculada a un evento. Si ese evento no es el que
  // se está controlando, no se registra nada (la manilla es de otra fiesta).
  const eventoEntrada = tarjetaQR?.evento || null;
  const eventoNoCoincide = !!(
    tarjetaQR && eventoDetalle && tarjetaQR.eventoId && tarjetaQR.eventoId !== eventoDetalle.id
  );

  // "Foto de perfil" real (la que el usuario cargó en su cuenta) casi nunca existe — la
  // mayoría son invitados sin cuenta. Para esos casos la referencia es Entrada.foto, la
  // foto tomada la primera vez que esta entrada pasó por control.
  const fotoReferencia = tarjetaQR?.usuario?.foto || tarjetaQR?.foto || null;
  const fotoReferenciaLabel = tarjetaQR?.usuario?.foto ? 'FOTO DE PERFIL' : 'FOTO REGISTRADA';

  // Ventana de ingreso: desde N horas antes del inicio hasta la hora de fin. Si la
  // entrada escaneada tiene JORNADA, la ventana es la de esa noche (no la del
  // evento entero); si no, se usa el rango del evento. La salida no tiene ventana.
  // Se reevalúa cada minuto para que la puerta se habilite/cierre sola.
  const jornadaEntrada = tarjetaQR?.diaEvento || null;
  // Apertura/cierre de la ventana vigente (jornada si hay, si no el evento).
  const aperturaVentana = eventoDetalle
    ? new Date(new Date(jornadaEntrada?.inicio ?? eventoDetalle.fecha).getTime() - MARGEN_INGRESO_ANTICIPADO_HORAS * 60 * 60 * 1000)
    : null;
  const cierreVentana = eventoDetalle
    ? new Date(jornadaEntrada?.fin ?? eventoDetalle.fechaFin)
    : null;
  // ¿Nombramos la jornada en los mensajes? Solo si aporta (tiene nombre o no es la 1.ª noche).
  const refJornada = mostrarJornada(jornadaEntrada)
    ? `la jornada «${nombreJornada(jornadaEntrada)}» de "${eventoDetalle?.nombre}"`
    : `"${eventoDetalle?.nombre}"`;

  // Estado de la ventana de ingreso, recalculado cada minuto (la salida no tiene ventana):
  //   'ok' | 'finalizado' (evento cerrado) | 'cerrada' (ya pasó el fin) | 'aun_no' (todavía no abre)
  const [motivoVentana, setMotivoVentana] = useState('aun_no');
  const ingresoDentroDeVentana = motivoVentana === 'ok';
  useEffect(() => {
    const evaluar = () => {
      if (!eventoDetalle) return setMotivoVentana('aun_no');
      const ahora = Date.now();
      const apertura = aperturaVentana.getTime();
      const cierre = cierreVentana.getTime();
      if (eventoDetalle.estado === 'finalizado') return setMotivoVentana('finalizado');
      if (ahora > cierre) return setMotivoVentana('cerrada');
      if (ahora < apertura) return setMotivoVentana('aun_no');
      return setMotivoVentana('ok');
    };
    evaluar();
    const t = setInterval(evaluar, 60000);
    return () => clearInterval(t);
  }, [eventoDetalle, jornadaEntrada]); // eslint-disable-line react-hooks/exhaustive-deps

  const registrarMovimiento = async (tipo) => {
    if (eventoNoCoincide) {
      setAlertaToggle(
        `Esta entrada pertenece a "${eventoEntrada?.nombre || 'otro evento'}" y este control es de "${eventoDetalle.nombre}". No se puede registrar el movimiento acá.`
      );
      return;
    }
    if (tipo === 'salida' && tarjetaQR.estadoIngreso !== 'ingresado') {
      setAlertaToggle(
        tarjetaQR.estadoIngreso === 'salio'
          ? 'Esta persona ya registró su salida — no está adentro.'
          : 'Esta persona todavía no registró su ingreso — no se puede registrar una salida.'
      );
      return;
    }
    if (tipo === 'ingreso' && tarjetaQR.estadoIngreso === 'ingresado') {
      setAlertaToggle('Esta entrada ya figura como ingresada. Si la persona salió, registrá primero su salida.');
      return;
    }
    if (tipo === 'ingreso' && !ingresoDentroDeVentana) {
      if (motivoVentana === 'finalizado') {
        setAlertaToggle(`El evento "${eventoDetalle.nombre}" ya finalizó — esta entrada ya no es válida para ingresar.`);
      } else if (motivoVentana === 'cerrada') {
        setAlertaToggle(
          mostrarJornada(jornadaEntrada)
            ? `Esta entrada ya no es válida: era para ${refJornada}, que cerró el ${formatearFecha(cierreVentana)}.`
            : `El evento "${eventoDetalle.nombre}" ya cerró (terminó el ${formatearFecha(cierreVentana)}) — esta entrada ya no es válida para ingresar.`
        );
      } else {
        setAlertaToggle(
          `El ingreso para ${refJornada} todavía no está habilitado. Abre el ${formatearFecha(aperturaVentana)} (${MARGEN_INGRESO_ANTICIPADO_HORAS} h antes del inicio).`
        );
      }
      return;
    }
    if (requiereFoto && !fotoCapturadaTemporal) {
      setAlertaToggle('Toma una foto de esta entrada antes de registrar el movimiento.');
      return;
    }
    setAlertaToggle('');
    try {
      const actualizado = tipo === 'salida'
        ? await api.entradas.salida(tarjetaQR.id, fotoCapturadaTemporal, eventoDetalle.id)
        : await api.entradas.ingreso(tarjetaQR.id, fotoCapturadaTemporal, eventoDetalle.id);
      setFotoCapturadaTemporal(null);
      // Refresca la fila en la tabla/estadísticas y deja la tarjeta abierta pero
      // actualizada (nuevo estado + historial); encima va el flash de confirmación.
      setParticipantes(prev => prev.map(p => (p.id === actualizado.id ? actualizado : p)));
      setTarjetaQR(actualizado);
      api.entradas.registros(actualizado.id).then(setHistorialTarjeta);
      setTarjetaAutoCierre(false);
      setConfirmacion({ tipo, nombre: actualizado.nombre });
    } catch (err) {
      setAlertaToggle(err.message);
    }
  };

  if (!eventoDetalle) {
    return (
      <div className="pi-sup-container">
        <div className="pi-sup-header">
          <h1>Punto de control de accesos</h1>
        </div>
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <p className="pi-entrega-sin-eventos">Todavía no tienes ningún evento asignado. Pídele a Admin que te asigne uno.</p>
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
            <GrillaEventos eventos={eventosFiltrados} gridClassName="pi-entrega-eventos-grid">
              {ev => (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  onClick={() => abrirEvento(ev)}
                  disabled={estadoEvento(ev) === 'archivado'}
                  cta="Abrir control"
                />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pi-sup-container">

      <div className="pi-sup-header">
        <div>
          <button type="button" className="pi-entrega-btn-volver" onClick={volverALista}>
            <FaArrowLeft /> Cambiar de evento
          </button>
          <h1>{eventoDetalle.nombre}</h1>
        </div>

        <div className="pi-sup-simuladores">
          <button type="button" className="pi-sup-btn-escanear-general" onClick={iniciarEscaneo} disabled={escaneando || buscando}>
            <FaQrcode /> {buscando ? 'Buscando...' : 'Escanear Código QR'}
          </button>
        </div>
      </div>

      {errorEscaneo && (
        <p className="pi-entrega-aviso pi-entrega-aviso-error" style={{ marginBottom: '16px' }}>
          <FaExclamationTriangle /> {errorEscaneo}
        </p>
      )}

      {/* --- ESTADÍSTICAS --- */}
      <div className="pi-sup-stats-grid">
        <StatCard icon={<FaUsers />} tono="total" valor={stats.total} label="Total Participantes" />
        <StatCard
          icon={<FaUserCheck />}
          tono="ok"
          valor={stats.adentro}
          label="Personas Adentro"
          extra={<span className="pi-sup-stat-porcentaje pi-sup-badge-ok">{stats.pctAdentro}%</span>}
        />
        <StatCard icon={<FaSignOutAlt />} valor={stats.afuera} label="Salieron Temporalmente" />
      </div>

      {/* --- LISTADO DE AUDITORÍA --- */}
      <div className="pi-sup-lista-card">
        <div className="pi-sup-lista-header">
          <h3>Auditoría de Asistentes</h3>
          <div className="pi-sup-lista-controles">
            <Buscador
              valor={busqueda}
              onCambio={setBusqueda}
              placeholder="Buscar por nombre o CI…"
              etiqueta="Buscar asistente por nombre o CI"
              filtros={[
                { valor: 'todos', texto: 'Todos' },
                { valor: 'ingresado', texto: 'Adentro' },
                { valor: 'salio', texto: 'Afuera' },
                { valor: 'pendiente', texto: 'Pendientes' },
              ]}
              filtroActivo={filtro}
              onFiltro={setFiltro}
              etiquetaFiltros="Filtrar asistentes"
            />
            {multiJornada && (
              <FiltroJornada
                opciones={filtrosJornada}
                activo={filtroJornada}
                onCambio={setFiltroJornada}
                etiqueta="Filtrar asistentes por jornada"
              />
            )}
          </div>
        </div>

        <Tabla
          columnas={[
            'Participante',
            'Documento',
            ...(multiJornada ? ['Jornada'] : []),
            'Entrada',
            'Ingresos',
            'Salidas',
            'Estado Actual',
          ]}
          datos={listaFiltrada}
          vacio={busqueda.trim() || filtro !== 'todos' || filtroJornada !== 'todas'
            ? 'Ningún asistente coincide con la búsqueda.'
            : 'Todavía no hay asistentes en este evento.'}
          renderFila={p => (
            <tr key={p.id}>
              <td>
                <div className="pi-sup-fila-persona">
                  {p.foto && <img width="40" height="40" src={p.foto} alt={p.nombre} className="pi-sup-mini-avatar" />}
                  <span>{p.nombre}</span>
                </div>
              </td>
              <td>{p.documento || '—'}</td>
              {multiJornada && (
                <td>
                  {mostrarJornada(p.diaEvento)
                    ? <span className="pi-sup-badge-jornada">{nombreJornada(p.diaEvento)}</span>
                    : '—'}
                </td>
              )}
              <td>{p.categoriaTicket?.nombre || '—'}</td>
              <td>{p.vecesIngreso}</td>
              <td>{p.vecesSalida}</td>
              <td>
                {p.estadoIngreso === 'ingresado' && <span className="pi-sup-badge pi-sup-badge-ok">Adentro</span>}
                {p.estadoIngreso === 'salio' && <span className="pi-sup-badge pi-sup-badge-out">Salió</span>}
                {p.estadoIngreso === 'pendiente' && <span className="pi-sup-badge pi-sup-badge-pend">Pendiente</span>}
              </td>
            </tr>
          )}
        />
      </div>

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

      {/* =========================================================
          MODAL DE CONTROL DINÁMICO (INTERRUPTOR)
      ========================================================= */}
      {tarjetaQR && (
        <div className="pi-sup-modal-overlay" onClick={cerrarTarjeta}>
          <div
            ref={refTarjeta}
            tabIndex={-1}
            className="pi-sup-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Control de acceso de ${tarjetaQR.nombre}`}
          >

            <button type="button" className="pi-sup-btn-cerrar" onClick={cerrarTarjeta} aria-label="Cerrar">
              <FaTimes aria-hidden="true" />
            </button>

            {/* HEADER DE ESTADO */}
            <div className="pi-sup-tarjeta-estado">
              <div className="estado-badge">
                <FaCheckCircle /> Lectura Exitosa
              </div>
            </div>

            {/* FOTO (un solo círculo: la recién tomada, o la última que hay, o el botón para tomar una) */}
            <div className="pi-sup-fotos-comparacion single-photo">
              {!capturandoFoto && (
                <div className="foto-box">
                  {fotoCapturadaTemporal ? (
                    <div className="foto-capturada-container foto-recien-capturada">
                      <FotoZoom width={110} height={110} src={fotoCapturadaTemporal} alt="Foto tomada en la puerta" className="foto-img border-cyan" />
                      <span className="foto-badge-ok"><FaCheckCircle /> Foto capturada</span>
                      <button type="button" className="btn-retake" onClick={descartarFoto} aria-label="Volver a tomar la foto"><FaSyncAlt aria-hidden="true" /></button>
                      <span className="foto-label text-cyan"><FaUserSecret/> FOTO EN PUERTA</span>
                    </div>
                  ) : fotoReferencia ? (
                    <div className="foto-capturada-container">
                      <FotoZoom width={110} height={110} src={fotoReferencia} alt="Foto de referencia registrada" className="foto-img" />
                      <button type="button" className="btn-retake" onClick={() => setCapturandoFoto(true)} aria-label="Tomar una foto nueva"><FaCamera aria-hidden="true" /></button>
                      <span className="foto-label text-gray">{fotoReferenciaLabel}</span>
                    </div>
                  ) : (
                    <button type="button" className="foto-placeholder" onClick={() => setCapturandoFoto(true)}>
                      <FaCamera size={26} aria-hidden="true" />
                      <span>Tomar Foto<br/>Obligatoria</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {capturandoFoto && (
              <CapturarFoto
                onCapturada={async (foto) => {
                  setCapturandoFoto(false);
                  try {
                    setFotoCapturadaTemporal(await subirFotoCapturada(foto, 'ingresos'));
                  } catch (err) {
                    setErrorEscaneo(err.message);
                  }
                }}
                onCancelar={() => setCapturandoFoto(false)}
              />
            )}

            <h2 className="pi-sup-tarjeta-nombre">{tarjetaQR.nombre}</h2>

            {alertaToggle && (
              <div className="pi-sup-alerta-modal">
                <FaExclamationTriangle /> {alertaToggle}
              </div>
            )}

            <div className="pi-sup-modal-cuerpo">
            <div className="pi-sup-info-card">
              <div className={`info-row${eventoNoCoincide ? ' info-row--alerta' : ''}`}>
                <FaCalendarAlt className="info-icon" />
                <div>
                  <span className="info-label">EVENTO DE LA ENTRADA</span>
                  <span className="info-valor">{eventoEntrada?.nombre || eventoDetalle.nombre}</span>
                  {eventoNoCoincide && (
                    <span className="pi-sup-evento-mismatch">
                      <FaExclamationTriangle aria-hidden="true" /> Este control es de «{eventoDetalle.nombre}»
                    </span>
                  )}
                </div>
              </div>
              {tarjetaQR.diaEvento && (
                <div className="info-row">
                  <FaMoon className="info-icon" />
                  <div>
                    <span className="info-label">JORNADA</span>
                    <span className="info-valor">{nombreJornada(tarjetaQR.diaEvento)}</span>
                    <span className="pi-sup-jornada-horario">
                      {formatearFecha(tarjetaQR.diaEvento.inicio)} — {formatearFecha(tarjetaQR.diaEvento.fin)}
                    </span>
                  </div>
                </div>
              )}
              <div className="info-row">
                <FaIdCard className="info-icon" />
                <div>
                  <span className="info-label">DOCUMENTO</span>
                  <span className="info-valor">{tarjetaQR.documento || '—'}</span>
                </div>
              </div>
              <div className="info-row">
                <FaTicketAlt className="info-icon" />
                <div>
                  <span className="info-label">TIPO DE ENTRADA</span>
                  <span className="info-valor">{tarjetaQR.categoriaTicket?.nombre || '—'}</span>
                </div>
              </div>
            </div>

            <div className="pi-sup-historial-section">
              <h4 className="historial-title"><FaHistory /> Historial de Accesos</h4>
              {historialTarjeta.length === 0 ? (
                <p className="historial-vacio">Sin registros previos.</p>
              ) : (
                <div className="historial-list">
                  {historialTarjeta.map((mov) => (
                    <div key={mov.id} className={`historial-item ${mov.tipo === 'ingreso' ? 'item-in' : 'item-out'}`}>
                      {mov.foto
                        ? <FotoZoom width={32} height={32} src={mov.foto} alt="Foto del registro" className="historial-foto-thumb" />
                        : (mov.tipo === 'ingreso' ? <FaSignInAlt/> : <FaSignOutAlt/>)}
                      <span>
                        {mov.tipo === 'ingreso' ? 'Entrada' : 'Salida'} registrada el {formatearFecha(mov.createdAt)}
                        {' '}por {mov.registradoPor?.nombre}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>

            {/* =========================================
                FOOTER: la foto solo es obligatoria en el primer ingreso de esta entrada.
                Puede alternar ingreso/salida tantas veces como haga falta (ej. alguien
                que sale y vuelve a entrar) — no hay límite de ciclos.
            ========================================= */}
            <div className="pi-sup-modal-footer">
              {eventoNoCoincide ? (
                <div className="pi-sup-bloqueo-evento">
                  <FaExclamationTriangle aria-hidden="true" />
                  <span>
                    Esta manilla pertenece al evento <strong>«{eventoEntrada?.nombre || 'otro'}»</strong> y
                    este control atiende <strong>«{eventoDetalle.nombre}»</strong>. No se puede registrar
                    ingreso ni salida desde acá.
                  </span>
                  <button type="button" className="btn-cancelar" onClick={cerrarTarjeta}>Cerrar</button>
                </div>
              ) : (
                <>
                  <div className="pi-sup-toggle-switch">
                    <button
                      className={`toggle-option ${tarjetaQR.estadoIngreso === 'salio' ? 'active-out' : ''} ${tarjetaQR.estadoIngreso !== 'ingresado' ? 'sin-foto' : ''} ${requiereFoto && !fotoCapturadaTemporal ? 'sin-foto' : ''}`}
                      onClick={() => registrarMovimiento('salida')}
                    >
                      <FaSignOutAlt /> REGISTRAR SALIDA
                    </button>

                    <button
                      className={`toggle-option ${tarjetaQR.estadoIngreso === 'ingresado' ? 'active-in' : ''} ${tarjetaQR.estadoIngreso === 'ingresado' || !ingresoDentroDeVentana ? 'sin-foto' : ''} ${requiereFoto && !fotoCapturadaTemporal ? 'sin-foto' : ''}`}
                      onClick={() => registrarMovimiento('ingreso')}
                    >
                      <FaSignInAlt /> REGISTRAR INGRESO
                    </button>
                  </div>
                  {!ingresoDentroDeVentana && (
                    <p className="pi-sup-hint-foto">
                      {motivoVentana === 'finalizado'
                        ? `"${eventoDetalle.nombre}" ya finalizó: no se registran más ingresos. La salida sí está habilitada.`
                        : motivoVentana === 'cerrada'
                          ? `${mostrarJornada(jornadaEntrada) ? `La jornada «${nombreJornada(jornadaEntrada)}»` : 'El evento'} cerró el ${formatearFecha(cierreVentana)}: esta entrada ya no es válida para ingresar. La salida sí está habilitada.`
                          : `El ingreso abre el ${formatearFecha(aperturaVentana)} (${MARGEN_INGRESO_ANTICIPADO_HORAS} h antes del inicio). La salida sí está habilitada.`}
                    </p>
                  )}
                  {requiereFoto && !fotoCapturadaTemporal && (
                    <p className="pi-sup-hint-foto">Toma la foto de la puerta (arriba) para poder registrar el ingreso o salida.</p>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- FLASH DE CONFIRMACIÓN (~1 s) TRAS REGISTRAR INGRESO / SALIDA --- */}
      {confirmacion && (
        <div className="pi-sup-modal-overlay pi-sup-confirm-overlay">
          <div
            className={`pi-sup-confirm ${confirmacion.tipo === 'ingreso' ? 'confirm-in' : 'confirm-out'}`}
            role="status"
            aria-live="polite"
          >
            <div className="pi-sup-confirm-icono">
              {confirmacion.tipo === 'ingreso' ? <FaSignInAlt aria-hidden="true" /> : <FaSignOutAlt aria-hidden="true" />}
            </div>
            <h3>{confirmacion.tipo === 'ingreso' ? 'Ingreso registrado' : 'Salida registrada'}</h3>
            <p>{confirmacion.nombre}</p>
          </div>
        </div>
      )}
    </div>
  );
}