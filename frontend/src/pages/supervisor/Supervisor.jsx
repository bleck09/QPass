import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Buscador from '../../components/Buscador.jsx';
import FiltroJornada from '../../components/FiltroJornada.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useApi } from '../../utils/useApi.js';
import { useDetalleUrl } from '../../utils/useDetalleUrl.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import Boton from '../../components/Boton.jsx';
import Insignia from '../../components/Insignia.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import FichaParticipante from '../../components/FichaParticipante.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import {
  FaUsers, FaCheckCircle, FaQrcode,
  FaIdCard, FaTicketAlt, FaUserCheck,
  FaSignOutAlt, FaCamera, FaHistory, FaSignInAlt, FaUserSecret, FaSyncAlt,
  FaArrowLeft, FaCalendarAlt, FaMoon, FaUserShield, FaCalendarTimes, FaDoorOpen,
} from 'react-icons/fa';

// Debe coincidir con MARGEN_INGRESO_ANTICIPADO_HORAS del backend
// (backend/src/modules/entradas/entradas.service.ts). Ver README → "Reglas de negocio".
const MARGEN_INGRESO_ANTICIPADO_HORAS = 3;
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { subirFotoCapturada } from '../../utils/imagenes.js';
import { formatearFecha, nombreJornada, mostrarJornada, opcionesJornada, estadoEvento, filtrarEventos, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import CapturarFoto from '../../components/CapturarFoto.jsx';
import FotoZoom from '../../components/FotoZoom.jsx';
import ManillaFalsaModal from '../../components/ManillaFalsaModal.jsx';
import VerificarDuenoModal from '../../components/VerificarDuenoModal.jsx';
import { esManillaFalsa } from '../../utils/duplicados.js';
import './Supervisor.css';
import './GestionEntrega.css';

export default function Supervisor() {
  useTituloPagina('Control de acceso');
  const sesion = leerSesion();
  const avisos = useAvisos();

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
  // Movimiento que se está registrando ('ingreso' | 'salida'): spinner y sin
  // segundo toque (antes un doble toque mostraba un falso "ya ingresado").
  const [registrando, setRegistrando] = useState(null);
  // Al registrar un movimiento: un "flash" de confirmación de ~1 s ({ tipo, nombre }) y
  // después se vuelve a mostrar la tarjeta del asistente ya actualizada (como un reescaneo),
  // que se cierra a mano o sola a los 5 s (tarjetaAutoCierre).
  const [confirmacion, setConfirmacion] = useState(null);
  const [tarjetaAutoCierre, setTarjetaAutoCierre] = useState(false);
  // Manillas duplicadas: la copia escaneada (detalle del backend) y el flujo de
  // verificación del dueño real cuando su entrada ya figura adentro.
  const [manillaFalsa, setManillaFalsa] = useState(null);
  const [verificandoDueno, setVerificandoDueno] = useState(false);


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
        (ciDeEntrada(p) || '').toLowerCase().includes(busqueda.toLowerCase());
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
      const entrada = await api.entradas.buscarPorCodigo(codigo, { contexto: 'control_acceso' });
      setFotoCapturadaTemporal(null);
      setAlertaToggle('');
      setConfirmacion(null);
      setTarjetaAutoCierre(false);
      setTarjetaQR(entrada);
      api.entradas.registros(entrada.id).then(setHistorialTarjeta);
    } catch (err) {
      if (esManillaFalsa(err)) setManillaFalsa(err.detalle);
      else setErrorEscaneo(err.message);
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
    if (!tarjetaAutoCierre || !tarjetaQR || capturandoFoto || verificandoDueno) return;
    const t = setTimeout(() => cerrarTarjeta(), 5000);
    return () => clearTimeout(t);
  }, [tarjetaAutoCierre, tarjetaQR, capturandoFoto, verificandoDueno]);

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
      setAlertaToggle('Esta entrada ya figura como ingresada. Si la persona salió, registrá primero su salida. Si dice que nunca entró, puede que alguien haya usado una copia de su manilla: verificá si es el dueño.');
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
    if (registrando) return;
    setAlertaToggle('');
    setRegistrando(tipo);
    try {
      const codigoQr = tarjetaQR.codigoQrVinculado?.codigo;
      const actualizado = tipo === 'salida'
        ? await api.entradas.salida(tarjetaQR.id, fotoCapturadaTemporal, eventoDetalle.id, codigoQr)
        : await api.entradas.ingreso(tarjetaQR.id, fotoCapturadaTemporal, eventoDetalle.id, codigoQr);
      setFotoCapturadaTemporal(null);
      // Refresca la fila en la tabla/estadísticas y deja la tarjeta abierta pero
      // actualizada (nuevo estado + historial); encima va el flash de confirmación.
      setParticipantes(prev => prev.map(p => (p.id === actualizado.id ? actualizado : p)));
      setTarjetaQR(actualizado);
      api.entradas.registros(actualizado.id).then(setHistorialTarjeta);
      setTarjetaAutoCierre(false);
      setConfirmacion({ tipo, nombre: actualizado.nombre });
    } catch (err) {
      if (esManillaFalsa(err)) {
        cerrarTarjeta();
        setManillaFalsa(err.detalle);
      } else {
        setAlertaToggle(err.message);
      }
    } finally {
      setRegistrando(null);
    }
  };

  // El dueño real quedó verificado: entra con la manilla nueva (cuenta como ingreso).
  const alVerificarDueno = (actualizado) => {
    setVerificandoDueno(false);
    setFotoCapturadaTemporal(null);
    setAlertaToggle('');
    setParticipantes(prev => prev.map(p => (p.id === actualizado.id ? { ...p, ...actualizado, vecesIngreso: (p.vecesIngreso ?? 0) + 1 } : p)));
    setTarjetaQR(actualizado);
    api.entradas.registros(actualizado.id).then(setHistorialTarjeta);
    setTarjetaAutoCierre(false);
    setConfirmacion({ tipo: 'ingreso', nombre: actualizado.nombre });
  };

  if (!eventoDetalle) {
    return (
      <div className="pi-sup-container">
        <EncabezadoPagina titulo="Punto de control de accesos" icono={FaDoorOpen} subtitulo="Elegí el evento en el que vas a controlar la entrada." />
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <EstadoVacio
            icono={FaCalendarTimes}
            titulo="Todavía no tenés ningún evento asignado"
            mensaje="Pedile a Admin que te asigne uno para controlar la entrada."
          />
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
            <GrillaEventos eventos={eventosFiltrados}>
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

      <div className="qp-nav">
        <Boton variante="fantasma" tamano="sm" icono={FaArrowLeft} onClick={volverALista}>Cambiar de evento</Boton>
      </div>

      <EncabezadoPagina
        titulo={eventoDetalle.nombre}
        icono={FaDoorOpen}
        subtitulo="Escaneá la manilla para registrar ingresos y salidas."
        acciones={(
          <Boton tamano="lg" pildora icono={FaQrcode} onClick={iniciarEscaneo} cargando={buscando} disabled={escaneando}>
            {buscando ? 'Buscando…' : 'Escanear código QR'}
          </Boton>
        )}
      />

      {errorEscaneo && <AvisoFijo tono="error">{errorEscaneo}</AvisoFijo>}

      {/* --- ESTADÍSTICAS --- */}
      <div className="qp-stats">
        <StatCard icon={<FaUsers />} tono="total" valor={stats.total} label="Total de participantes" />
        <StatCard
          icon={<FaUserCheck />}
          tono="ok"
          valor={stats.adentro}
          label="Personas adentro"
          extra={<Insignia tono="ok">{stats.pctAdentro}%</Insignia>}
        />
        <StatCard icon={<FaSignOutAlt />} valor={stats.afuera} label="Salieron temporalmente" />
      </div>

      {/* --- LISTADO DE AUDITORÍA --- */}
      <div className="pi-sup-lista-card">
        <div className="pi-sup-lista-header">
          <h3>Auditoría de asistentes</h3>
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
              <td>{ciDeEntrada(p) || '—'}</td>
              {multiJornada && (
                <td>
                  {mostrarJornada(p.diaEvento)
                    ? <Insignia tono="info" icono={FaMoon}>{nombreJornada(p.diaEvento)}</Insignia>
                    : '—'}
                </td>
              )}
              <td>{p.categoriaTicket?.nombre || '—'}</td>
              <td>{p.vecesIngreso}</td>
              <td>{p.vecesSalida}</td>
              <td>
                {p.estadoIngreso === 'ingresado' && <Insignia tono="ok" punto>Adentro</Insignia>}
                {p.estadoIngreso === 'salio' && <Insignia tono="neutro">Salió</Insignia>}
                {p.estadoIngreso === 'pendiente' && <Insignia tono="warn">Pendiente</Insignia>}
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
        <Modal
          titulo={<><FaDoorOpen aria-hidden="true" /> Control de acceso</>}
          onCerrar={cerrarTarjeta}
          cerrarEnBackdrop={!registrando}
          className="pi-sup-modal-tarjeta"
        >

            {/* FOTO (un solo círculo: la recién tomada, o la última que hay, o el botón para tomar una) */}
            <div className="pi-sup-fotos-comparacion pi-sup-single-photo">
              {!capturandoFoto && (
                <div className="pi-sup-foto-box">
                  {fotoCapturadaTemporal ? (
                    <div className="pi-sup-foto-capturada-container pi-sup-foto-recien-capturada">
                      <FotoZoom width={110} height={110} src={fotoCapturadaTemporal} alt="Foto tomada en la puerta" className="pi-sup-foto-img pi-sup-border-cyan" />
                      <Insignia tono="ok" icono={FaCheckCircle} solida className="pi-sup-foto-badge-ok">Foto capturada</Insignia>
                      <button type="button" className="pi-sup-btn-retake" onClick={descartarFoto} aria-label="Volver a tomar la foto"><FaSyncAlt aria-hidden="true" /></button>
                      <span className="pi-sup-foto-label pi-sup-text-cyan"><FaUserSecret/> FOTO EN PUERTA</span>
                    </div>
                  ) : fotoReferencia ? (
                    <div className="pi-sup-foto-capturada-container">
                      <FotoZoom width={110} height={110} src={fotoReferencia} alt="Foto de referencia registrada" className="pi-sup-foto-img" />
                      <button type="button" className="pi-sup-btn-retake" onClick={() => setCapturandoFoto(true)} aria-label="Tomar una foto nueva"><FaCamera aria-hidden="true" /></button>
                      <span className="pi-sup-foto-label pi-sup-text-gray">{fotoReferenciaLabel}</span>
                    </div>
                  ) : (
                    <button type="button" className="pi-sup-foto-placeholder" onClick={() => setCapturandoFoto(true)}>
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
                    // Antes iba a errorEscaneo, que queda DETRÁS del modal: no se veía.
                    avisos.error(err.message, { titulo: 'No se pudo guardar la foto' });
                  }
                }}
                onCancelar={() => setCapturandoFoto(false)}
              />
            )}

            <div className="pi-sup-modal-cuerpo">
            <FichaParticipante
              estado={(
                <span className="btn-acciones">
                  <Insignia tono="ok" icono={FaCheckCircle} solida>Lectura exitosa</Insignia>
                  {tarjetaQR.estadoIngreso === 'ingresado' && <Insignia tono="ok" punto>Adentro</Insignia>}
                  {tarjetaQR.estadoIngreso === 'salio' && <Insignia tono="neutro">Salió</Insignia>}
                  {tarjetaQR.estadoIngreso === 'pendiente' && <Insignia tono="warn">Todavía no entró</Insignia>}
                </span>
              )}
              nombre={tarjetaQR.nombre}
              datos={[
                {
                  icono: FaCalendarAlt, etiqueta: 'Evento de la entrada', valor: eventoEntrada?.nombre || eventoDetalle.nombre,
                  nota: eventoNoCoincide ? `Este control es de «${eventoDetalle.nombre}»` : null,
                },
                tarjetaQR.diaEvento && {
                  icono: FaMoon, etiqueta: 'Jornada', valor: nombreJornada(tarjetaQR.diaEvento),
                  nota: `${formatearFecha(tarjetaQR.diaEvento.inicio)} — ${formatearFecha(tarjetaQR.diaEvento.fin)}`,
                },
                { icono: FaIdCard, etiqueta: 'Documento', valor: ciDeEntrada(tarjetaQR) || '—' },
                { icono: FaTicketAlt, etiqueta: 'Tipo de entrada', valor: tarjetaQR.categoriaTicket?.nombre || '—' },
              ]}
            />

            {alertaToggle && <AvisoFijo tono="error">{alertaToggle}</AvisoFijo>}

            <div className="pi-sup-historial-section">
              <h4 className="pi-sup-historial-title"><FaHistory aria-hidden="true" /> Historial de accesos</h4>
              {historialTarjeta.length === 0 ? (
                <EstadoVacio compacto icono={FaHistory} titulo="Sin registros previos" />
              ) : (
                <div className="pi-sup-historial-list">
                  {historialTarjeta.map((mov) => (
                    <div key={mov.id} className={`pi-sup-historial-item ${mov.tipo === 'salida' ? 'pi-sup-item-out' : 'pi-sup-item-in'}`}>
                      {mov.foto
                        ? <FotoZoom width={32} height={32} src={mov.foto} alt="Foto del registro" className="pi-sup-historial-foto-thumb" />
                        : (mov.tipo === 'salida' ? <FaSignOutAlt/> : <FaSignInAlt/>)}
                      <span>
                        {mov.tipo === 'verificacion_duplicado'
                          ? 'Dueño verificado (manilla duplicada) y entró con manilla nueva'
                          : `${mov.tipo === 'ingreso' ? 'Entrada' : 'Salida'} registrada`} el {formatearFecha(mov.createdAt)}
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
                <>
                  <AvisoFijo tono="error" titulo="No se puede registrar desde acá">
                    Esta manilla pertenece al evento «{eventoEntrada?.nombre || 'otro'}» y este control atiende
                    «{eventoDetalle.nombre}».
                  </AvisoFijo>
                  <div className="modal-actions">
                    <Boton variante="secundario" onClick={cerrarTarjeta}>Cerrar</Boton>
                  </div>
                </>
              ) : (
                <>
                  {!ingresoDentroDeVentana && (
                    <AvisoFijo tono="aviso">
                      {motivoVentana === 'finalizado'
                        ? `"${eventoDetalle.nombre}" ya finalizó: no se registran más ingresos. La salida sí está habilitada.`
                        : motivoVentana === 'cerrada'
                          ? `${mostrarJornada(jornadaEntrada) ? `La jornada «${nombreJornada(jornadaEntrada)}»` : 'El evento'} cerró el ${formatearFecha(cierreVentana)}: esta entrada ya no es válida para ingresar. La salida sí está habilitada.`
                          : `El ingreso abre el ${formatearFecha(aperturaVentana)} (${MARGEN_INGRESO_ANTICIPADO_HORAS} h antes del inicio). La salida sí está habilitada.`}
                    </AvisoFijo>
                  )}
                  {requiereFoto && !fotoCapturadaTemporal && (
                    <AvisoFijo tono="info" icono={FaCamera}>Tomá la foto de la puerta (arriba) para poder registrar el ingreso o la salida.</AvisoFijo>
                  )}
                  {/* Los botones siempre responden: si algo falta, explican por qué (alertaToggle). */}
                  <div className="pi-sup-movimientos">
                    <Boton
                      variante="secundario"
                      tamano="lg"
                      icono={FaSignOutAlt}
                      onClick={() => registrarMovimiento('salida')}
                      cargando={registrando === 'salida'}
                      disabled={!!registrando && registrando !== 'salida'}
                      className={tarjetaQR.estadoIngreso !== 'ingresado' ? 'pi-sup-mov-apagado' : ''}
                    >
                      Registrar salida
                    </Boton>
                    <Boton
                      variante="exito"
                      tamano="lg"
                      icono={FaSignInAlt}
                      onClick={() => registrarMovimiento('ingreso')}
                      cargando={registrando === 'ingreso'}
                      disabled={!!registrando && registrando !== 'ingreso'}
                      className={tarjetaQR.estadoIngreso === 'ingresado' || !ingresoDentroDeVentana || (requiereFoto && !fotoCapturadaTemporal) ? 'pi-sup-mov-apagado' : ''}
                    >
                      Registrar ingreso
                    </Boton>
                  </div>
                  {tarjetaQR.estadoIngreso === 'ingresado' && eventoDetalle.estado !== 'finalizado' && (
                    <Boton variante="fantasma" tamano="sm" icono={FaUserShield} onClick={() => setVerificandoDueno(true)}>
                      ¿Dice que nunca entró? Verificar dueño (posible copia)
                    </Boton>
                  )}
                </>
              )}
            </div>
        </Modal>
      )}

      {verificandoDueno && tarjetaQR && (
        <VerificarDuenoModal
          entrada={tarjetaQR}
          evento={eventoDetalle}
          onVerificado={alVerificarDueno}
          onCerrar={() => setVerificandoDueno(false)}
        />
      )}

      {manillaFalsa && (
        <ManillaFalsaModal detalle={manillaFalsa} onCerrar={() => setManillaFalsa(null)} />
      )}

      {/* --- FLASH DE CONFIRMACIÓN (~1 s) TRAS REGISTRAR INGRESO / SALIDA --- */}
      {confirmacion && createPortal(
        <div className="pi-sup-confirm-overlay">
          <div
            className={`pi-sup-confirm ${confirmacion.tipo === 'ingreso' ? 'pi-sup-confirm-in' : 'pi-sup-confirm-out'}`}
            role="status"
            aria-live="polite"
          >
            <div className="pi-sup-confirm-icono">
              {confirmacion.tipo === 'ingreso' ? <FaSignInAlt aria-hidden="true" /> : <FaSignOutAlt aria-hidden="true" />}
            </div>
            <h3>{confirmacion.tipo === 'ingreso' ? 'Ingreso registrado' : 'Salida registrada'}</h3>
            <p>{confirmacion.nombre}</p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}