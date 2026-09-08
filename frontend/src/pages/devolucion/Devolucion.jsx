import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useModal } from '../../utils/useModal.js';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Buscador from '../../components/Buscador.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaTimes, FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle,
  FaMoneyBillWave, FaUser, FaBuilding, FaHistory, FaCamera, FaRedo, FaArrowLeft,
  FaCashRegister
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { subirFotoCapturada } from '../../utils/imagenes.js';
import { estadoEvento, filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import CorteCaja from '../../components/CorteCaja.jsx';
import EscanerQr from '../../components/EscanerQr.jsx';
import CapturarFoto from '../../components/CapturarFoto.jsx';
import './Devolucion.css';
import '../supervisor/GestionEntrega.css';

// §5.11 — motivos tipados del retiro (deben coincidir con el enum del backend).
const MOTIVOS_DEVOLUCION = [
  ['retiro_efectivo', 'Retiro en efectivo'],
  ['saldo_no_usado', 'Saldo no usado'],
  ['error_recarga', 'Error de recarga'],
  ['otro', 'Otro (detallar)'],
];

export default function Devolucion() {
  useTituloPagina('Devoluciones');
  const sesion = leerSesion();
  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/caja')
    ? 'caja'
    : location.pathname.endsWith('/historial') ? 'historial' : 'escanear';

  // Carga primaria: eventos asignados.
  const cargarInicial = useCallback(
    () => api.eventos.misAsignados(sesion.id, sesion.rol),
    [sesion.id, sesion.rol],
  );
  const {
    data: eventos,
    cargando: cargandoInicial,
    error: errorInicial,
    recargar: recargarInicial,
  } = useApi(cargarInicial, { inicial: [] });

  const [eventoDetalle, setEventoDetalle] = useState(null);
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const [monto, setMonto] = useState('');
  const [motivoDevol, setMotivoDevol] = useState('retiro_efectivo');
  const [notaDevol, setNotaDevol] = useState('');
  const [fotoCarnet, setFotoCarnet] = useState(null);
  const [capturandoFotoCarnet, setCapturandoFotoCarnet] = useState(false);
  // Foto de la cara de quien cobra — obligatoria en el retiro de un negocio.
  const [fotoRostro, setFotoRostro] = useState(null);
  const [capturandoFotoRostro, setCapturandoFotoRostro] = useState(false);
  const [retiroExitoso, setRetiroExitoso] = useState(null);
  const [retiros, setRetiros] = useState([]);

  // §5.2 — no se pueden registrar devoluciones sin una caja de arqueo abierta.
  const cargarCaja = useCallback(
    () => (eventoDetalle ? api.cortesCaja.actual({ eventoId: eventoDetalle.id }) : Promise.resolve(null)),
    [eventoDetalle],
  );
  const { data: cajaAbierta, recargar: recargarCaja } = useApi(cargarCaja, { inicial: null, activo: !!eventoDetalle });
  useEffect(() => { if (pestana === 'escanear') recargarCaja(); }, [pestana, recargarCaja]);

  const abrirEvento = (ev) => {
    setEventoDetalle(ev);
    api.transacciones.listar({ eventoId: ev.id, tipo: 'devolucion' }).then(lista =>
      setRetiros(lista.filter(t => t.operador.id === sesion.id))
    );
  };

  const volverALista = () => setEventoDetalle(null);

  const totalRetiradoHoy = useMemo(
    () => retiros.reduce((suma, item) => suma + Number(item.monto), 0),
    [retiros]
  );

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  const [busquedaHist, setBusquedaHist] = useState('');
  const retirosFiltrados = useMemo(() => {
    const q = busquedaHist.trim().toLowerCase();
    if (!q) return retiros;
    return retiros.filter((item) =>
      `${item.entrada?.nombre || ''} ${item.entrada?.documento || ''}`.toLowerCase().includes(q),
    );
  }, [retiros, busquedaHist]);

  const excedeSaldo = tarjetaQR && Number(monto) > tarjetaQR.saldoDisponible;

  const iniciarEscaneo = () => {
    setErrorEscaneo('');
    setEscaneando(true);
  };

  // Un mismo escaneo sirve para la manilla de un asistente o el código de retiro
  // de un negocio: se prueba primero como entrada, y si no, como código de negocio.
  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setBuscando(true);
    setErrorEscaneo('');
    const limpiarForm = () => {
      setMonto('');
      setFotoCarnet(null);
      setFotoRostro(null);
      setRetiroExitoso(null);
    };
    try {
      let entrada = null;
      try {
        entrada = await api.entradas.buscarPorCodigo(codigo);
      } catch {
        entrada = null; // no es una manilla
      }
      if (entrada) {
        if (!entrada.usuarioId) {
          setErrorEscaneo('Este participante no tiene una cuenta con billetera — no se le puede hacer un retiro.');
          return;
        }
        limpiarForm();
        setTarjetaQR({ ...entrada, tipo: 'Normal', saldoDisponible: Number(entrada.usuario?.saldo ?? 0) });
        return;
      }
      // ¿Código de retiro de negocio?
      const neg = await api.codigosRetiroNegocio.buscar(codigo);
      limpiarForm();
      setTarjetaQR({
        tipo: 'Negocio',
        usuarioId: neg.negocioId,
        nombre: neg.negocioNombre,
        eventoNombre: neg.eventoNombre,
        saldoDisponible: neg.saldo,
      });
    } catch {
      setErrorEscaneo('Código no reconocido: no es una manilla ni un código de retiro de negocio.');
    } finally {
      setBuscando(false);
    }
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setMonto('');
    setMotivoDevol('retiro_efectivo');
    setNotaDevol('');
    setFotoCarnet(null);
    setCapturandoFotoCarnet(false);
    setFotoRostro(null);
    setCapturandoFotoRostro(false);
    setRetiroExitoso(null);
  };

  // Foco + ESC + scroll-lock de la tarjeta de devolución (look propio).
  // El escáner usa <Modal>, que ya trae ese comportamiento.
  const refTarjeta = useModal(!!tarjetaQR, cerrarTarjeta);

  const esNegocio = tarjetaQR?.tipo === 'Negocio';

  const confirmarRetiro = async () => {
    const valor = Number(monto);
    if (!tarjetaQR || !valor || valor <= 0 || valor > tarjetaQR.saldoDisponible || !fotoCarnet) return;
    if (esNegocio && !fotoRostro) return; // foto de la cara obligatoria para negocios

    await api.transacciones.devolucion({
      usuarioId: tarjetaQR.usuarioId,
      entradaId: tarjetaQR.tipo === 'Normal' ? tarjetaQR.id : undefined,
      monto: valor,
      fotoCarnetUrl: fotoCarnet,
      fotoRostroUrl: fotoRostro || undefined,
      eventoId: eventoDetalle.id,
      motivoDevolucion: motivoDevol,
      nota: motivoDevol === 'otro' && notaDevol.trim() ? notaDevol.trim() : undefined,
    });

    api.transacciones.listar({ eventoId: eventoDetalle.id, tipo: 'devolucion' }).then(lista =>
      setRetiros(lista.filter(t => t.operador.id === sesion.id))
    );

    setRetiroExitoso({ monto: valor, saldo: tarjetaQR.saldoDisponible - valor });
  };

  if (!eventoDetalle) {
    return (
      <div className="pi-dev-container">
        <div className="pi-dev-header">
          <h1>Gestión de devoluciones</h1>
        </div>
        {errorInicial ? (
          <EstadoError onReintentar={recargarInicial} />
        ) : cargandoInicial ? (
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
                  badges={<BadgeEstadoEvento evento={ev} />}
                  cta="Abrir devoluciones"
                />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pi-dev-container">

      <div className="pi-dev-header">
        <div>
          <button type="button" className="pi-entrega-btn-volver" onClick={volverALista}>
            <FaArrowLeft /> Cambiar de evento
          </button>
          <h1>{eventoDetalle.nombre}</h1>
        </div>
        <div className="pi-dev-tabs">
          <button
            type="button"
            className={pestana === 'escanear' ? 'activo' : ''}
            aria-current={pestana === 'escanear' ? 'page' : undefined}
            onClick={() => navigate('/devolucion')}
          >
            <FaQrcode aria-hidden="true" /> Escanear QR
          </button>
          <button
            type="button"
            className={pestana === 'historial' ? 'activo' : ''}
            aria-current={pestana === 'historial' ? 'page' : undefined}
            onClick={() => navigate('/devolucion/historial')}
          >
            <FaHistory aria-hidden="true" /> Historial ({retiros.length})
          </button>
          <button
            type="button"
            className={pestana === 'caja' ? 'activo' : ''}
            aria-current={pestana === 'caja' ? 'page' : undefined}
            onClick={() => navigate('/devolucion/caja')}
          >
            <FaCashRegister aria-hidden="true" /> Arqueo de caja
          </button>
        </div>
      </div>

      {/* --- PESTAÑA: ARQUEO DE CAJA --- */}
      {pestana === 'caja' && <CorteCaja evento={eventoDetalle} modo="devolucion" />}

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-dev-escanear-panel">
          {!cajaAbierta && (
            <p className="pi-entrega-aviso pi-entrega-aviso-error" style={{ marginBottom: '4px' }}>
              <FaExclamationTriangle /> No tenés una caja abierta para este evento.
              {' '}
              <button type="button" className="pi-dev-link-caja" onClick={() => navigate('/devolucion/caja')}>
                Abrir arqueo de caja
              </button>
              {' '}antes de registrar devoluciones.
            </p>
          )}
          <FaQrcode size={70} color="var(--cian-digital)" />
          <h3>Escaneá el código QR</h3>
          <p>
            Sirve para la <strong>manilla de un asistente</strong> o para el
            <strong> código de retiro de un negocio</strong> (el que ve en su dashboard).
          </p>
          <button
            type="button"
            className="pi-dev-btn-escanear"
            onClick={iniciarEscaneo}
            disabled={escaneando || buscando || !cajaAbierta}
          >
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
        <div className="pi-dev-historial">
          <div className="pi-dev-resumen">
            <StatCard valor={retiros.length} label="Retiros realizados" />
            <StatCard valor={`${totalRetiradoHoy} pts`} label="Total devuelto" />
          </div>

          <Buscador
            valor={busquedaHist}
            onCambio={setBusquedaHist}
            placeholder="Buscar por nombre o documento…"
          />

          <Tabla
            card
            columnas={['Beneficiario', 'Documento', 'Tipo', 'Carnet', 'Monto', 'Saldo Resultante', 'Fecha', 'Hora']}
            datos={retirosFiltrados}
            vacio={busquedaHist.trim()
              ? 'No hay devoluciones que coincidan con la búsqueda.'
              : 'Aún no has procesado ninguna devolución para este evento.'}
            renderFila={item => (
              <tr key={item.id}>
                <td>
                  <div className="pi-dev-fila-persona">
                    {item.entrada?.foto && <img width="34" height="34" src={item.entrada.foto} alt={item.entrada.nombre} className="pi-dev-mini-avatar" />}
                    <span>{item.entrada?.nombre || '—'}</span>
                  </div>
                </td>
                <td>{item.entrada?.documento || '—'}</td>
                <td>
                  <span className="pi-dev-badge-tipo normal">
                    <FaUser /> Normal
                  </span>
                </td>
                <td>
                  {item.fotoCarnetUrl
                    ? <img width="40" height="40" src={item.fotoCarnetUrl} alt={`Carnet de ${item.entrada?.nombre}`} className="pi-dev-mini-carnet" />
                    : <span className="pi-dev-sin-carnet">—</span>}
                </td>
                <td className="pi-dev-monto-celda">-{Number(item.monto)} pts</td>
                <td>{Number(item.saldoResultante)} pts</td>
                <td>{new Date(item.createdAt).toLocaleDateString('es-BO')}</td>
                <td>{new Date(item.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            )}
          />
        </div>
      )}

      {/* --- TARJETA GRANDE AL ESCANEAR QR --- */}
      {tarjetaQR && (
        <div className="pi-dev-modal-overlay" onClick={cerrarTarjeta}>
          <div
            ref={refTarjeta}
            tabIndex={-1}
            className="pi-dev-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Devolución de saldo a ${tarjetaQR.nombre}`}
          >
            <button type="button" className="pi-dev-btn-cerrar" onClick={cerrarTarjeta} aria-label="Cerrar">
              <FaTimes aria-hidden="true" />
            </button>

            {retiroExitoso ? (
              <div className="pi-dev-exito">
                <FaCheckCircle size={60} color="var(--verde-recarga)" />
                <h3>¡Retiro realizado!</h3>
                <p>Se descontaron <strong>{retiroExitoso.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                <div className="pi-dev-exito-saldo">
                  <FaWallet /> Saldo restante: <strong>{retiroExitoso.saldo} pts</strong>
                </div>
                <button type="button" className="pi-dev-btn-confirmar" onClick={cerrarTarjeta}>Listo</button>
              </div>
            ) : (
              <>
                <div className="pi-dev-tarjeta-estado">
                  <FaCheckCircle /> {esNegocio ? 'Código de negocio válido' : 'Código QR Válido'}
                </div>

                {!esNegocio && (tarjetaQR.usuario?.foto || tarjetaQR.foto) && (
                  <img width="140" height="140" src={tarjetaQR.usuario?.foto || tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-dev-tarjeta-foto" />
                )}
                <h2 className="pi-dev-tarjeta-nombre">{tarjetaQR.nombre}</h2>
                <span className={`pi-dev-badge-tipo ${esNegocio ? 'negocio' : 'normal'}`}>
                  {esNegocio ? <FaBuilding /> : <FaUser />} Usuario {tarjetaQR.tipo}
                </span>

                <div className="pi-dev-tarjeta-datos">
                  <div className="pi-dev-tarjeta-dato">
                    {esNegocio ? <FaBuilding /> : <FaIdCard />}
                    <div>
                      <span className="label">{esNegocio ? 'Ganancias del evento' : 'Documento'}</span>
                      <span className="valor">
                        {esNegocio ? (tarjetaQR.eventoNombre || eventoDetalle.nombre) : (tarjetaQR.documento || tarjetaQR.ci || '—')}
                      </span>
                    </div>
                  </div>
                  <div className="pi-dev-tarjeta-dato">
                    <FaWallet />
                    <div>
                      <span className="label">{esNegocio ? 'Disponible para retirar' : 'Saldo Disponible'}</span>
                      <span className="valor">{tarjetaQR.saldoDisponible} pts</span>
                    </div>
                  </div>
                </div>

                {esNegocio && (
                  <p className="pi-dev-negocio-aviso">
                    <FaExclamationTriangle aria-hidden="true" /> Retiro de un negocio: se exige
                    foto del carnet <strong>y</strong> foto de la cara de quien cobra.
                  </p>
                )}

                <div className="pi-dev-form-monto">
                  <label htmlFor="dev-monto"><FaMoneyBillWave aria-hidden="true" /> Monto a retirar (puntos)</label>
                  <input
                    id="dev-monto"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    placeholder="Ej: 50"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    autoFocus
                  />
                  <div className="pi-dev-montos-rapidos">
                    <button type="button" onClick={() => setMonto(String(Math.round(tarjetaQR.saldoDisponible / 2)))}>
                      Mitad
                    </button>
                    <button type="button" onClick={() => setMonto(String(tarjetaQR.saldoDisponible))}>
                      Retirar todo
                    </button>
                  </div>

                  {excedeSaldo && (
                    <div className="pi-dev-alerta-error">
                      <FaExclamationTriangle /> Saldo insuficiente: el máximo disponible es {tarjetaQR.saldoDisponible} pts.
                    </div>
                  )}

                  <label htmlFor="dev-motivo" className="pi-dev-motivo-label">Motivo del retiro</label>
                  <select
                    id="dev-motivo"
                    className="pi-dev-motivo-select"
                    value={motivoDevol}
                    onChange={(e) => setMotivoDevol(e.target.value)}
                  >
                    {MOTIVOS_DEVOLUCION.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                  {motivoDevol === 'otro' && (
                    <input
                      type="text"
                      className="pi-dev-motivo-nota"
                      placeholder="Detalle del motivo"
                      value={notaDevol}
                      onChange={(e) => setNotaDevol(e.target.value)}
                      maxLength={140}
                    />
                  )}
                </div>

                <div className="pi-dev-form-carnet">
                  <p className="pi-dev-form-carnet-titulo"><FaIdCard aria-hidden="true" /> Foto del carnet de quien retira</p>

                  {capturandoFotoCarnet ? (
                    <CapturarFoto
                      onCapturada={async (foto) => {
                        setCapturandoFotoCarnet(false);
                        try {
                          setFotoCarnet(await subirFotoCapturada(foto, 'carnets'));
                        } catch (err) {
                          setErrorEscaneo(err.message);
                        }
                      }}
                      onCancelar={() => setCapturandoFotoCarnet(false)}
                    />
                  ) : fotoCarnet ? (
                    <div className="pi-dev-carnet-preview">
                      <img width="200" height="150" src={fotoCarnet} alt="Carnet de quien retira" />
                      <button type="button" className="pi-dev-btn-retomar" onClick={() => setCapturandoFotoCarnet(true)}>
                        <FaRedo /> Tomar otra
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="pi-dev-btn-tomar-foto" onClick={() => setCapturandoFotoCarnet(true)}>
                      <FaCamera /> Tomar foto del carnet
                    </button>
                  )}
                </div>

                {esNegocio && (
                  <div className="pi-dev-form-carnet">
                    <p className="pi-dev-form-carnet-titulo"><FaUser aria-hidden="true" /> Foto de la cara de quien cobra</p>
                    {capturandoFotoRostro ? (
                      <CapturarFoto
                        onCapturada={async (foto) => {
                          setCapturandoFotoRostro(false);
                          try {
                            setFotoRostro(await subirFotoCapturada(foto, 'carnets'));
                          } catch (err) {
                            setErrorEscaneo(err.message);
                          }
                        }}
                        onCancelar={() => setCapturandoFotoRostro(false)}
                      />
                    ) : fotoRostro ? (
                      <div className="pi-dev-carnet-preview">
                        <img width="200" height="150" src={fotoRostro} alt="Cara de quien cobra" />
                        <button type="button" className="pi-dev-btn-retomar" onClick={() => setCapturandoFotoRostro(true)}>
                          <FaRedo /> Tomar otra
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="pi-dev-btn-tomar-foto" onClick={() => setCapturandoFotoRostro(true)}>
                        <FaCamera /> Tomar foto de la cara
                      </button>
                    )}
                  </div>
                )}

                <div className="pi-dev-tarjeta-acciones">
                  <button type="button" className="pi-dev-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                  <button
                    className="pi-dev-btn-confirmar"
                    onClick={confirmarRetiro}
                    disabled={!monto || Number(monto) <= 0 || excedeSaldo || !fotoCarnet || (esNegocio && !fotoRostro)}
                  >
                    <FaCheckCircle /> Confirmar Retiro
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
