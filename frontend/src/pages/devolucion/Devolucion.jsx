import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaTimes, FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle,
  FaMoneyBillWave, FaUser, FaBuilding, FaHistory, FaCamera, FaRedo, FaMapMarkerAlt, FaArrowLeft
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha } from '../../utils/eventos.js';
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
  const [entradasEvento, setEntradasEvento] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [monto, setMonto] = useState('');
  const [fotoCarnet, setFotoCarnet] = useState(null);
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
    api.entradas.listar({ eventoId: ev.id }).then(lista =>
      setEntradasEvento(
        lista.filter(e => e.usuarioId).map(e => ({ ...e, tipo: 'Normal', saldoDisponible: Number(e.usuario?.saldo ?? 0) }))
      )
    );
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

  const handleSimularEscaneo = () => {
    const pool = [...entradasEvento, ...negocios];
    if (pool.length === 0) return;
    setEscaneando(true);
    setMonto('');
    setFotoCarnet(null);
    setRetiroExitoso(null);

    setTimeout(() => {
      const elegido = pool[Math.floor(Math.random() * pool.length)];
      setTarjetaQR(elegido);
      setEscaneando(false);
    }, 700);
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setMonto('');
    setFotoCarnet(null);
    setRetiroExitoso(null);
  };

  const handleFotoCarnet = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onloadend = () => setFotoCarnet(lector.result);
    lector.readAsDataURL(archivo);
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
          <h3>Escanea el código QR del usuario o negocio</h3>
          <p>Solo se muestran los datos de la persona escaneada — no hay acceso al listado completo de usuarios.</p>
          <button className="pi-dev-btn-escanear" onClick={handleSimularEscaneo} disabled={escaneando}>
            <FaQrcode /> {escaneando ? 'Escaneando...' : 'Simular Escaneo QR'}
          </button>
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

                {tarjetaQR.foto && <img src={tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-dev-tarjeta-foto" />}
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

                  {fotoCarnet ? (
                    <div className="pi-dev-carnet-preview">
                      <img src={fotoCarnet} alt="Carnet de quien retira" />
                      <label htmlFor="pi-dev-foto-carnet" className="pi-dev-btn-retomar">
                        <FaRedo /> Tomar otra
                      </label>
                    </div>
                  ) : (
                    <label htmlFor="pi-dev-foto-carnet" className="pi-dev-btn-tomar-foto">
                      <FaCamera /> Tomar foto del carnet
                    </label>
                  )}
                  <input
                    id="pi-dev-foto-carnet"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoCarnet}
                    hidden
                  />
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
