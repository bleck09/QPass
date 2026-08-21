import { useEffect, useMemo, useState } from 'react';
import {
  FaUsers, FaCheckCircle, FaQrcode, FaTimes,
  FaSearch, FaIdCard, FaTicketAlt,  FaUserCheck, FaExclamationTriangle,
  FaSignOutAlt, FaCamera, FaHistory, FaSignInAlt, FaUserSecret, FaSyncAlt,
  FaMapMarkerAlt, FaArrowLeft
} from 'react-icons/fa';
import api from '../../api/index.js';
import { formatearFecha } from '../../utils/eventos.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import CapturarFoto from '../../components/CapturarFoto.jsx';
import './Supervisor.css';
import './GestionEntrega.css';

export default function Supervisor() {
  const [eventos, setEventos] = useState([]);
  const [eventoIdDetalle, setEventoIdDetalle] = useState(null);
  const [participantes, setParticipantes] = useState([]);

  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [historialTarjeta, setHistorialTarjeta] = useState([]);
  const [fotoCapturadaTemporal, setFotoCapturadaTemporal] = useState(null);
  const [capturandoFoto, setCapturandoFoto] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');

  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [alertaToggle, setAlertaToggle] = useState(''); // Mensaje de error interno del modal

  useEffect(() => { api.eventos.listar().then(setEventos); }, []);

  const eventoDetalle = eventos.find(ev => ev.id === eventoIdDetalle) || null;

  const abrirEvento = (ev) => {
    setEventoIdDetalle(ev.id);
    api.entradas.listar({ eventoId: ev.id }).then(setParticipantes);
  };

  const volverALista = () => {
    setEventoIdDetalle(null);
    setParticipantes([]);
  };

  const stats = useMemo(() => {
    const total = participantes.length;
    const adentro = participantes.filter(p => p.estadoIngreso === 'ingresado').length;
    const afuera = participantes.filter(p => p.estadoIngreso === 'salio').length;
    const pendientes = participantes.filter(p => p.estadoIngreso === 'pendiente').length;
    const pctAdentro = total ? Math.round((adentro / total) * 1000) / 10 : 0;
    return { total, adentro, afuera, pendientes, pctAdentro };
  }, [participantes]);

  const listaFiltrada = useMemo(() => {
    return participantes.filter(p => {
      const coincideFiltro = filtro === 'todos' || p.estadoIngreso === filtro;
      const coincideBusqueda =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.documento || '').toLowerCase().includes(busqueda.toLowerCase());
      return coincideFiltro && coincideBusqueda;
    });
  }, [participantes, filtro, busqueda]);

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
  };

  const actualizarParticipante = (entradaActualizada) => {
    setTarjetaQR(entradaActualizada);
    setParticipantes(prev => prev.map(p => p.id === entradaActualizada.id ? entradaActualizada : p));
    api.entradas.registros(entradaActualizada.id).then(setHistorialTarjeta);
  };

  // ========================================================
  // REGISTRAR INGRESO / SALIDA — la foto solo es obligatoria la primera vez que esta entrada
  // pasa por control (identifica quién retiró la manilla). Si ya tiene un registro previo,
  // ya no hace falta volver a tomarla para entrar o salir de nuevo.
  // ========================================================
  const requiereFoto = historialTarjeta.length === 0;

  const registrarMovimiento = async (tipo) => {
    if (requiereFoto && !fotoCapturadaTemporal) {
      setAlertaToggle('Toma una foto antes de registrar el primer ingreso.');
      return;
    }
    setAlertaToggle('');
    const actualizado = tipo === 'salida'
      ? await api.entradas.salida(tarjetaQR.id, fotoCapturadaTemporal)
      : await api.entradas.ingreso(tarjetaQR.id, fotoCapturadaTemporal);
    setFotoCapturadaTemporal(null);
    actualizarParticipante(actualizado);
  };

  if (!eventoDetalle) {
    return (
      <div className="pi-sup-container">
        <div className="pi-sup-header">
          <h2>Punto de Control de Accesos</h2>
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
    <div className="pi-sup-container">

      <div className="pi-sup-header">
        <div>
          <button className="pi-entrega-btn-volver" onClick={volverALista}>
            <FaArrowLeft /> Cambiar de evento
          </button>
          <h2>{eventoDetalle.nombre}</h2>
        </div>

        <div className="pi-sup-simuladores">
          <button className="pi-sup-btn-escanear-general" onClick={iniciarEscaneo} disabled={escaneando || buscando}>
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
        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-total"><FaUsers /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.total}</span>
            <span className="pi-sup-stat-label">Total Participantes</span>
          </div>
        </div>
        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-ok"><FaUserCheck /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.adentro}</span>
            <span className="pi-sup-stat-label">Personas Adentro</span>
          </div>
          <span className="pi-sup-stat-porcentaje pi-sup-badge-ok">{stats.pctAdentro}%</span>
        </div>
        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-out"><FaSignOutAlt /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.afuera}</span>
            <span className="pi-sup-stat-label">Salieron Temporalmente</span>
          </div>
        </div>
      </div>

      {/* --- LISTADO DE AUDITORÍA --- */}
      <div className="pi-sup-lista-card">
        <div className="pi-sup-lista-header">
          <h3>Auditoría de Asistentes</h3>
          <div className="pi-sup-lista-controles">
            <div className="pi-sup-buscador">
              <FaSearch />
              <input type="text" placeholder="Buscar por nombre o CI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="pi-sup-filtros">
              <button className={filtro === 'todos' ? 'activo' : ''} onClick={() => setFiltro('todos')}>Todos</button>
              <button className={filtro === 'ingresado' ? 'activo' : ''} onClick={() => setFiltro('ingresado')}>Adentro</button>
              <button className={filtro === 'salio' ? 'activo' : ''} onClick={() => setFiltro('salio')}>Afuera</button>
              <button className={filtro === 'pendiente' ? 'activo' : ''} onClick={() => setFiltro('pendiente')}>Pendientes</button>
            </div>
          </div>
        </div>

        <div className="pi-sup-tabla-wrapper">
          <table className="pi-sup-tabla">
            <thead>
              <tr>
                <th>Participante</th>
                <th>Documento</th>
                <th>Entrada</th>
                <th>Estado Actual</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(p => {
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="pi-sup-fila-persona">
                        {p.foto && <img src={p.foto} alt={p.nombre} className="pi-sup-mini-avatar" />}
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.documento || '—'}</td>
                    <td>{p.categoriaTicket?.nombre || '—'}</td>
                    <td>
                      {p.estadoIngreso === 'ingresado' && <span className="pi-sup-badge pi-sup-badge-ok">Adentro</span>}
                      {p.estadoIngreso === 'salio' && <span className="pi-sup-badge pi-sup-badge-out">Salió</span>}
                      {p.estadoIngreso === 'pendiente' && <span className="pi-sup-badge pi-sup-badge-pend">Pendiente</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: ESCÁNER DE QR (cámara real) --- */}
      {escaneando && (
        <div className="pi-sup-modal-overlay" onClick={() => setEscaneando(false)}>
          <div className="pi-sup-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textAlign: 'center', marginBottom: '14px' }}><FaQrcode /> Escanear manilla</h3>
            <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE CONTROL DINÁMICO (INTERRUPTOR)
      ========================================================= */}
      {tarjetaQR && (
        <div className="pi-sup-modal-overlay" onClick={cerrarTarjeta}>
          <div className="pi-sup-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            
            <button className="pi-sup-btn-cerrar" onClick={cerrarTarjeta}><FaTimes /></button>

            {/* HEADER DE ESTADO */}
            <div className="pi-sup-tarjeta-estado">
              <div className="estado-badge">
                <FaCheckCircle /> Lectura Exitosa
              </div>
            </div>

            {/* FOTOS SUPERPUESTAS */}
            <div className="pi-sup-fotos-comparacion dual-photo">

              <div className="foto-box">
                {tarjetaQR.foto
                  ? <img src={tarjetaQR.foto} alt="Perfil" className="foto-img" />
                  : <div className="foto-placeholder"><FaIdCard size={26} /></div>}
                <span className="foto-label text-gray">FOTO DE PERFIL</span>
              </div>

              {/* La foto solo es obligatoria en el primer registro de esta entrada. */}
              {!capturandoFoto && (
                <div className="foto-box">
                  {fotoCapturadaTemporal ? (
                    <div className="foto-capturada-container">
                      <img src={fotoCapturadaTemporal} alt="Captura" className="foto-img border-cyan" />
                      <button className="btn-retake" onClick={descartarFoto} title="Volver a tomar"><FaSyncAlt /></button>
                      <span className="foto-label text-cyan"><FaUserSecret/> FOTO EN PUERTA</span>
                    </div>
                  ) : (
                    <div className="foto-placeholder" onClick={() => setCapturandoFoto(true)}>
                      <FaCamera size={26}/>
                      <span>{requiereFoto ? <>Tomar Foto<br/>Obligatoria</> : <>Tomar Foto<br/>(opcional)</>}</span>
                    </div>
                  )}
                </div>
              )}

            </div>

            {capturandoFoto && (
              <CapturarFoto
                onCapturada={(foto) => { setFotoCapturadaTemporal(foto); setCapturandoFoto(false); }}
                onCancelar={() => setCapturandoFoto(false)}
              />
            )}

            <h2 className="pi-sup-tarjeta-nombre">{tarjetaQR.nombre}</h2>

            <div className="pi-sup-info-card">
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

            {alertaToggle && (
              <div className="pi-sup-alerta-modal">
                <FaExclamationTriangle /> {alertaToggle}
              </div>
            )}

            <div className="pi-sup-historial-section">
              <h4 className="historial-title"><FaHistory /> Historial de Accesos</h4>
              {historialTarjeta.length === 0 ? (
                <p className="historial-vacio">Sin registros previos.</p>
              ) : (
                <div className="historial-list">
                  {historialTarjeta.map((mov) => (
                    <div key={mov.id} className={`historial-item ${mov.tipo === 'ingreso' ? 'item-in' : 'item-out'}`}>
                      {mov.tipo === 'ingreso' ? <FaSignInAlt/> : <FaSignOutAlt/>}
                      <span>
                        {mov.tipo === 'ingreso' ? 'Entrada' : 'Salida'} registrada el {formatearFecha(mov.createdAt)}
                        {' '}por {mov.registradoPor?.nombre}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* =========================================
                FOOTER: la foto solo es obligatoria en el primer ingreso de esta entrada.
                Puede alternar ingreso/salida tantas veces como haga falta (ej. alguien
                que sale y vuelve a entrar) — no hay límite de ciclos.
            ========================================= */}
            <div className="pi-sup-modal-footer">
              <div className="pi-sup-toggle-switch">
                <button
                  className={`toggle-option ${tarjetaQR.estadoIngreso === 'salio' ? 'active-out' : ''} ${requiereFoto && !fotoCapturadaTemporal ? 'sin-foto' : ''}`}
                  onClick={() => registrarMovimiento('salida')}
                >
                  <FaSignOutAlt /> REGISTRAR SALIDA
                </button>

                <button
                  className={`toggle-option ${tarjetaQR.estadoIngreso === 'ingresado' ? 'active-in' : ''} ${requiereFoto && !fotoCapturadaTemporal ? 'sin-foto' : ''}`}
                  onClick={() => registrarMovimiento('ingreso')}
                >
                  <FaSignInAlt /> REGISTRAR INGRESO
                </button>
              </div>
              {requiereFoto && !fotoCapturadaTemporal && (
                <p className="pi-sup-hint-foto">Toma la foto de la puerta (arriba) para poder registrar el primer ingreso.</p>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}