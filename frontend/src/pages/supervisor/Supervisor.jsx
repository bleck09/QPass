import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaUsers, FaCheckCircle, FaQrcode, FaTimes,
  FaSearch, FaIdCard, FaTicketAlt,  FaUserCheck, FaExclamationTriangle,
  FaSignOutAlt, FaCamera, FaHistory, FaSignInAlt, FaUserSecret, FaSyncAlt,
  FaMapMarkerAlt, FaArrowLeft, FaCalendarAlt
} from 'react-icons/fa';

// Debe coincidir con MARGEN_INGRESO_ANTICIPADO_HORAS del backend
// (backend/src/modules/entradas/entradas.service.ts). Ver README → "Reglas de negocio".
const MARGEN_INGRESO_ANTICIPADO_HORAS = 3;
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha } from '../../utils/eventos.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import CapturarFoto from '../../components/CapturarFoto.jsx';
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

  const [eventoIdDetalle, setEventoIdDetalle] = useState(null);
  const [participantes, setParticipantes] = useState([]);

  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [historialTarjeta, setHistorialTarjeta] = useState([]);
  const [fotoCapturadaTemporal, setFotoCapturadaTemporal] = useState(null);
  const [capturandoFoto, setCapturandoFoto] = useState(false);
  const [escaneando, setEscaneando] = useState(false);

  // Gestión de foco de los modales (A1 / Manual 8.6): el foco entra al modal,
  // queda atrapado con Tab y vuelve al disparador al cerrar.
  const modalEscanerRef = useRef(null);
  const modalTarjetaRef = useRef(null);
  useFocoModal(modalEscanerRef, escaneando);
  useFocoModal(modalTarjetaRef, !!tarjetaQR);
  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');

  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [alertaToggle, setAlertaToggle] = useState(''); // Mensaje de error interno del modal


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

  const actualizarParticipante = (entradaActualizada) => {
    setTarjetaQR(entradaActualizada);
    setParticipantes(prev => prev.map(p => p.id === entradaActualizada.id ? entradaActualizada : p));
    api.entradas.registros(entradaActualizada.id).then(setHistorialTarjeta);
  };

  // ========================================================
  // REGISTRAR INGRESO / SALIDA — la foto es UNA sola por Entrada (persona-evento), guardada en
  // Entrada.foto. Es obligatoria mientras esa entrada no tenga foto todavía (primera vez, o si
  // se olvidó tomarla); una vez que existe, se reutiliza en cada ingreso/salida siguiente y no
  // hace falta volver a tomarla. El supervisor puede retomarla manualmente si quiere corregirla.
  // ========================================================
  const requiereFoto = !tarjetaQR?.usuario?.foto && !tarjetaQR?.foto;

  // "Foto de perfil" real (la que el usuario cargó en su cuenta) casi nunca existe — la
  // mayoría son invitados sin cuenta. Para esos casos la referencia es Entrada.foto, la
  // foto tomada la primera vez que esta entrada pasó por control.
  const fotoReferencia = tarjetaQR?.usuario?.foto || tarjetaQR?.foto || null;
  const fotoReferenciaLabel = tarjetaQR?.usuario?.foto ? 'FOTO DE PERFIL' : 'FOTO REGISTRADA';

  // Ventana de ingreso: desde N horas antes del inicio hasta la hora de fin, y no
  // si el evento está finalizado. La salida no tiene ventana (siempre se permite).
  // Se reevalúa cada minuto para que la puerta se habilite/cierre sola.
  const [ingresoDentroDeVentana, setIngresoDentroDeVentana] = useState(false);
  useEffect(() => {
    const evaluar = () => {
      if (!eventoDetalle) return setIngresoDentroDeVentana(false);
      const ahora = Date.now();
      const inicio = new Date(eventoDetalle.fecha).getTime();
      const fin = new Date(eventoDetalle.fechaFin).getTime();
      const apertura = inicio - MARGEN_INGRESO_ANTICIPADO_HORAS * 60 * 60 * 1000;
      return setIngresoDentroDeVentana(
        eventoDetalle.estado !== 'finalizado' && ahora >= apertura && ahora <= fin
      );
    };
    evaluar();
    const t = setInterval(evaluar, 60000);
    return () => clearInterval(t);
  }, [eventoDetalle]);

  const registrarMovimiento = async (tipo) => {
    if (tipo === 'salida' && tarjetaQR.estadoIngreso !== 'ingresado') {
      setAlertaToggle('Esta entrada no está adentro — no se puede registrar una salida.');
      return;
    }
    if (tipo === 'ingreso' && tarjetaQR.estadoIngreso === 'ingresado') {
      setAlertaToggle('Esta entrada ya está registrada como ingresada.');
      return;
    }
    if (tipo === 'ingreso' && !ingresoDentroDeVentana) {
      setAlertaToggle(
        `Fuera del horario de ingreso de "${eventoDetalle.nombre}": se habilita ${MARGEN_INGRESO_ANTICIPADO_HORAS} h antes del inicio y hasta el cierre.`
      );
      return;
    }
    if (requiereFoto && !fotoCapturadaTemporal) {
      setAlertaToggle('Toma una foto de esta entrada antes de registrar el movimiento.');
      return;
    }
    setAlertaToggle('');
    try {
      const actualizado = tipo === 'salida'
        ? await api.entradas.salida(tarjetaQR.id, fotoCapturadaTemporal)
        : await api.entradas.ingreso(tarjetaQR.id, fotoCapturadaTemporal);
      setFotoCapturadaTemporal(null);
      actualizarParticipante(actualizado);
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
          <div className="pi-entrega-eventos-grid">
            {eventos.map(ev => (
              <button key={ev.id} className="pi-entrega-evento-card" onClick={() => abrirEvento(ev)}>
                <img src={ev.imagen} alt={ev.nombre} width="320" height="120" loading="lazy" className="pi-entrega-evento-imagen" />
                <div className="pi-entrega-evento-info">
                  <strong>{ev.nombre}</strong>
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
              <FaSearch aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar asistente por nombre o CI"
                placeholder="Buscar por nombre o CI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="pi-sup-filtros" role="group" aria-label="Filtrar asistentes">
              <button type="button" className={filtro === 'todos' ? 'activo' : ''} aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos</button>
              <button type="button" className={filtro === 'ingresado' ? 'activo' : ''} aria-pressed={filtro === 'ingresado'} onClick={() => setFiltro('ingresado')}>Adentro</button>
              <button type="button" className={filtro === 'salio' ? 'activo' : ''} aria-pressed={filtro === 'salio'} onClick={() => setFiltro('salio')}>Afuera</button>
              <button type="button" className={filtro === 'pendiente' ? 'activo' : ''} aria-pressed={filtro === 'pendiente'} onClick={() => setFiltro('pendiente')}>Pendientes</button>
            </div>
          </div>
        </div>

        <div className="pi-sup-tabla-wrapper">
          <table className="pi-sup-tabla">
            <thead>
              <tr>
                <th scope="col">Participante</th>
                <th scope="col">Documento</th>
                <th scope="col">Entrada</th>
                <th scope="col">Ingresos</th>
                <th scope="col">Salidas</th>
                <th scope="col">Estado Actual</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(p => {
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="pi-sup-fila-persona">
                        {p.foto && <img width="40" height="40" src={p.foto} alt={p.nombre} className="pi-sup-mini-avatar" />}
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.documento || '—'}</td>
                    <td>{p.categoriaTicket?.nombre || '—'}</td>
                    <td>{p.vecesIngreso}</td>
                    <td>{p.vecesSalida}</td>
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
          <div
            ref={modalEscanerRef}
            tabIndex={-1}
            className="pi-sup-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sup-modal-escaner-titulo"
          >
            <h3 id="sup-modal-escaner-titulo" style={{ textAlign: 'center', marginBottom: '14px' }}>
              <FaQrcode aria-hidden="true" /> Escanear manilla
            </h3>
            <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE CONTROL DINÁMICO (INTERRUPTOR)
      ========================================================= */}
      {tarjetaQR && (
        <div className="pi-sup-modal-overlay" onClick={cerrarTarjeta}>
          <div
            ref={modalTarjetaRef}
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
                      <img width="110" height="110" src={fotoCapturadaTemporal} alt="Captura" className="foto-img border-cyan" />
                      <span className="foto-badge-ok"><FaCheckCircle /> Foto capturada</span>
                      <button type="button" className="btn-retake" onClick={descartarFoto} aria-label="Volver a tomar la foto"><FaSyncAlt aria-hidden="true" /></button>
                      <span className="foto-label text-cyan"><FaUserSecret/> FOTO EN PUERTA</span>
                    </div>
                  ) : fotoReferencia ? (
                    <div className="foto-capturada-container">
                      <img width="110" height="110" src={fotoReferencia} alt="Foto de referencia registrada" className="foto-img" />
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
                onCapturada={(foto) => { setFotoCapturadaTemporal(foto); setCapturandoFoto(false); }}
                onCancelar={() => setCapturandoFoto(false)}
              />
            )}

            <h2 className="pi-sup-tarjeta-nombre">{tarjetaQR.nombre}</h2>

            <div className="pi-sup-info-card">
              <div className="info-row">
                <FaCalendarAlt className="info-icon" />
                <div>
                  <span className="info-label">EVENTO</span>
                  <span className="info-valor">{eventoDetalle.nombre}</span>
                </div>
              </div>
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
                      {mov.foto
                        ? <img width="32" height="32" src={mov.foto} alt="Foto del registro" className="historial-foto-thumb" />
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

            {/* =========================================
                FOOTER: la foto solo es obligatoria en el primer ingreso de esta entrada.
                Puede alternar ingreso/salida tantas veces como haga falta (ej. alguien
                que sale y vuelve a entrar) — no hay límite de ciclos.
            ========================================= */}
            <div className="pi-sup-modal-footer">
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
                  Fuera del horario de ingreso ({MARGEN_INGRESO_ANTICIPADO_HORAS} h antes del inicio hasta el cierre). La salida sí está habilitada.
                </p>
              )}
              {requiereFoto && !fotoCapturadaTemporal && (
                <p className="pi-sup-hint-foto">Toma la foto de la puerta (arriba) para poder registrar el ingreso o salida.</p>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}