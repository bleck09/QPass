import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaTimes, FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle,
  FaMoneyBillWave, FaUser, FaBuilding, FaHistory, FaCamera, FaRedo, FaMapMarkerAlt, FaArrowLeft
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { subirFotoCapturada } from '../../utils/imagenes.js';
import { formatearFecha, estadoEvento } from '../../utils/eventos.js';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import EscanerQr from '../../components/EscanerQr.jsx';
import CapturarFoto from '../../components/CapturarFoto.jsx';
import './Devolucion.css';
import '../supervisor/GestionEntrega.css';
import { ROLES } from '../../constants/roles.js';

export default function Devolucion() {
  useTituloPagina('Devoluciones');
  const sesion = leerSesion();
  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/historial') ? 'historial' : 'escanear';

  // Carga primaria (eventos asignados + negocios) con cargando/error/reintentar (Manual 8.9).
  const cargarInicial = useCallback(async () => {
    const [eventos, negociosRaw] = await Promise.all([
      api.eventos.misAsignados(sesion.id, sesion.rol),
      api.usuarios.listar({ rol: ROLES.USUARIO_NEGOCIO }),
    ]);
    return {
      eventos,
      negocios: negociosRaw.map(n => ({
        ...n, tipo: 'Negocio', usuarioId: n.id, saldoDisponible: Number(n.saldo),
      })),
    };
  }, [sesion.id, sesion.rol]);
  const {
    data: datosIniciales,
    cargando: cargandoInicial,
    error: errorInicial,
    recargar: recargarInicial,
  } = useApi(cargarInicial, { inicial: { eventos: [], negocios: [] } });
  const { eventos, negocios } = datosIniciales;

  const [eventoDetalle, setEventoDetalle] = useState(null);
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);

  // Gestión de foco de los modales (A1 / Manual 8.6): el foco entra al modal,
  // queda atrapado con Tab y vuelve al disparador al cerrar.
  const modalEscanerRef = useRef(null);
  const modalTarjetaRef = useRef(null);
  useFocoModal(modalEscanerRef, escaneando);
  useFocoModal(modalTarjetaRef, !!tarjetaQR);
  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const [monto, setMonto] = useState('');
  const [fotoCarnet, setFotoCarnet] = useState(null);
  const [capturandoFotoCarnet, setCapturandoFotoCarnet] = useState(false);
  const [retiroExitoso, setRetiroExitoso] = useState(null);
  const [retiros, setRetiros] = useState([]);

  const abrirEvento = (ev) => {
    setEventoDetalle(ev);
    // Solo cubre retiros hechos contra la billetera de una Entrada de este evento
    // (los retiros de saldo de Usuario Negocio no están ligados a un evento en el backend).
    api.transacciones.listar({ eventoId: ev.id, tipo: 'devolucion' }).then(lista =>
      setRetiros(lista.filter(t => t.operador.id === sesion.id))
    );
  };

  const volverALista = () => setEventoDetalle(null);

  const totalRetiradoHoy = useMemo(
    () => retiros.reduce((suma, item) => suma + Number(item.monto), 0),
    [retiros]
  );

  const excedeSaldo = tarjetaQR && Number(monto) > tarjetaQR.saldoDisponible;

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
        setErrorEscaneo('Este participante no tiene una cuenta con billetera — no se le puede hacer un retiro.');
        return;
      }
      setMonto('');
      setFotoCarnet(null);
      setRetiroExitoso(null);
      setTarjetaQR({ ...entrada, tipo: 'Normal', saldoDisponible: Number(entrada.usuario?.saldo ?? 0) });
    } catch (err) {
      setErrorEscaneo(err.message);
    } finally {
      setBuscando(false);
    }
  };

  // Los Usuario Negocio todavía no tienen un código QR propio en la base (CodigoQr solo se
  // vincula a Entrada), así que por ahora esta parte sigue simulada: se elige uno al azar de
  // la lista ya cargada en vez de escanearlo. El monto y la foto de carnet sí se guardan de
  // verdad al confirmar el retiro.
  const handleSimularSeleccionNegocio = () => {
    if (negocios.length === 0) return;
    setErrorEscaneo('');
    setMonto('');
    setFotoCarnet(null);
    setRetiroExitoso(null);
    setTarjetaQR(negocios[Math.floor(Math.random() * negocios.length)]);
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setMonto('');
    setFotoCarnet(null);
    setCapturandoFotoCarnet(false);
    setRetiroExitoso(null);
  };

  // Modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  const hayModalAbierto = escaneando || !!tarjetaQR;
  useEffect(() => {
    if (!hayModalAbierto) return;
    const alTecla = (e) => {
      if (e.key !== 'Escape') return;
      setEscaneando(false);
      cerrarTarjeta();
    };
    window.addEventListener('keydown', alTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTecla);
      document.body.style.overflow = '';
    };
  }, [hayModalAbierto]);

  const confirmarRetiro = async () => {
    const valor = Number(monto);
    if (!tarjetaQR || !valor || valor <= 0 || valor > tarjetaQR.saldoDisponible || !fotoCarnet) return;

    await api.transacciones.devolucion({
      usuarioId: tarjetaQR.usuarioId,
      entradaId: tarjetaQR.tipo === 'Normal' ? tarjetaQR.id : undefined,
      monto: valor,
      fotoCarnetUrl: fotoCarnet,
      eventoId: eventoDetalle.id,
    });

    if (tarjetaQR.tipo === 'Normal') {
      api.transacciones.listar({ eventoId: eventoDetalle.id, tipo: 'devolucion' }).then(lista =>
        setRetiros(lista.filter(t => t.operador.id === sesion.id))
      );
    }

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
        </div>
      </div>

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-dev-escanear-panel">
          <FaQrcode size={70} color="var(--cian-digital)" />
          <h3>Escanea el código QR del participante</h3>
          <p>Apunta la cámara a la manilla del participante para cargar sus datos y procesar el retiro.</p>
          <button type="button" className="pi-dev-btn-escanear" onClick={iniciarEscaneo} disabled={escaneando || buscando}>
            <FaQrcode /> {buscando ? 'Buscando...' : 'Escanear Código QR'}
          </button>
          {errorEscaneo && (
            <p className="pi-entrega-aviso pi-entrega-aviso-error" style={{ marginTop: '12px' }}>
              <FaExclamationTriangle /> {errorEscaneo}
            </p>
          )}

          <p style={{ marginTop: '24px' }}>
            Los Usuario Negocio todavía no tienen un código QR propio para escanear — mientras
            se implementa eso, elegí uno al azar de la lista para probar ese flujo.
          </p>
          <button type="button" className="pi-dev-btn-escanear" onClick={handleSimularSeleccionNegocio} disabled={negocios.length === 0}>
            <FaBuilding /> Simular selección de Negocio
          </button>
        </div>
      )}

      {/* --- MODAL: ESCÁNER DE QR (cámara real) --- */}
      {escaneando && (
        <div className="pi-dev-modal-overlay" onClick={() => setEscaneando(false)}>
          <div
            ref={modalEscanerRef}
            tabIndex={-1}
            className="pi-dev-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-modal-escaner-titulo"
          >
            <h3 id="dev-modal-escaner-titulo" style={{ textAlign: 'center', marginBottom: '14px' }}>
              <FaQrcode aria-hidden="true" /> Escanear manilla
            </h3>
            <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
          </div>
        </div>
      )}

      {/* --- PESTAÑA: HISTORIAL --- */}
      {pestana === 'historial' && (
        <div className="pi-dev-historial">
          <div className="pi-dev-resumen">
            <div className="pi-dev-resumen-stat">
              <span className="numero">{retiros.length}</span>
              <span className="label">Retiros realizados</span>
            </div>
            <div className="pi-dev-resumen-stat">
              <span className="numero">{totalRetiradoHoy} pts</span>
              <span className="label">Total devuelto</span>
            </div>
          </div>

          <div className="pi-dev-tabla-wrapper">
            <table className="pi-dev-tabla">
              <thead>
                <tr>
                  <th scope="col">Beneficiario</th>
                  <th scope="col">Documento</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Carnet</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Saldo Resultante</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Hora</th>
                </tr>
              </thead>
              <tbody>
                {retiros.map(item => (
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
                ))}
                {retiros.length === 0 && (
                  <tr>
                    <td colSpan={8} className="pi-dev-sin-resultados">
                      Aún no has procesado ninguna devolución para este evento.
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
        <div className="pi-dev-modal-overlay" onClick={cerrarTarjeta}>
          <div
            ref={modalTarjetaRef}
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
                  <FaCheckCircle /> Código QR Válido
                </div>

                {(tarjetaQR.usuario?.foto || tarjetaQR.foto) && (
                  <img width="140" height="140" src={tarjetaQR.usuario?.foto || tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-dev-tarjeta-foto" />
                )}
                <h2 className="pi-dev-tarjeta-nombre">{tarjetaQR.nombre}</h2>
                <span className={`pi-dev-badge-tipo ${tarjetaQR.tipo === 'Negocio' ? 'negocio' : 'normal'}`}>
                  {tarjetaQR.tipo === 'Negocio' ? <FaBuilding /> : <FaUser />} Usuario {tarjetaQR.tipo}
                </span>

                <div className="pi-dev-tarjeta-datos">
                  <div className="pi-dev-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Documento</span>
                      <span className="valor">{tarjetaQR.documento || tarjetaQR.ci || '—'}</span>
                    </div>
                  </div>
                  <div className="pi-dev-tarjeta-dato">
                    <FaWallet />
                    <div>
                      <span className="label">Saldo Disponible</span>
                      <span className="valor">{tarjetaQR.saldoDisponible} pts</span>
                    </div>
                  </div>
                </div>

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

                <div className="pi-dev-tarjeta-acciones">
                  <button type="button" className="pi-dev-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                  <button
                    className="pi-dev-btn-confirmar"
                    onClick={confirmarRetiro}
                    disabled={!monto || Number(monto) <= 0 || excedeSaldo || !fotoCarnet}
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
