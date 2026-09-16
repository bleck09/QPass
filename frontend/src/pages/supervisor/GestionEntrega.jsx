import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useModal } from '../../utils/useModal.js';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Buscador from '../../components/Buscador.jsx';
import FiltroJornada from '../../components/FiltroJornada.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import {
  FaArrowLeft, FaLink, FaCheckCircle, FaQrcode, FaTimes,
  FaUsers, FaHourglassHalf, FaExclamationTriangle,
  FaIdCard, FaTicketAlt, FaCalendarAlt, FaHashtag, FaUserCircle,
  FaMoon, FaEnvelope
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { estadoEvento, filtrarEventos, nombreJornada, mostrarJornada, opcionesJornada, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import { MOTIVOS_CAMBIO_MANILLA, MOTIVO_OTRO } from '../../constants/manillas.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import { useApi } from '../../utils/useApi.js';
import { useDetalleUrl } from '../../utils/useDetalleUrl.js';
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

  // El evento abierto vive en la URL (?evento=<id>): el botón "Atrás" del
  // navegador vuelve al selector en vez de salir de la página.
  const [eventoIdDetalle, abrirEventoUrl, cerrarEventoUrl] = useDetalleUrl('evento');
  const [participantes, setParticipantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEntrega, setFiltroEntrega] = useState('todos');
  const [filtroJornada, setFiltroJornada] = useState('todas');
  // Buscador de la pantalla de selección de evento (antes de entrar a uno)
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');

  const [participanteVinculando, setParticipanteVinculando] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [codigoValidado, setCodigoValidado] = useState(null);
  // Motivo del cambio de manilla: se guarda como motivoAnulacion de la que se
  // reemplaza, para poder auditar despues cuantas se perdieron o fallaron.
  const [motivoCambio, setMotivoCambio] = useState('');
  const [detalleMotivo, setDetalleMotivo] = useState('');
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

  // Carga participantes según el evento de la URL: abrir desde el selector,
  // refrescar la página y el botón Atrás/Adelante del navegador.
  useEffect(() => {
    if (!eventoIdDetalle) return;
    refrescarEvento(eventoIdDetalle);
  }, [eventoIdDetalle]);

  const abrirEvento = (ev) => {
    abrirEventoUrl(ev.id);
    setBusqueda('');
    setFiltroEntrega('todos');
  };

  const volverALista = () => cerrarEventoUrl();

  const participantesFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase();
    return participantes.filter(p => {
      const coincideBusqueda = p.nombre.toLowerCase().includes(termino);
      const coincideFiltro =
        filtroEntrega === 'todos' ||
        (filtroEntrega === 'entregado' && p.codigoQrVinculado) ||
        (filtroEntrega === 'pendiente' && !p.codigoQrVinculado);
      const coincideJornada =
        filtroJornada === 'todas' || (p.diaEventoId ?? null) === filtroJornada;
      return coincideBusqueda && coincideFiltro && coincideJornada;
    });
  }, [participantes, busqueda, filtroEntrega, filtroJornada]);

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  const stats = useMemo(() => {
    const total = participantes.length;
    const entregados = participantes.filter(p => p.codigoQrVinculado).length;
    const faltan = total - entregados;
    return { total, entregados, faltan };
  }, [participantes]);

  // Evento de varias jornadas: se muestra la columna + el filtro de Jornada para
  // distinguir entradas de la misma persona en noches distintas.
  const filtrosJornada = useMemo(() => opcionesJornada(participantes), [participantes]);
  const multiJornada = filtrosJornada.length > 0;
  const columnasTabla = useMemo(() => [
    'Participante',
    ...(multiJornada ? ['Jornada'] : []),
    'Tipo de Entrada',
    'Documento',
    'Vínculo QR',
    { texto: 'Acciones', srOnly: true },
  ], [multiJornada]);

  const esReemplazo = !!participanteVinculando?.codigoQrVinculado;
  const motivoListo = motivoCambio !== ''
    && (motivoCambio !== MOTIVO_OTRO || detalleMotivo.trim() !== '');

  const abrirVincular = (participante) => {
    setParticipanteVinculando(participante);
    setCodigoValidado(null);
    setErrorCodigo('');
    setEscaneando(false);
    setMotivoCambio('');
    setDetalleMotivo('');
  };

  const cerrarVincular = () => {
    setParticipanteVinculando(null);
    setCodigoValidado(null);
    setErrorCodigo('');
    setEscaneando(false);
    setMotivoCambio('');
    setDetalleMotivo('');
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
    if (esReemplazo && !motivoListo) return;
    // El motivo viaja SOLO en un reemplazo: en la primera entrega no hay
    // manilla anterior que anular, asi que no hay nada que justificar.
    const motivo = esReemplazo
      ? (motivoCambio === MOTIVO_OTRO ? detalleMotivo.trim() : motivoCambio)
      : undefined;
    await api.entradas.vincularQr(participanteVinculando.id, codigoValidado.id, motivo);
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

  // Foco + ESC + scroll-lock del resultado de verificación (look propio).
  const refVerif = useModal(!!entradaVerificada, cerrarVerificacion);

  // Contenido del modal de detalle del participante: todos sus datos + el flujo
  // de escaneo/vínculo de la manilla en la misma ventana.
  const renderPanelVinculo = (p) => (
    <div className="pi-entrega-panel">
      <div className="pi-entrega-panel-persona">
        {(p.foto || p.usuario?.foto)
          ? <img width="52" height="52" src={p.foto || p.usuario.foto} alt={p.nombre} className="pi-entrega-preview-avatar" />
          : <div className="pi-entrega-preview-avatar pi-entrega-preview-avatar-ph"><FaUserCircle size={32} /></div>}
        <div>
          <span className="pi-entrega-preview-nombre">{p.nombre}</span>
          <span className="pi-entrega-preview-sub">{p.correo}</span>
        </div>
      </div>

      <div className="pi-entrega-panel-cols">
        <div className="pi-entrega-preview-datos">
          {mostrarJornada(p.diaEvento) && (
            <div className="pi-entrega-preview-fila">
              <span><FaMoon /> Jornada</span>
              <strong>{nombreJornada(p.diaEvento)}</strong>
            </div>
          )}
          <div className="pi-entrega-preview-fila">
            <span><FaTicketAlt /> Tipo de entrada</span>
            <strong>{p.categoriaTicket?.nombre || '—'}</strong>
          </div>
          <div className="pi-entrega-preview-fila">
            <span><FaHashtag /> N.º de entrada</span>
            <strong>{p.numero != null ? `#${p.numero}` : '—'}</strong>
          </div>
          <div className="pi-entrega-preview-fila">
            <span><FaIdCard /> Documento</span>
            <strong>{ciDeEntrada(p) || '—'}</strong>
          </div>
          <div className="pi-entrega-preview-fila">
            <span><FaEnvelope /> Correo</span>
            <strong>{p.correo}</strong>
          </div>
          <div className="pi-entrega-preview-fila">
            <span><FaCalendarAlt /> Evento</span>
            <strong>{eventoDetalle.nombre}</strong>
          </div>
          <div className="pi-entrega-preview-fila">
            <span><FaUsers /> Estado de ingreso</span>
            <strong>
              {p.estadoIngreso === 'ingresado' ? 'Adentro'
                : p.estadoIngreso === 'salio' ? 'Salió'
                : 'Sin ingresar'}
            </strong>
          </div>
          <div className="pi-entrega-preview-fila">
            <span><FaQrcode /> Manilla actual</span>
            <strong>{p.codigoQrVinculado?.codigo || 'Sin vincular'}</strong>
          </div>
        </div>

        <div className="pi-entrega-panel-scan">
          {escaneando ? (
            <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
          ) : validando ? (
            <div className="pi-entrega-camara-simulada">
              <FaQrcode size={48} />
              <span>Verificando código…</span>
            </div>
          ) : codigoValidado ? (
            <div className="pi-entrega-codigo-ok">
              <FaCheckCircle color="var(--verde-recarga-texto)" size={26} />
              <div>
                <span className="pi-entrega-codigo-ok-label">Manilla lista para vincular</span>
                <strong>{codigoValidado.codigo}</strong>
                {p.codigoQrVinculado && (
                  <span className="pi-entrega-preview-reemplazo">
                    <FaExclamationTriangle /> Reemplaza a {p.codigoQrVinculado.codigo}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="pi-entrega-camara-simulada">
              <FaQrcode size={48} />
              <span>Escaneá el QR de la manilla a entregar</span>
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
              <FaQrcode /> {errorCodigo ? 'Escanear otro código' : 'Escanear código QR'}
            </button>
          )}

          {/* El motivo solo se pide cuando hay una manilla anterior que anular.
              En la primera entrega no hay nada que justificar. */}
          {esReemplazo && codigoValidado && (
            <div className="pi-entrega-motivo formulario">
              <div className="input-group">
                <label htmlFor="motivo-cambio">¿Por qué se cambia la manilla?</label>
                <select
                  id="motivo-cambio"
                  value={motivoCambio}
                  onChange={(e) => setMotivoCambio(e.target.value)}
                >
                  <option value="">Elegí un motivo…</option>
                  {MOTIVOS_CAMBIO_MANILLA.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {motivoCambio === MOTIVO_OTRO && (
                <div className="input-group">
                  <label htmlFor="motivo-detalle">Contanos qué pasó</label>
                  <input
                    id="motivo-detalle"
                    type="text"
                    value={detalleMotivo}
                    onChange={(e) => setDetalleMotivo(e.target.value)}
                    placeholder="Ej.: se le soltó el broche"
                    maxLength={120}
                  />
                </div>
              )}
            </div>
          )}

          <div className="pi-entrega-modal-acciones">
            <button className="pi-entrega-btn-cancelar" onClick={cerrarVincular}>Cancelar</button>
            <button
              className="pi-entrega-btn-confirmar"
              onClick={confirmarVinculo}
              disabled={!codigoValidado || (esReemplazo && !motivoListo)}
            >
              <FaLink /> {p.codigoQrVinculado ? 'Reemplazar manilla' : 'Vincular manilla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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

          {eventoDetalle.tipoManilla === 'digital' && (
            <p className="pi-entrega-aviso pi-entrega-aviso-info">
              <FaQrcode /> Este evento es de <strong>manilla digital</strong>: el código QR de cada
              asistente se asigna solo al aprobarse su compra — no hace falta imprimir ni entregar
              nada acá. Igual podés vincular o reemplazar una manilla a mano si hace falta.
            </p>
          )}

          {errorVerificacion && (
            <p className="pi-entrega-aviso pi-entrega-aviso-error">
              <FaExclamationTriangle /> {errorVerificacion}
            </p>
          )}

          <div className="pi-entrega-stats-grid">
            <StatCard icon={<FaUsers />} tono="total" valor={stats.total} label="Total Participantes" />
            <StatCard icon={<FaCheckCircle />} tono="ok" valor={stats.entregados} label="Ya se Entregó" />
            <StatCard icon={<FaHourglassHalf />} tono="warn" valor={stats.faltan} label="Falta Entregar" />
          </div>

          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            placeholder="Buscar participante por nombre…"
            filtros={[
              { valor: 'todos', texto: 'Todos' },
              { valor: 'entregado', texto: 'Con manilla' },
              { valor: 'pendiente', texto: 'Sin manilla' },
            ]}
            filtroActivo={filtroEntrega}
            onFiltro={setFiltroEntrega}
            etiquetaFiltros="Filtrar participantes por entrega"
          />

          {multiJornada && (
            <div className="pi-entrega-filtro-jornada">
              <span className="pi-entrega-filtro-jornada-label">Jornada:</span>
              <FiltroJornada
                opciones={filtrosJornada}
                activo={filtroJornada}
                onCambio={setFiltroJornada}
                etiqueta="Filtrar participantes por jornada"
              />
            </div>
          )}

          <Tabla
            card
            columnas={columnasTabla}
            datos={participantesFiltrados}
            vacio="No se encontraron participantes."
            renderFila={p => (
              <tr key={p.id}>
                <td>
                  <div className="pi-entrega-fila-persona">
                    {p.foto
                      ? <img width="32" height="32" src={p.foto} alt={p.nombre} className="pi-entrega-mini-avatar" />
                      : <div className="pi-entrega-mini-avatar pi-entrega-mini-avatar--ph"><FaUserCircle size={20} /></div>}
                    <div className="pi-entrega-fila-persona-txt">
                      <span className="pi-entrega-fila-nombre">{p.nombre}</span>
                      <span className="pi-entrega-fila-correo"><FaEnvelope aria-hidden="true" /> {p.correo}</span>
                    </div>
                  </div>
                </td>
                {multiJornada && (
                  <td>
                    {mostrarJornada(p.diaEvento)
                      ? <span className="pi-entrega-badge-jornada"><FaMoon aria-hidden="true" /> {nombreJornada(p.diaEvento)}</span>
                      : '—'}
                  </td>
                )}
                <td>{p.categoriaTicket?.nombre || '—'}</td>
                <td>{ciDeEntrada(p) || <span className="pi-entrega-dato-falta">Sin documento</span>}</td>
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
            )}
          />
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
                  cta="Gestionar entrega"
                />
              )}
            </GrillaEventos>
          </>
          )}
        </>
      )}

      {/* MODAL: DETALLE DEL PARTICIPANTE + VINCULAR MANILLA */}
      {participanteVinculando && (
        <Modal
          titulo={<><FaLink color="var(--indigo-profundo)" /> {participanteVinculando.codigoQrVinculado ? 'Cambiar manilla' : 'Vincular manilla'}</>}
          onCerrar={cerrarVincular}
          tamano="lg"
        >
          {renderPanelVinculo(participanteVinculando)}
        </Modal>
      )}

      {/* MODAL: ESCÁNER DE VERIFICACIÓN (cámara real) */}
      {verificando && (
        <Modal
          titulo={<><FaQrcode aria-hidden="true" /> Escanear manilla</>}
          onCerrar={() => setVerificando(false)}
          tamano="sm"
        >
          <EscanerQr onDetectado={handleManillaVerificada} onCancelar={() => setVerificando(false)} />
        </Modal>
      )}

      {/* MODAL: RESULTADO DE LA VERIFICACIÓN (solo lectura) */}
      {entradaVerificada && (() => {
        const esDeEsteEvento = entradaVerificada.eventoId === eventoIdDetalle;
        return (
          <div className="pi-sup-modal-overlay" onClick={cerrarVerificacion}>
            <div
              ref={refVerif}
              tabIndex={-1}
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
                {mostrarJornada(entradaVerificada.diaEvento) && (
                  <div className="info-row">
                    <FaMoon className="info-icon" />
                    <div>
                      <span className="info-label">Jornada</span>
                      <span className="info-valor">{nombreJornada(entradaVerificada.diaEvento)}</span>
                    </div>
                  </div>
                )}
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
                    <span className="info-valor">{ciDeEntrada(entradaVerificada) || '—'}</span>
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
