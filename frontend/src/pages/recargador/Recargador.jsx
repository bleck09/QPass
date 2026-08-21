import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaHistory, FaTimes, FaIdCard, FaCoins, FaCheckCircle, FaWallet,
  FaExclamationTriangle, FaClipboardList, FaMapMarkerAlt, FaArrowLeft
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha } from '../../utils/eventos.js';
import './Recargador.css';
import '../supervisor/GestionEntrega.css';

const montosRapidos = [20, 50, 100, 200];

export default function Recargador() {
  const sesion = leerSesion();

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/incidencias')
    ? 'incidencias'
    : location.pathname.endsWith('/historial') ? 'historial' : 'escanear';

  const [eventos, setEventos] = useState([]);
  const [eventoDetalle, setEventoDetalle] = useState(null);
  const [entradasEvento, setEntradasEvento] = useState([]);
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
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

  useEffect(() => { api.eventos.listar().then(setEventos); }, []);

  const abrirEvento = (ev) => {
    setEventoDetalle(ev);
    api.entradas.listar({ eventoId: ev.id }).then(lista =>
      setEntradasEvento(lista.filter(e => e.usuarioId).map(e => ({ ...e, saldo: Number(e.usuario?.saldo ?? 0) })))
    );
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

  const handleSimularEscaneo = () => {
    if (entradasEvento.length === 0) return;
    setEscaneando(true);
    setMonto('');
    setRecargaExitosa(null);
    setTimeout(() => {
      const elegido = entradasEvento[Math.floor(Math.random() * entradasEvento.length)];
      setEscaneando(false);
      setTarjetaQR(elegido);
    }, 700);
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

  if (!eventoDetalle) {
    return (
      <div className="pi-rec-container">
        <div className="pi-rec-header">
          <h2>Recarga de Puntos</h2>
        </div>
        <div className="pi-entrega-eventos-grid">
          {eventos.map(ev => (
            <button key={ev.id} className="pi-entrega-evento-card" onClick={() => abrirEvento(ev)}>
              <img src={ev.imagen} alt={ev.nombre} className="pi-entrega-evento-imagen" />
              <div className="pi-entrega-evento-info">
                <strong>{ev.nombre}</strong>
                <span><FaMapMarkerAlt /> {ev.lugar} · {formatearFecha(ev.fecha)}</span>
              </div>
            </button>
          ))}
        </div>
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
          <h2>{eventoDetalle.nombre}</h2>
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
          <button className="pi-rec-btn-escanear" onClick={handleSimularEscaneo} disabled={escaneando}>
            <FaQrcode /> {escaneando ? 'Escaneando...' : 'Simular Escaneo QR'}
          </button>
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
                  <th>Participante</th>
                  <th>Documento</th>
                  <th>Monto</th>
                  <th>Saldo Resultante</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {historial.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="pi-rec-fila-persona">
                        {item.entrada?.foto && <img src={item.entrada.foto} alt={item.entrada.nombre} className="pi-rec-mini-avatar" />}
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
                        <button className="pi-rec-btn-reportar-fila" onClick={() => abrirReporteHistorial(item)}>
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
                  <th>Participante</th>
                  <th>Documento</th>
                  <th>Se le dio</th>
                  <th>Dijo que quería</th>
                  <th>Qué pasó</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {incidencias.map(inc => (
                  <tr key={inc.id}>
                    <td>
                      <div className="pi-rec-fila-persona">
                        {inc.entrada.foto && <img src={inc.entrada.foto} alt={inc.entrada.nombre} className="pi-rec-mini-avatar" />}
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
          <div className="pi-rec-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <button className="pi-rec-btn-cerrar" onClick={cerrarTarjeta}><FaTimes /></button>

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
                    <label>
                      <FaExclamationTriangle /> ¿Qué pasó con {tarjetaQR.nombre}?
                    </label>
                    <textarea
                      className="pi-rec-nota-incidencia"
                      placeholder="Cuéntale a Admin qué pasó (ej: pidió 200 pero solo tenía 50 y no le alcanzó)"
                      value={notaIncidencia}
                      onChange={(e) => setNotaIncidencia(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <label className="pi-rec-label-opcional">Monto que dijo que quería (opcional)</label>
                    <input
                      type="number"
                      min="0"
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
                  <button className="pi-rec-btn-reportar" onClick={() => setMostrarFormIncidencia(true)}>
                    <FaExclamationTriangle /> ¿Pasó algo con esta recarga? Reportar
                  </button>
                )}

                <button className="pi-rec-btn-confirmar" onClick={cerrarTarjeta}>Listo</button>
              </div>
            ) : (
              <>
                <div className="pi-rec-tarjeta-estado">
                  <FaCheckCircle /> Código QR Válido
                </div>

                {tarjetaQR.foto && <img src={tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-rec-tarjeta-foto" />}
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
                  <label><FaCoins /> Monto a recargar (puntos)</label>
                  <input
                    type="number"
                    min="1"
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
                  <button className="pi-rec-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                  <button
                    className="pi-rec-btn-confirmar"
                    onClick={confirmarRecarga}
                    disabled={!monto || Number(monto) <= 0}
                  >
                    <FaCheckCircle /> Confirmar Recarga
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
          <div className="pi-rec-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <button className="pi-rec-btn-cerrar" onClick={cerrarReporteHistorial}><FaTimes /></button>

            <div className="pi-rec-tarjeta-estado aviso">
              <FaExclamationTriangle /> Reportar incidencia
            </div>

            {historialAReportar.entrada?.foto && <img src={historialAReportar.entrada.foto} alt={historialAReportar.entrada.nombre} className="pi-rec-tarjeta-foto" />}
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
              <label>
                <FaExclamationTriangle /> ¿Qué pasó con {historialAReportar.entrada?.nombre}?
              </label>
              <textarea
                className="pi-rec-nota-incidencia"
                placeholder="Cuéntale a Admin qué pasó (ej: pidió 200 pero solo tenía 50 y no le alcanzó)"
                value={notaIncidenciaHist}
                onChange={(e) => setNotaIncidenciaHist(e.target.value)}
                rows={3}
                autoFocus
              />
              <label className="pi-rec-label-opcional">Monto que dijo que quería (opcional)</label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 200"
                value={montoSolicitadoHist}
                onChange={(e) => setMontoSolicitadoHist(e.target.value)}
              />
            </div>

            <div className="pi-rec-tarjeta-acciones">
              <button className="pi-rec-btn-cancelar" onClick={cerrarReporteHistorial}>Cancelar</button>
              <button
                className="pi-rec-btn-confirmar"
                onClick={reportarIncidenciaHistorial}
                disabled={!notaIncidenciaHist.trim()}
              >
                <FaExclamationTriangle /> Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
