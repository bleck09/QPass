import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaHistory, FaTimes, FaIdCard, FaCoins, FaCheckCircle, FaWallet,
  FaExclamationTriangle, FaClipboardList, FaMapMarkerAlt, FaArrowLeft
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha, estadoEvento } from '../../utils/eventos.js';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import EscanerQr from '../../components/EscanerQr.jsx';
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

  // Refs + gestión de foco de cada modal (A1 / Manual 8.6): al abrir el foco entra
  // al modal y queda atrapado; al cerrar vuelve al botón que lo disparó.
  const modalEscanerRef = useRef(null);
  const modalTarjetaRef = useRef(null);
  const modalReporteRef = useRef(null);
  useFocoModal(modalEscanerRef, escaneando);
  useFocoModal(modalTarjetaRef, !!tarjetaQR);
  useFocoModal(modalReporteRef, !!historialAReportar);

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

  const confirmarRecarga = async () => {
    const valor = Number(monto);
    if (!tarjetaQR || !valor || valor <= 0) return;

    const { transaccion } = await api.transacciones.recarga({ entradaId: tarjetaQR.id, monto: valor });
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

  // Cualquier modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  const hayModalAbierto = escaneando || !!tarjetaQR || !!historialAReportar;
  useEffect(() => {
    if (!hayModalAbierto) return;
    const alTecla = (e) => {
      if (e.key !== 'Escape') return;
      setEscaneando(false);
      cerrarTarjeta();
      cerrarReporteHistorial();
    };
    window.addEventListener('keydown', alTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTecla);
      document.body.style.overflow = '';
    };
  }, [hayModalAbierto]);

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
          <div className="pi-entrega-eventos-grid">
            {eventos.map(ev => (
              <button
                key={ev.id}
                className="pi-entrega-evento-card"
                onClick={() => abrirEvento(ev)}
                disabled={estadoEvento(ev) === 'archivado'}
              >
                <img src={ev.imagen} alt={ev.nombre} width="320" height="120" loading="lazy" className="pi-entrega-evento-imagen" />
                <div className="pi-entrega-evento-info">
                  <strong>{ev.nombre} <BadgeEstadoEvento evento={ev} /></strong>
                  <span><FaMapMarkerAlt /> {ev.lugar} · {formatearFecha(ev.fecha)}</span>
                </div>
              </button>
            ))}
          </div>
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
        </div>
      </div>

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-rec-escanear-panel">
          <FaQrcode size={70} color="var(--cian-digital)" />
          <h3>Escanea el código QR del participante</h3>
          <p>Apunta la cámara al código QR para cargar sus datos y registrar la recarga.</p>
          <button type="button" className="pi-rec-btn-escanear" onClick={iniciarEscaneo} disabled={escaneando || buscando}>
            <FaQrcode /> {buscando ? 'Buscando...' : 'Escanear Código QR'}
          </button>
          {errorEscaneo && (
            <p className="pi-entrega-aviso pi-entrega-aviso-error" style={{ marginTop: '12px' }}>
              <FaExclamationTriangle /> {errorEscaneo}
            </p>
          )}
        </div>
      )}

      {/* --- MODAL: ESCÁNER DE QR (cámara real) --- */}
      {escaneando && (
        <div className="pi-rec-modal-overlay" onClick={() => setEscaneando(false)}>
          <div
            ref={modalEscanerRef}
            tabIndex={-1}
            className="pi-rec-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rec-modal-escaner-titulo"
          >
            <h3 id="rec-modal-escaner-titulo" style={{ textAlign: 'center', marginBottom: '14px' }}>
              <FaQrcode aria-hidden="true" /> Escanear manilla
            </h3>
            <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
          </div>
        </div>
      )}

      {/* --- PESTAÑA: HISTORIAL --- */}
      {pestana === 'historial' && (
        <div className="pi-rec-historial">
          <div className="pi-rec-historial-stats">
            <div className="pi-rec-historial-stat">
              <span className="numero">{historial.length}</span>
              <span className="label">Recargas realizadas</span>
            </div>
            <div className="pi-rec-historial-stat">
              <span className="numero">{totalHistorialHoy} pts</span>
              <span className="label">Total recargado</span>
            </div>
            <div className="pi-rec-historial-stat">
              <span className="numero">{sesion.nombre}</span>
              <span className="label">Recargador</span>
            </div>
          </div>

          <div className="pi-rec-tabla-wrapper">
            <table className="pi-rec-tabla">
              <thead>
                <tr>
                  <th scope="col">Participante</th>
                  <th scope="col">Documento</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Saldo Resultante</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Hora</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {historial.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="pi-rec-fila-persona">
                        {item.entrada?.foto && <img width="34" height="34" src={item.entrada.foto} alt={item.entrada.nombre} className="pi-rec-mini-avatar" />}
                        <span>{item.entrada?.nombre || '—'}</span>
                      </div>
                    </td>
                    <td>{item.entrada?.documento || '—'}</td>
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
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan={7} className="pi-rec-sin-resultados">
                      Aún no has realizado ninguna recarga en esta sesión.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PESTAÑA: INCIDENCIAS --- */}
      {pestana === 'incidencias' && (
        <div className="pi-rec-historial">
          <p className="pi-rec-incidencias-nota">
            Reportes de recargas con algún problema (el participante pidió más de lo que se le pudo dar, etc.).
            Quedan pendientes hasta que Admin las revise y decida qué hacer.
          </p>
          <div className="pi-rec-tabla-wrapper">
            <table className="pi-rec-tabla">
              <thead>
                <tr>
                  <th scope="col">Participante</th>
                  <th scope="col">Documento</th>
                  <th scope="col">Se le dio</th>
                  <th scope="col">Dijo que quería</th>
                  <th scope="col">Qué pasó</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {incidencias.map(inc => (
                  <tr key={inc.id}>
                    <td>
                      <div className="pi-rec-fila-persona">
                        {inc.entrada.foto && <img width="34" height="34" src={inc.entrada.foto} alt={inc.entrada.nombre} className="pi-rec-mini-avatar" />}
                        <span>{inc.entrada.nombre}</span>
                      </div>
                    </td>
                    <td>{inc.entrada.documento || '—'}</td>
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
                ))}
                {incidencias.length === 0 && (
                  <tr>
                    <td colSpan={7} className="pi-rec-sin-resultados">
                      No has reportado ninguna incidencia de recarga.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TARJETA GRANDE AL ESCANEAR QR --- */}
      {tarjetaQR && (
        <div className="pi-rec-modal-overlay" onClick={cerrarTarjeta}>
          <div
            ref={modalTarjetaRef}
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
                    <label htmlFor="rec-nota-incidencia">
                      <FaExclamationTriangle aria-hidden="true" /> ¿Qué pasó con {tarjetaQR.nombre}?
                    </label>
                    <textarea
                      id="rec-nota-incidencia"
                      className="pi-rec-nota-incidencia"
                      placeholder="Cuéntale a Admin qué pasó (ej: pidió 200 pero solo tenía 50 y no le alcanzó)"
                      value={notaIncidencia}
                      onChange={(e) => setNotaIncidencia(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <label className="pi-rec-label-opcional" htmlFor="rec-monto-solicitado">Monto que dijo que quería (opcional)</label>
                    <input
                      id="rec-monto-solicitado"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="Ej: 200"
                      value={montoSolicitado}
                      onChange={(e) => setMontoSolicitado(e.target.value)}
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
                  <img width="140" height="140" src={tarjetaQR.usuario?.foto || tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-rec-tarjeta-foto" />
                )}
                <h2 className="pi-rec-tarjeta-nombre">{tarjetaQR.nombre}</h2>

                <div className="pi-rec-tarjeta-datos">
                  <div className="pi-rec-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Documento</span>
                      <span className="valor">{tarjetaQR.documento}</span>
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
          </div>
        </div>
      )}

      {/* --- REPORTAR INCIDENCIA DESDE UNA RECARGA YA PASADA (Historial) --- */}
      {historialAReportar && (
        <div className="pi-rec-modal-overlay" onClick={cerrarReporteHistorial}>
          <div
            ref={modalReporteRef}
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

            {historialAReportar.entrada?.foto && <img width="140" height="140" src={historialAReportar.entrada.foto} alt={historialAReportar.entrada.nombre} className="pi-rec-tarjeta-foto" />}
            <h2 className="pi-rec-tarjeta-nombre">{historialAReportar.entrada?.nombre}</h2>

            <div className="pi-rec-tarjeta-datos">
              <div className="pi-rec-tarjeta-dato">
                <FaIdCard />
                <div>
                  <span className="label">Documento</span>
                  <span className="valor">{historialAReportar.entrada?.documento || '—'}</span>
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
              <label htmlFor="rec-nota-hist">
                <FaExclamationTriangle aria-hidden="true" /> ¿Qué pasó con {historialAReportar.entrada?.nombre}?
              </label>
              <textarea
                id="rec-nota-hist"
                className="pi-rec-nota-incidencia"
                placeholder="Cuéntale a Admin qué pasó (ej: pidió 200 pero solo tenía 50 y no le alcanzó)"
                value={notaIncidenciaHist}
                onChange={(e) => setNotaIncidenciaHist(e.target.value)}
                rows={3}
                autoFocus
              />
              <label className="pi-rec-label-opcional" htmlFor="rec-monto-solicitado-hist">Monto que dijo que quería (opcional)</label>
              <input
                id="rec-monto-solicitado-hist"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Ej: 200"
                value={montoSolicitadoHist}
                onChange={(e) => setMontoSolicitadoHist(e.target.value)}
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
