import { useCallback, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import {
  FaMapMarkerAlt, FaSearch, FaArrowLeft, FaLink, FaCheckCircle, FaQrcode, FaTimes,
  FaUsers, FaHourglassHalf, FaExclamationTriangle,
  FaIdCard, FaTicketAlt, FaCalendarAlt, FaHashtag, FaUserCircle
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha, estadoEvento } from '../../utils/eventos.js';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import EscanerQr from '../../components/EscanerQr.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import './GestionEntrega.css';
import './Supervisor.css';

export default function GestionEntrega() {
  useTituloPagina('Entrega de manillas');
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
  const [busqueda, setBusqueda] = useState('');

  const [participanteVinculando, setParticipanteVinculando] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [codigoValidado, setCodigoValidado] = useState(null);
  const [errorCodigo, setErrorCodigo] = useState('');
  const [validando, setValidando] = useState(false);

  // Verificación de manilla ya vinculada: escaneo de SOLO LECTURA. No cambia nada,
  // solo resuelve la entrada dueña de la manilla y la muestra para confirmar a
  // simple vista que el vínculo quedó bien (persona, evento, tipo, N.º, documento).
  const [verificando, setVerificando] = useState(false);
  const [entradaVerificada, setEntradaVerificada] = useState(null);
  const [errorVerificacion, setErrorVerificacion] = useState('');
  const [buscandoVerificacion, setBuscandoVerificacion] = useState(false);

  const eventoDetalle = eventos.find(ev => ev.id === eventoIdDetalle) || null;

  // Solo aparecen aquí las compras ya aprobadas por Admin (el backend ya filtra las
  // pendientes/rechazadas): no tiene sentido entregarle manilla a alguien sin entrada confirmada.
  const refrescarEvento = (eventoId) => {
    api.entradas.listar({ eventoId }).then(setParticipantes);
  };

  const abrirEvento = (ev) => {
    setEventoIdDetalle(ev.id);
    refrescarEvento(ev.id);
    setBusqueda('');
  };

  const volverALista = () => {
    setEventoIdDetalle(null);
    setParticipantes([]);
  };

  const participantesFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase();
    return participantes.filter(p => p.nombre.toLowerCase().includes(termino));
  }, [participantes, busqueda]);

  const stats = useMemo(() => {
    const total = participantes.length;
    const entregados = participantes.filter(p => p.codigoQrVinculado).length;
    const faltan = total - entregados;
    return { total, entregados, faltan };
  }, [participantes]);

  const abrirVincular = (participante) => {
    setParticipanteVinculando(participante);
    setCodigoValidado(null);
    setErrorCodigo('');
    setEscaneando(false);
  };

  const cerrarVincular = () => {
    setParticipanteVinculando(null);
    setCodigoValidado(null);
    setErrorCodigo('');
    setEscaneando(false);
  };

  // Al detectar un código con la cámara, primero se le pregunta a la base si existe, si es de
  // este evento y si ya está tomado — recién si pasa todo eso se ofrece confirmar el vínculo.
  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setValidando(true);
    setErrorCodigo('');
    try {
      const codigoQr = await api.codigosQr.buscarPorCodigo(codigo);
      if (codigoQr.eventoId !== eventoIdDetalle) {
        setErrorCodigo('Este código no pertenece a este evento.');
      } else if (codigoQr.anulado) {
        setErrorCodigo('Este código fue anulado y ya no se puede usar.');
      } else if (codigoQr.entradaId) {
        setErrorCodigo('Este código ya está vinculado a otra persona.');
      } else {
        setCodigoValidado(codigoQr);
      }
    } catch (err) {
      setErrorCodigo(err.message);
    } finally {
      setValidando(false);
    }
  };

  const confirmarVinculo = async () => {
    if (!codigoValidado || !participanteVinculando) return;
    await api.entradas.vincularQr(participanteVinculando.id, codigoValidado.id);
    refrescarEvento(eventoIdDetalle);
    cerrarVincular();
  };

  const handleManillaVerificada = async (codigo) => {
    setVerificando(false);
    setBuscandoVerificacion(true);
    setErrorVerificacion('');
    try {
      const entrada = await api.entradas.buscarPorCodigo(codigo);
      setEntradaVerificada(entrada);
    } catch (err) {
      setErrorVerificacion(err.message);
    } finally {
      setBuscandoVerificacion(false);
    }
  };

  const cerrarVerificacion = () => {
    setEntradaVerificada(null);
    setErrorVerificacion('');
    setVerificando(false);
  };

  return (
    <div className="pi-entrega-container">

      {eventoDetalle ? (
        <>
          <button className="pi-entrega-btn-volver" onClick={volverALista}>
            <FaArrowLeft /> Volver a Gestión de Entrega
          </button>

          <div className="pi-entrega-header-fila">
            <div className="pi-entrega-header">
              <h1>{eventoDetalle.nombre}</h1>
              <p>Busca a un participante y vincula su código QR de entrega.</p>
            </div>
            <button
              type="button"
              className="pi-entrega-btn-verificar"
              onClick={() => { setErrorVerificacion(''); setVerificando(true); }}
              disabled={buscandoVerificacion}
            >
              <FaQrcode /> {buscandoVerificacion ? 'Buscando...' : 'Verificar manilla'}
            </button>
          </div>

          {errorVerificacion && (
            <p className="pi-entrega-aviso pi-entrega-aviso-error">
              <FaExclamationTriangle /> {errorVerificacion}
            </p>
          )}

          <div className="pi-entrega-stats-grid">
            <div className="pi-entrega-stat-card">
              <div className="pi-entrega-stat-icon pi-entrega-icon-total"><FaUsers /></div>
              <div className="pi-entrega-stat-info">
                <span className="numero">{stats.total}</span>
                <span className="label">Total Participantes</span>
              </div>
            </div>
            <div className="pi-entrega-stat-card">
              <div className="pi-entrega-stat-icon pi-entrega-icon-ok"><FaCheckCircle /></div>
              <div className="pi-entrega-stat-info">
                <span className="numero">{stats.entregados}</span>
                <span className="label">Ya se Entregó</span>
              </div>
            </div>
            <div className="pi-entrega-stat-card">
              <div className="pi-entrega-stat-icon pi-entrega-icon-pend"><FaHourglassHalf /></div>
              <div className="pi-entrega-stat-info">
                <span className="numero">{stats.faltan}</span>
                <span className="label">Falta Entregar</span>
              </div>
            </div>
          </div>

          <div className="pi-entrega-buscador">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar participante por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="pi-entrega-tabla-wrapper">
            <table className="pi-entrega-tabla">
              <thead>
                <tr>
                  <th scope="col">Participante</th>
                  <th scope="col">Tipo de Entrada</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Vínculo QR</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {participantesFiltrados.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="pi-entrega-fila-persona">
                        {p.foto && <img width="32" height="32" src={p.foto} alt={p.nombre} className="pi-entrega-mini-avatar" />}
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.categoriaTicket?.nombre || '—'}</td>
                    <td>{p.correo}</td>
                    <td>
                      {p.codigoQrVinculado
                        ? <span className="pi-entrega-badge pi-entrega-badge-ok"><FaCheckCircle /> {p.codigoQrVinculado.codigo}</span>
                        : <span className="pi-entrega-badge pi-entrega-badge-pend">Sin vincular</span>}
                    </td>
                    <td>
                      <button className="pi-entrega-btn-vincular" onClick={() => abrirVincular(p)}>
                        <FaLink /> {p.codigoQrVinculado ? 'Cambiar' : 'Vincular'}
                      </button>
                    </td>
                  </tr>
                ))}
                {participantesFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="pi-entrega-sin-resultados">No se encontraron participantes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="pi-entrega-header">
            <h1>Gestión de entrega</h1>
            <p>Selecciona un evento para buscar participantes y vincular sus códigos QR.</p>
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
        </>
      )}

      {/* MODAL: VINCULAR CÓDIGO QR */}
      {participanteVinculando && (
        <div className="pi-entrega-modal-overlay" onClick={cerrarVincular}>
          <div className="pi-entrega-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pi-entrega-modal-header">
              <h3><FaQrcode color="var(--indigo-profundo)" /> Vincular QR: {participanteVinculando.nombre}</h3>
              <button className="pi-entrega-btn-cerrar-modal" onClick={cerrarVincular}>
                <FaTimes />
              </button>
            </div>

            <div className="pi-entrega-modal-body">
              {escaneando ? (
                <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
              ) : validando ? (
                <div className="pi-entrega-camara-simulada">
                  <FaQrcode size={56} />
                  <span>Verificando código...</span>
                </div>
              ) : codigoValidado ? (
                <div className="pi-entrega-preview">
                  <div className="pi-entrega-preview-persona">
                    {(participanteVinculando.foto || participanteVinculando.usuario?.foto) ? (
                      <img
                        width="48" height="48"
                        src={participanteVinculando.foto || participanteVinculando.usuario.foto}
                        alt={participanteVinculando.nombre}
                        className="pi-entrega-preview-avatar"
                      />
                    ) : (
                      <div className="pi-entrega-preview-avatar pi-entrega-preview-avatar-ph">
                        <FaUserCircle size={30} />
                      </div>
                    )}
                    <div>
                      <span className="pi-entrega-preview-nombre">{participanteVinculando.nombre}</span>
                      <span className="pi-entrega-preview-sub">
                        {participanteVinculando.categoriaTicket?.nombre || 'Sin categoría'}
                        {participanteVinculando.numero ? ` · N.º ${participanteVinculando.numero}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="pi-entrega-preview-datos">
                    <div className="pi-entrega-preview-fila">
                      <span><FaIdCard /> Documento</span>
                      <strong>{participanteVinculando.documento || '—'}</strong>
                    </div>
                    <div className="pi-entrega-preview-fila">
                      <span><FaCalendarAlt /> Evento</span>
                      <strong>{eventoDetalle.nombre}</strong>
                    </div>
                    <div className="pi-entrega-preview-fila">
                      <span><FaQrcode /> Manilla a vincular</span>
                      <strong>{codigoValidado.codigo}</strong>
                    </div>
                    {participanteVinculando.codigoQrVinculado && (
                      <div className="pi-entrega-preview-fila pi-entrega-preview-reemplazo">
                        <span><FaExclamationTriangle /> Reemplaza a</span>
                        <strong>{participanteVinculando.codigoQrVinculado.codigo}</strong>
                      </div>
                    )}
                  </div>

                  <div className="pi-entrega-codigo-detectado">
                    <FaCheckCircle color="var(--verde-recarga-texto)" />
                    <span>Listo para vincular</span>
                  </div>
                </div>
              ) : (
                <div className="pi-entrega-camara-simulada">
                  <FaQrcode size={56} />
                  <span>Apunta la cámara al código QR de la manilla</span>
                </div>
              )}

              {errorCodigo && (
                <p className="pi-entrega-aviso pi-entrega-aviso-error">
                  <FaExclamationTriangle /> {errorCodigo}
                </p>
              )}

              {!escaneando && !codigoValidado && (
                <button
                  className="pi-entrega-btn-escanear"
                  onClick={() => { setErrorCodigo(''); setEscaneando(true); }}
                  disabled={validando}
                >
                  <FaQrcode /> {errorCodigo ? 'Escanear otro código' : 'Escanear Código QR'}
                </button>
              )}

              <div className="pi-entrega-modal-acciones">
                <button className="pi-entrega-btn-cancelar" onClick={cerrarVincular}>Cancelar</button>
                <button className="pi-entrega-btn-confirmar" onClick={confirmarVinculo} disabled={!codigoValidado}>
                  <FaLink /> Vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESCÁNER DE VERIFICACIÓN (cámara real) */}
      {verificando && (
        <div className="pi-sup-modal-overlay" onClick={() => setVerificando(false)}>
          <div
            className="pi-sup-modal-tarjeta"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '24px' }}
            role="dialog"
            aria-modal="true"
            aria-label="Escanear manilla para verificar"
          >
            <h3 style={{ textAlign: 'center', marginBottom: '14px' }}>
              <FaQrcode aria-hidden="true" /> Escanear manilla
            </h3>
            <EscanerQr onDetectado={handleManillaVerificada} onCancelar={() => setVerificando(false)} />
          </div>
        </div>
      )}

      {/* MODAL: RESULTADO DE LA VERIFICACIÓN (solo lectura) */}
      {entradaVerificada && (() => {
        const esDeEsteEvento = entradaVerificada.eventoId === eventoIdDetalle;
        return (
          <div className="pi-sup-modal-overlay" onClick={cerrarVerificacion}>
            <div
              className="pi-sup-modal-tarjeta"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Verificación de ${entradaVerificada.nombre}`}
            >
              <button type="button" className="pi-sup-btn-cerrar" onClick={cerrarVerificacion} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>

              <div
                className="pi-sup-tarjeta-estado"
                style={esDeEsteEvento ? undefined : { backgroundColor: 'var(--ambar-aviso-suave)' }}
              >
                <div
                  className="estado-badge"
                  style={esDeEsteEvento ? undefined : { color: 'var(--ambar-aviso-texto)' }}
                >
                  {esDeEsteEvento
                    ? <><FaCheckCircle /> Vínculo verificado</>
                    : <><FaExclamationTriangle /> Manilla de otro evento</>}
                </div>
              </div>

              <div className="pi-sup-fotos-comparacion">
                <div className="foto-box">
                  {entradaVerificada.usuario?.foto ? (
                    <img width="110" height="110" src={entradaVerificada.usuario.foto} alt="Foto de perfil" className="foto-img" />
                  ) : (
                    <div className="foto-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaUserCircle size={48} color="var(--texto-secundario)" />
                    </div>
                  )}
                  <span className="foto-label text-gray">Foto de perfil</span>
                </div>
                <div className="foto-box">
                  {entradaVerificada.foto ? (
                    <img width="110" height="110" src={entradaVerificada.foto} alt="Foto registrada en puerta" className="foto-img border-cyan" />
                  ) : (
                    <div className="foto-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaUserCircle size={48} color="var(--texto-secundario)" />
                    </div>
                  )}
                  <span className="foto-label text-cyan">Foto en puerta</span>
                </div>
              </div>

              <h2 className="pi-sup-tarjeta-nombre">{entradaVerificada.nombre}</h2>

              <div className="pi-sup-info-card">
                <div className="info-row">
                  <FaCalendarAlt className="info-icon" />
                  <div>
                    <span className="info-label">Evento</span>
                    <span className="info-valor">{entradaVerificada.evento?.nombre || eventoDetalle.nombre}</span>
                  </div>
                </div>
                <div className="info-row">
                  <FaHashtag className="info-icon" />
                  <div>
                    <span className="info-label">N.º de entrada</span>
                    <span className="info-valor">{entradaVerificada.numero ? `#${entradaVerificada.numero}` : '—'}</span>
                  </div>
                </div>
                <div className="info-row">
                  <FaIdCard className="info-icon" />
                  <div>
                    <span className="info-label">Documento</span>
                    <span className="info-valor">{entradaVerificada.documento || '—'}</span>
                  </div>
                </div>
                <div className="info-row">
                  <FaTicketAlt className="info-icon" />
                  <div>
                    <span className="info-label">Tipo de entrada</span>
                    <span className="info-valor">{entradaVerificada.categoriaTicket?.nombre || '—'}</span>
                  </div>
                </div>
                <div className="info-row">
                  <FaQrcode className="info-icon" />
                  <div>
                    <span className="info-label">Manilla vinculada</span>
                    <span className="info-valor">{entradaVerificada.codigoQrVinculado?.codigo || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="pi-sup-modal-footer" style={{ alignItems: 'center' }}>
                <button type="button" className="pi-entrega-btn-cancelar" onClick={cerrarVerificacion}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
