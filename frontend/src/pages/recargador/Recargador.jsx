import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useModal } from '../../utils/useModal.js';
import { useApi } from '../../utils/useApi.js';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Buscador from '../../components/Buscador.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaHistory, FaTimes, FaIdCard, FaCoins, FaCheckCircle, FaWallet,
  FaExclamationTriangle, FaClipboardList, FaArrowLeft, FaCashRegister
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { estadoEvento, filtrarEventos, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import CorteCaja from '../../components/CorteCaja.jsx';
import EscanerQr from '../../components/EscanerQr.jsx';
import AvisoSinCaja from '../../components/AvisoSinCaja.jsx';
import FotoZoom from '../../components/FotoZoom.jsx';
import './Recargador.css';
import '../supervisor/GestionEntrega.css';

const montosRapidos = [20, 50, 100, 200];

export default function Recargador() {
  useTituloPagina('Recargar saldo');
  const sesion = leerSesion();

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/incidencias')
    ? 'incidencias'
    : location.pathname.endsWith('/caja') ? 'caja'
    : location.pathname.endsWith('/historial') ? 'historial' : 'escanear';

  // Carga primaria (lista de eventos asignados) con estados cargando/error/reintentar (Manual 8.9).
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

  const [eventoDetalle, setEventoDetalle] = useState(null);

  // §5.2 — no se puede recargar sin una caja de arqueo abierta para el evento.
  const cargarCaja = useCallback(
    () => (eventoDetalle ? api.cortesCaja.actual({ eventoId: eventoDetalle.id }) : Promise.resolve(null)),
    [eventoDetalle],
  );
  const { data: cajaAbierta, recargar: recargarCaja } = useApi(cargarCaja, { inicial: null, activo: !!eventoDetalle });
  // Al volver de la pestaña "Arqueo de caja" se refresca el estado de la caja.
  useEffect(() => { if (pestana === 'escanear') recargarCaja(); }, [pestana, recargarCaja]);

  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const [monto, setMonto] = useState('');
  const [recargaExitosa, setRecargaExitosa] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [incidencias, setIncidencias] = useState([]);

  // Reporte de incidencia: solo se ofrece DESPUÉS de confirmar la recarga,
  // cuando el recargador ya entregó lo que pudo y quiere avisar que faltó.
  const [mostrarFormIncidencia, setMostrarFormIncidencia] = useState(false);
  const [montoSolicitado, setMontoSolicitado] = useState('');
  const [notaIncidencia, setNotaIncidencia] = useState('');
  const [incidenciaReportada, setIncidenciaReportada] = useState(false);

  // Reporte de incidencia desde el Historial: por si el recargador cerró la
  // tarjeta sin reportar y quiere hacerlo después, para una recarga ya pasada.
  const [historialAReportar, setHistorialAReportar] = useState(null);
  const [montoSolicitadoHist, setMontoSolicitadoHist] = useState('');
  const [notaIncidenciaHist, setNotaIncidenciaHist] = useState('');
  const [historialReportados, setHistorialReportados] = useState([]);


  const abrirEvento = (ev) => {
    setEventoDetalle(ev);
    api.transacciones.listar({ eventoId: ev.id, tipo: 'recarga' }).then(lista =>
      setHistorial(lista.filter(t => t.operador.id === sesion.id))
    );
    api.incidencias.listar({ eventoId: ev.id }).then(setIncidencias);
  };

  const volverALista = () => setEventoDetalle(null);

  const irAIncidencias = () => {
    // Refrescamos por si Admin resolvió alguna desde su panel.
    if (eventoDetalle) api.incidencias.listar({ eventoId: eventoDetalle.id }).then(setIncidencias);
    navigate('/recargador/incidencias');
  };

  const totalHistorialHoy = useMemo(
    () => historial.reduce((suma, item) => suma + Number(item.monto), 0),
    [historial]
  );

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  const [busquedaHist, setBusquedaHist] = useState('');
  const historialFiltrado = useMemo(() => {
    const q = busquedaHist.trim().toLowerCase();
    if (!q) return historial;
    return historial.filter((item) =>
      `${item.entrada?.nombre || ''} ${ciDeEntrada(item.entrada) || ''}`.toLowerCase().includes(q),
    );
  }, [historial, busquedaHist]);

  const iniciarEscaneo = () => {
    setErrorEscaneo('');
    setEscaneando(true);
  };

  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setBuscando(true);
    try {
      const entrada = await api.entradas.buscarPorCodigo(codigo);
      if (!entrada.usuarioId) {
        setErrorEscaneo('Este participante no tiene una cuenta con billetera — no se le puede recargar.');
        return;
      }
      setMonto('');
      setRecargaExitosa(null);
      setTarjetaQR({ ...entrada, saldo: Number(entrada.usuario?.saldo ?? 0) });
    } catch (err) {
      setErrorEscaneo(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setMonto('');
    setRecargaExitosa(null);
    setMostrarFormIncidencia(false);
    setMontoSolicitado('');
    setNotaIncidencia('');
    setIncidenciaReportada(false);
  };

  // La manilla escaneada puede ser de OTRO evento: en ese caso no se puede recargar acá.
  const eventoNoCoincide = !!(tarjetaQR && eventoDetalle && tarjetaQR.eventoId && tarjetaQR.eventoId !== eventoDetalle.id);

  const confirmarRecarga = async () => {
    const valor = Number(monto);
    if (!tarjetaQR || eventoNoCoincide || !valor || valor <= 0) return;

    const { transaccion } = await api.transacciones.recarga({ entradaId: tarjetaQR.id, eventoId: eventoDetalle.id, monto: valor });
    api.transacciones.listar({ eventoId: eventoDetalle.id, tipo: 'recarga' }).then(lista =>
      setHistorial(lista.filter(t => t.operador.id === sesion.id))
    );

    setRecargaExitosa({ monto: valor, saldo: Number(transaccion.saldoResultante) });
  };

  // Se dispara aparte, una vez que la recarga ya quedó confirmada: el recargador
  // cuenta qué pasó, sin condiciones de montos — Admin decide qué hacer con eso.
  const reportarIncidencia = async () => {
    if (!tarjetaQR || !recargaExitosa || !notaIncidencia.trim()) return;

    await api.incidencias.crear({
      entradaId: tarjetaQR.id,
      montoEntregado: recargaExitosa.monto,
      montoSolicitado: montoSolicitado ? Number(montoSolicitado) : null,
      nota: notaIncidencia.trim(),
    });
    api.incidencias.listar({ eventoId: eventoDetalle.id }).then(setIncidencias);
    setIncidenciaReportada(true);
    setMostrarFormIncidencia(false);
  };

  const abrirReporteHistorial = (item) => {
    setHistorialAReportar(item);
    setMontoSolicitadoHist('');
    setNotaIncidenciaHist('');
  };

  const cerrarReporteHistorial = () => {
    setHistorialAReportar(null);
    setMontoSolicitadoHist('');
    setNotaIncidenciaHist('');
  };

  const reportarIncidenciaHistorial = async () => {
    if (!historialAReportar || !notaIncidenciaHist.trim()) return;

    await api.incidencias.crear({
      entradaId: historialAReportar.entradaId,
      montoEntregado: Number(historialAReportar.monto),
      montoSolicitado: montoSolicitadoHist ? Number(montoSolicitadoHist) : null,
      nota: notaIncidenciaHist.trim(),
    });
    api.incidencias.listar({ eventoId: eventoDetalle.id }).then(setIncidencias);
    setHistorialReportados(prev => [...prev, historialAReportar.id]);
    cerrarReporteHistorial();
  };

  // Foco atrapado + ESC + scroll-lock de cada modal con look propio (Manual 8.6).
  // El modal del escáner usa <Modal>, que ya trae ese comportamiento.
  const refTarjeta = useModal(!!tarjetaQR, cerrarTarjeta);
  const refReporte = useModal(!!historialAReportar, cerrarReporteHistorial);

  if (!eventoDetalle) {
    return (
      <div className="pi-rec-container">
        <div className="pi-rec-header">
          <h1>Recarga de puntos</h1>
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
                  cta="Abrir recargas"
                />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pi-rec-container">

      <div className="pi-rec-header">
        <div>
          <button className="pi-entrega-btn-volver" onClick={volverALista}>
            <FaArrowLeft /> Cambiar de evento
          </button>
          <h1>{eventoDetalle.nombre}</h1>
        </div>
        <div className="pi-rec-tabs">
          <button
            className={pestana === 'escanear' ? 'activo' : ''}
            onClick={() => navigate('/recargador')}
          >
            <FaQrcode /> Escanear QR
          </button>
          <button
            className={pestana === 'historial' ? 'activo' : ''}
            onClick={() => navigate('/recargador/historial')}
          >
            <FaHistory /> Historial ({historial.length})
          </button>
          <button
            className={pestana === 'incidencias' ? 'activo' : ''}
            onClick={irAIncidencias}
          >
            <FaClipboardList /> Incidencias ({incidencias.filter(i => i.estado === 'pendiente').length})
          </button>
          <button
            className={pestana === 'caja' ? 'activo' : ''}
            onClick={() => navigate('/recargador/caja')}
          >
            <FaCashRegister /> Arqueo de caja
          </button>
        </div>
      </div>

      {/* --- PESTAÑA: ARQUEO DE CAJA --- */}
      {pestana === 'caja' && <CorteCaja evento={eventoDetalle} modo="recarga" />}

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-rec-escanear-panel">
          {!cajaAbierta ? (
          <AvisoSinCaja
            descripcion="Necesitás un arqueo de caja abierto para este evento antes de escanear y registrar recargas."
            onAbrir={() => navigate('/recargador/caja')}
          />
          ) : (
          <>
          <FaQrcode size={70} color="var(--cian-digital)" />
          <h3>Escanea el código QR del participante</h3>
          <p>Apunta la cámara al código QR para cargar sus datos y registrar la recarga.</p>
          <button
            type="button"
            className="pi-rec-btn-escanear"
            onClick={iniciarEscaneo}
            disabled={escaneando || buscando}
          >
            <FaQrcode /> {buscando ? 'Buscando...' : 'Escanear Código QR'}
          </button>
          {errorEscaneo && (
            <p className="pi-entrega-aviso pi-entrega-aviso-error" style={{ marginTop: '12px' }}>
              <FaExclamationTriangle /> {errorEscaneo}
            </p>
          )}
          </>
          )}
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
        <div className="pi-rec-historial">
          <div className="pi-rec-historial-stats">
            <StatCard valor={historial.length} label="Recargas realizadas" />
            <StatCard valor={`${totalHistorialHoy} pts`} label="Total recargado" />
            <StatCard valor={sesion.nombre} label="Recargador" />
          </div>

          <Buscador
            valor={busquedaHist}
            onCambio={setBusquedaHist}
            placeholder="Buscar por nombre o documento…"
          />

          <Tabla
            card
            columnas={['Participante', 'Documento', 'Monto', 'Saldo Resultante', 'Fecha', 'Hora', { texto: 'Acciones', srOnly: true }]}
            datos={historialFiltrado}
            vacio={busquedaHist.trim()
              ? 'No hay recargas que coincidan con la búsqueda.'
              : 'Aún no has realizado ninguna recarga en esta sesión.'}
            renderFila={item => (
              <tr key={item.id}>
                <td>
                  <div className="pi-rec-fila-persona">
                    {item.entrada?.foto && <FotoZoom width={34} height={34} src={item.entrada.foto} alt={item.entrada.nombre} className="pi-rec-mini-avatar" />}
                    <span>{item.entrada?.nombre || '—'}</span>
                  </div>
                </td>
                <td>{ciDeEntrada(item.entrada) || '—'}</td>
                <td className="pi-rec-monto-celda">+{Number(item.monto)} pts</td>
                <td>{Number(item.saldoResultante)} pts</td>
                <td>{new Date(item.createdAt).toLocaleDateString('es-BO')}</td>
                <td>{new Date(item.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  {historialReportados.includes(item.id) ? (
                    <span className="pi-rec-badge pi-rec-badge-pend">
                      <FaExclamationTriangle /> Reportado
                    </span>
                  ) : (
                    <button type="button" className="pi-rec-btn-reportar-fila" onClick={() => abrirReporteHistorial(item)}>
                      <FaExclamationTriangle /> Reportar
                    </button>
                  )}
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* --- PESTAÑA: INCIDENCIAS --- */}
      {pestana === 'incidencias' && (
        <div className="pi-rec-historial">
          <p className="pi-rec-incidencias-nota">
            Reportes de recargas con algún problema (el participante pidió más de lo que se le pudo dar, etc.).
            Quedan pendientes hasta que Admin las revise y decida qué hacer.
          </p>
          <Tabla
            card
            columnas={['Participante', 'Documento', 'Se le dio', 'Dijo que quería', 'Qué pasó', 'Estado', 'Fecha']}
            datos={incidencias}
            vacio="No has reportado ninguna incidencia de recarga."
            renderFila={inc => (
              <tr key={inc.id}>
                <td>
                  <div className="pi-rec-fila-persona">
                    {inc.entrada.foto && <FotoZoom width={34} height={34} src={inc.entrada.foto} alt={inc.entrada.nombre} className="pi-rec-mini-avatar" />}
                    <span>{inc.entrada.nombre}</span>
                  </div>
                </td>
                <td>{ciDeEntrada(inc.entrada) || '—'}</td>
                <td>{Number(inc.montoEntregado)} pts</td>
                <td>{inc.montoSolicitado != null ? `${Number(inc.montoSolicitado)} pts` : '—'}</td>
                <td>{inc.nota || '—'}</td>
                <td>
                  {inc.estado === 'pendiente'
                    ? <span className="pi-rec-badge pi-rec-badge-pend"><FaExclamationTriangle /> Pendiente</span>
                    : <span className="pi-rec-badge pi-rec-badge-ok"><FaCheckCircle /> Resuelta</span>}
                </td>
                <td>{new Date(inc.createdAt).toLocaleDateString('es-BO')}</td>
              </tr>
            )}
          />
        </div>
      )}

      {/* --- TARJETA GRANDE AL ESCANEAR QR --- */}
      {tarjetaQR && (
        <div className="pi-rec-modal-overlay" onClick={cerrarTarjeta}>
          <div
            ref={refTarjeta}
            tabIndex={-1}
            className="pi-rec-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Manilla de ${tarjetaQR.nombre}`}
          >
            <button type="button" className="pi-rec-btn-cerrar" onClick={cerrarTarjeta} aria-label="Cerrar">
              <FaTimes aria-hidden="true" />
            </button>

            {recargaExitosa ? (
              <div className="pi-rec-exito">
                <FaCheckCircle size={60} color="var(--verde-recarga)" />
                <h3>¡Recarga exitosa!</h3>
                <p>Se acreditaron <strong>{recargaExitosa.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                <div className="pi-rec-exito-saldo">
                  <FaWallet /> Nuevo saldo: <strong>{recargaExitosa.saldo} pts</strong>
                </div>

                {incidenciaReportada ? (
                  <div className="pi-rec-alerta-incidencia pi-rec-alerta-incidencia-exito">
                    <FaExclamationTriangle /> Se reportó a Admin lo que pasó con {tarjetaQR.nombre}. Admin lo revisará y decidirá qué hacer.
                  </div>
                ) : mostrarFormIncidencia ? (
                  <div className="pi-rec-form-incidencia pi-rec-form-incidencia-post">
                    <p className="pi-rec-incidencia-linea">
                      Le cargaste <strong>{recargaExitosa.monto} pts</strong> a {tarjetaQR.nombre}.
                    </p>

                    <label htmlFor="rec-monto-solicitado">¿Cuánto pagó en realidad?</label>
                    <input
                      id="rec-monto-solicitado"
                      type="number" min="0" inputMode="numeric"
                      placeholder={`Ej: ${recargaExitosa.monto}`}
                      value={montoSolicitado}
                      onChange={(e) => setMontoSolicitado(e.target.value)}
                      autoFocus
                    />
                    {montoSolicitado !== '' && Number(montoSolicitado) !== recargaExitosa.monto && (
                      Number(montoSolicitado) < recargaExitosa.monto ? (
                        <p className="pi-rec-diff pi-rec-diff--menos">
                          Se le cargó <strong>{recargaExitosa.monto - Number(montoSolicitado)} pts de más</strong>. Esa
                          plata se retiene de su saldo (no la puede gastar) hasta que Admin lo resuelva.
                        </p>
                      ) : (
                        <p className="pi-rec-diff pi-rec-diff--mas">
                          Le faltó cargar <strong>{Number(montoSolicitado) - recargaExitosa.monto} pts</strong>. Admin
                          se los va a acreditar al resolver.
                        </p>
                      )
                    )}

                    <label htmlFor="rec-nota-incidencia">¿Qué pasó? (para Admin)</label>
                    <textarea
                      id="rec-nota-incidencia"
                      className="pi-rec-nota-incidencia"
                      placeholder="Ej: pagó 100 en efectivo pero apreté 200 sin querer"
                      value={notaIncidencia}
                      onChange={(e) => setNotaIncidencia(e.target.value)}
                      rows={3}
                    />
                    <div className="pi-rec-tarjeta-acciones">
                      <button
                        className="pi-rec-btn-cancelar"
                        onClick={() => { setMostrarFormIncidencia(false); setMontoSolicitado(''); setNotaIncidencia(''); }}
                      >
                        Cancelar
                      </button>
                      <button
                        className="pi-rec-btn-confirmar"
                        onClick={reportarIncidencia}
                        disabled={!notaIncidencia.trim()}
                      >
                        <FaExclamationTriangle /> Enviar Reporte
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="pi-rec-btn-reportar" onClick={() => setMostrarFormIncidencia(true)}>
                    <FaExclamationTriangle /> ¿Pasó algo con esta recarga? Reportar
                  </button>
                )}

                <button type="button" className="pi-rec-btn-confirmar" onClick={cerrarTarjeta}>Listo</button>
              </div>
            ) : (
              <>
                <div className="pi-rec-tarjeta-estado">
                  <FaCheckCircle /> Código QR Válido
                </div>

                {(tarjetaQR.usuario?.foto || tarjetaQR.foto) && (
                  <FotoZoom width={140} height={140} src={tarjetaQR.usuario?.foto || tarjetaQR.foto} alt={`Foto de ${tarjetaQR.nombre}`} className="pi-rec-tarjeta-foto" />
                )}
                <h2 className="pi-rec-tarjeta-nombre">{tarjetaQR.nombre}</h2>

                <div className="pi-rec-tarjeta-datos">
                  <div className="pi-rec-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Documento</span>
                      <span className="valor">{ciDeEntrada(tarjetaQR) || '—'}</span>
                    </div>
                  </div>
                  <div className="pi-rec-tarjeta-dato">
                    <FaHistory />
                    <div>
                      <span className="label">Evento</span>
                      <span className="valor">{tarjetaQR.evento?.nombre || '—'}</span>
                    </div>
                  </div>
                  <div className="pi-rec-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Tipo de entrada</span>
                      <span className="valor">{tarjetaQR.categoriaTicket?.nombre || '—'}</span>
                    </div>
                  </div>
                  <div className="pi-rec-tarjeta-dato">
                    <FaWallet />
                    <div>
                      <span className="label">Saldo Actual</span>
                      <span className="valor">{tarjetaQR.saldo} pts</span>
                    </div>
                  </div>
                </div>

                {eventoNoCoincide ? (
                  <div className="pi-rec-form-monto">
                    <p className="pi-rec-aviso-evento">
                      <FaExclamationTriangle aria-hidden="true" />
                      <span>
                        Esta manilla es del evento <strong>«{tarjetaQR.evento?.nombre}»</strong> y este puesto
                        atiende <strong>«{eventoDetalle.nombre}»</strong>. No se puede recargar desde acá.
                      </span>
                    </p>
                    <button type="button" className="pi-rec-btn-confirmar pi-rec-btn-bloque" onClick={cerrarTarjeta}>
                      Cerrar
                    </button>
                  </div>
                ) : (
                <>
                <div className="pi-rec-form-monto">
                  <label htmlFor="rec-monto"><FaCoins aria-hidden="true" /> Monto a recargar (puntos)</label>
                  <input
                    id="rec-monto"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    placeholder="Ej: 100"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    autoFocus
                  />
                  <div className="pi-rec-montos-rapidos">
                    {montosRapidos.map(m => (
                      <button key={m} type="button" onClick={() => setMonto(String(m))}>
                        +{m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pi-rec-tarjeta-acciones">
                  <button type="button" className="pi-rec-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                  <button
                    type="button"
                    className="pi-rec-btn-confirmar"
                    onClick={confirmarRecarga}
                    disabled={!monto || Number(monto) <= 0}
                  >
                    <FaCheckCircle aria-hidden="true" /> Confirmar Recarga
                  </button>
                </div>
                </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* --- REPORTAR INCIDENCIA DESDE UNA RECARGA YA PASADA (Historial) --- */}
      {historialAReportar && (
        <div className="pi-rec-modal-overlay" onClick={cerrarReporteHistorial}>
          <div
            ref={refReporte}
            tabIndex={-1}
            className="pi-rec-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Reportar incidencia de una recarga"
          >
            <button type="button" className="pi-rec-btn-cerrar" onClick={cerrarReporteHistorial} aria-label="Cerrar">
              <FaTimes aria-hidden="true" />
            </button>

            <div className="pi-rec-tarjeta-estado aviso">
              <FaExclamationTriangle /> Reportar incidencia
            </div>

            {historialAReportar.entrada?.foto && <FotoZoom width={140} height={140} src={historialAReportar.entrada.foto} alt={historialAReportar.entrada.nombre} className="pi-rec-tarjeta-foto" />}
            <h2 className="pi-rec-tarjeta-nombre">{historialAReportar.entrada?.nombre}</h2>

            <div className="pi-rec-tarjeta-datos">
              <div className="pi-rec-tarjeta-dato">
                <FaIdCard />
                <div>
                  <span className="label">Documento</span>
                  <span className="valor">{ciDeEntrada(historialAReportar.entrada) || '—'}</span>
                </div>
              </div>
              <div className="pi-rec-tarjeta-dato">
                <FaWallet />
                <div>
                  <span className="label">Se le dio</span>
                  <span className="valor">{Number(historialAReportar.monto)} pts</span>
                </div>
              </div>
            </div>

            <div className="pi-rec-form-incidencia pi-rec-form-incidencia-post">
              <label htmlFor="rec-monto-solicitado-hist">¿Cuánto pagó en realidad?</label>
              <input
                id="rec-monto-solicitado-hist"
                type="number" min="0" inputMode="numeric"
                placeholder={`Ej: ${Number(historialAReportar.monto)}`}
                value={montoSolicitadoHist}
                onChange={(e) => setMontoSolicitadoHist(e.target.value)}
                autoFocus
              />
              {montoSolicitadoHist !== '' && Number(montoSolicitadoHist) !== Number(historialAReportar.monto) && (
                Number(montoSolicitadoHist) < Number(historialAReportar.monto) ? (
                  <p className="pi-rec-diff pi-rec-diff--menos">
                    Se le cargó <strong>{Number(historialAReportar.monto) - Number(montoSolicitadoHist)} pts de más</strong>. Se retienen de su saldo hasta que Admin lo resuelva.
                  </p>
                ) : (
                  <p className="pi-rec-diff pi-rec-diff--mas">
                    Le faltó cargar <strong>{Number(montoSolicitadoHist) - Number(historialAReportar.monto)} pts</strong>. Admin se los acredita al resolver.
                  </p>
                )
              )}
              <label htmlFor="rec-nota-hist">¿Qué pasó? (para Admin)</label>
              <textarea
                id="rec-nota-hist"
                className="pi-rec-nota-incidencia"
                placeholder="Ej: pagó 100 en efectivo pero apreté 200 sin querer"
                value={notaIncidenciaHist}
                onChange={(e) => setNotaIncidenciaHist(e.target.value)}
                rows={3}
              />
            </div>

            <div className="pi-rec-tarjeta-acciones">
              <button type="button" className="pi-rec-btn-cancelar" onClick={cerrarReporteHistorial}>Cancelar</button>
              <button
                type="button"
                className="pi-rec-btn-confirmar"
                onClick={reportarIncidenciaHistorial}
                disabled={!notaIncidenciaHist.trim()}
              >
                <FaExclamationTriangle aria-hidden="true" /> Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
