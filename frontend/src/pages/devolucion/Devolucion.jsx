import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaTimes, FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle,
  FaMoneyBillWave, FaUser, FaBuilding, FaHistory, FaCamera, FaRedo, FaMapMarkerAlt, FaArrowLeft
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha } from '../../utils/eventos.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import CapturarFoto from '../../components/CapturarFoto.jsx';
import './Devolucion.css';
import '../supervisor/GestionEntrega.css';
import { ROLES } from '../../constants/roles.js';

export default function Devolucion() {
  const sesion = leerSesion();
  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/historial') ? 'historial' : 'escanear';

  const [eventos, setEventos] = useState([]);
  const [eventoDetalle, setEventoDetalle] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const [monto, setMonto] = useState('');
  const [fotoCarnet, setFotoCarnet] = useState(null);
  const [capturandoFotoCarnet, setCapturandoFotoCarnet] = useState(false);
  const [retiroExitoso, setRetiroExitoso] = useState(null);
  const [retiros, setRetiros] = useState([]);

  useEffect(() => {
    api.eventos.listar().then(setEventos);
    api.usuarios.listar({ rol: ROLES.USUARIO_NEGOCIO }).then(lista =>
      setNegocios(lista.map(n => ({ ...n, tipo: 'Negocio', usuarioId: n.id, saldoDisponible: Number(n.saldo) })))
    );
  }, []);

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
          <h2>Gestión de Devoluciones</h2>
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
    <div className="pi-dev-container">

      <div className="pi-dev-header">
        <div>
          <button className="pi-entrega-btn-volver" onClick={volverALista}>
            <FaArrowLeft /> Cambiar de evento
          </button>
          <h2>{eventoDetalle.nombre}</h2>
        </div>
        <div className="pi-dev-tabs">
          <button
            className={pestana === 'escanear' ? 'activo' : ''}
            onClick={() => navigate('/devolucion')}
          >
            <FaQrcode /> Escanear QR
          </button>
          <button
            className={pestana === 'historial' ? 'activo' : ''}
            onClick={() => navigate('/devolucion/historial')}
          >
            <FaHistory /> Historial ({retiros.length})
          </button>
        </div>
      </div>

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-dev-escanear-panel">
          <FaQrcode size={70} color="var(--cian-digital)" />
          <h3>Escanea el código QR del participante</h3>
          <p>Apunta la cámara a la manilla del participante para cargar sus datos y procesar el retiro.</p>
          <button className="pi-dev-btn-escanear" onClick={iniciarEscaneo} disabled={escaneando || buscando}>
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
          <button className="pi-dev-btn-escanear" onClick={handleSimularSeleccionNegocio} disabled={negocios.length === 0}>
            <FaBuilding /> Simular selección de Negocio
          </button>
        </div>
      )}

      {/* --- MODAL: ESCÁNER DE QR (cámara real) --- */}
      {escaneando && (
        <div className="pi-dev-modal-overlay" onClick={() => setEscaneando(false)}>
          <div className="pi-dev-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textAlign: 'center', marginBottom: '14px' }}><FaQrcode /> Escanear manilla</h3>
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
                  <th>Beneficiario</th>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Carnet</th>
                  <th>Monto</th>
                  <th>Saldo Resultante</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {retiros.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="pi-dev-fila-persona">
                        {item.entrada?.foto && <img src={item.entrada.foto} alt={item.entrada.nombre} className="pi-dev-mini-avatar" />}
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
                        ? <img src={item.fotoCarnetUrl} alt={`Carnet de ${item.entrada?.nombre}`} className="pi-dev-mini-carnet" />
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
          <div className="pi-dev-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <button className="pi-dev-btn-cerrar" onClick={cerrarTarjeta}><FaTimes /></button>

            {retiroExitoso ? (
              <div className="pi-dev-exito">
                <FaCheckCircle size={60} color="var(--verde-recarga)" />
                <h3>¡Retiro realizado!</h3>
                <p>Se descontaron <strong>{retiroExitoso.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                <div className="pi-dev-exito-saldo">
                  <FaWallet /> Saldo restante: <strong>{retiroExitoso.saldo} pts</strong>
                </div>
                <button className="pi-dev-btn-confirmar" onClick={cerrarTarjeta}>Listo</button>
              </div>
            ) : (
              <>
                <div className="pi-dev-tarjeta-estado">
                  <FaCheckCircle /> Código QR Válido
                </div>

                {(tarjetaQR.usuario?.foto || tarjetaQR.foto) && (
                  <img src={tarjetaQR.usuario?.foto || tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-dev-tarjeta-foto" />
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
                  <label><FaMoneyBillWave /> Monto a retirar (puntos)</label>
                  <input
                    type="number"
                    min="1"
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
                  <label><FaIdCard /> Foto del carnet de quien retira</label>

                  {capturandoFotoCarnet ? (
                    <CapturarFoto
                      onCapturada={(foto) => { setFotoCarnet(foto); setCapturandoFotoCarnet(false); }}
                      onCancelar={() => setCapturandoFotoCarnet(false)}
                    />
                  ) : fotoCarnet ? (
                    <div className="pi-dev-carnet-preview">
                      <img src={fotoCarnet} alt="Carnet de quien retira" />
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
                  <button className="pi-dev-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
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
