import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaInbox, FaCheckCircle, FaBan, FaPen, FaMapMarkerAlt,
  FaUserTie, FaEye, FaClipboardCheck, FaExclamationTriangle,
  FaInfoCircle, FaTimesCircle, FaExternalLinkAlt, FaEnvelope, FaPhone,
} from 'react-icons/fa';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import { useDetalleUrl } from '../../utils/useDetalleUrl.js';
import { formatearFecha } from '../../utils/eventos.js';
import api from '../../api/index.js';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import Boton from '../../components/Boton.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import Migas from '../../components/Migas.jsx';
import Insignia from '../../components/Insignia.jsx';
import Modal from '../../components/Modal.jsx';
import Campo from '../../components/Campo.jsx';
import { Tablero, Panel } from '../../components/Tablero.jsx';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import {
  ESTADO_SOLICITUD, EVENTO_SOLICITUDES_CAMBIARON, haceCuanto, duracionEvento, filasCronograma,
} from '../../constants/solicitudesEvento.js';
import {
  SeguimientoSolicitud, PanelPropuesta, PanelCronograma, PanelActividades, PanelVistaPrevia,
} from '../../components/SolicitudEvento.jsx';
import './AdminSolicitudesEvento.css';

/*
  Bandeja de solicitudes de evento (las que mandan los Clientes desde "Mi
  Propuesta"). Lista con filtros por estado + vista de revisión de cada una
  (?solicitud=<id> en la URL: el botón Atrás del navegador vuelve a la lista).

  En la revisión el Admin ve TODO lo que va a pasar al evento (fechas, aforo,
  descripción, portada, mapa, actividades, cronograma y la página pública con
  sus colores) + chequeos previos, y decide: Aprobar / Pedir cambios / Rechazar.
*/

const FILTROS = ['pendiente', 'cambios_solicitados', 'aprobado', 'rechazado'];
const DIAS_AVISO = 7; // menos de esto hasta el evento -> "poco tiempo para vender"

const avisarMenu = () => window.dispatchEvent(new Event(EVENTO_SOLICITUDES_CAMBIARON));

function InsigniaEstado({ estado }) {
  const e = ESTADO_SOLICITUD[estado];
  return e ? <Insignia tono={e.tono} icono={e.icono}>{e.texto}</Insignia> : null;
}

export default function AdminSolicitudesEvento() {
  useTituloPagina('Solicitudes de eventos');
  const [idAbierta, abrir, cerrar] = useDetalleUrl('solicitud');

  const cargarLista = useCallback(() => api.solicitudesEvento.listar(), []);
  const { data: solicitudes, cargando, error, recargar } = useApi(cargarLista, { inicial: [] });

  if (idAbierta) {
    return (
      <RevisionSolicitud
        key={idAbierta}
        id={idAbierta}
        onVolver={cerrar}
        onCambio={() => { recargar(); avisarMenu(); }}
      />
    );
  }

  return (
    <ListaSolicitudes
      solicitudes={solicitudes}
      cargando={cargando}
      error={error}
      recargar={recargar}
      onAbrir={abrir}
    />
  );
}

/* ============================ LISTA ============================ */

function ListaSolicitudes({ solicitudes, cargando, error, recargar, onAbrir }) {
  const [filtro, setFiltro] = useState('pendiente');
  const [busqueda, setBusqueda] = useState('');

  const conteo = useMemo(() => {
    const c = { todos: solicitudes.length };
    FILTROS.forEach((e) => { c[e] = solicitudes.filter((s) => s.estado === e).length; });
    return c;
  }, [solicitudes]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return solicitudes
      .filter((s) => filtro === 'todos' || s.estado === filtro)
      .filter((s) => !q || [s.nombreEvento, s.lugar, s.cliente?.nombre, s.cliente?.email]
        .some((t) => t?.toLowerCase().includes(q)))
      // Pendientes: la más vieja primero (se atiende por orden de llegada).
      .sort((a, b) => (filtro === 'pendiente'
        ? new Date(a.reenviadaEn || a.createdAt) - new Date(b.reenviadaEn || b.createdAt)
        : new Date(b.updatedAt) - new Date(a.updatedAt)));
  }, [solicitudes, filtro, busqueda]);

  return (
    <div className="pi-sol-container">
      <EncabezadoPagina
        titulo="Solicitudes de eventos"
        subtitulo="Propuestas que mandan los organizadores. Revisá cada una antes de crear el evento."
        icono={FaInbox}
      />

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando ? (
        <EstadoCarga filas={5} />
      ) : (
        <>
          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            placeholder="Buscar por evento, lugar o cliente…"
            etiqueta="Buscar solicitud"
            filtros={[
              ...FILTROS.map((e) => ({ valor: e, texto: ESTADO_SOLICITUD[e].plural, conteo: conteo[e] })),
              { valor: 'todos', texto: 'Todas', conteo: conteo.todos },
            ]}
            filtroActivo={filtro}
            onFiltro={setFiltro}
            etiquetaFiltros="Filtrar solicitudes por estado"
          />

          {visibles.length === 0 ? (
            <EstadoVacio
              icono={filtro === 'pendiente' ? FaCheckCircle : FaInbox}
              titulo={busqueda
                ? 'Ninguna solicitud coincide con la búsqueda.'
                : filtro === 'pendiente' ? 'No hay solicitudes por revisar. ¡Al día!' : 'No hay solicitudes en este estado.'}
            />
          ) : (
            <Tabla
              card
              columnas={['Evento propuesto', 'Organizador', 'Fechas', 'Recibida', 'Estado', { texto: 'Acciones', srOnly: true }]}
              datos={visibles}
              renderFila={(s) => (
                <tr key={s.id} className="pi-sol-fila" onClick={() => onAbrir(s.id)}>
                  <td>
                    <strong className="pi-sol-celda-titulo">{s.nombreEvento}</strong>
                    <span className="pi-sol-celda-sub"><FaMapMarkerAlt aria-hidden="true" /> {s.lugar}</span>
                  </td>
                  <td>
                    <span className="pi-sol-celda-titulo">{s.cliente?.nombre}</span>
                    <span className="pi-sol-celda-sub">{s.cliente?.email}</span>
                  </td>
                  <td>
                    <span className="pi-sol-celda-titulo">{formatearFecha(s.fecha)}</span>
                    <span className="pi-sol-celda-sub">dura {duracionEvento(s.fecha, s.fechaFin)}</span>
                  </td>
                  <td>
                    <span className="pi-sol-celda-titulo">{haceCuanto(s.reenviadaEn || s.createdAt)}</span>
                    {s.reenviadaEn && <span className="pi-sol-celda-sub">reenviada con cambios</span>}
                  </td>
                  <td><InsigniaEstado estado={s.estado} /></td>
                  <td className="td-derecha" onClick={(e) => e.stopPropagation()}>
                    <Boton
                      variante={s.estado === 'pendiente' ? 'primario' : 'secundario'}
                      tamano="sm"
                      icono={s.estado === 'pendiente' ? FaClipboardCheck : FaEye}
                      onClick={() => onAbrir(s.id)}
                    >
                      {s.estado === 'pendiente' ? 'Revisar' : 'Ver'}
                    </Boton>
                  </td>
                </tr>
              )}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ============================ REVISIÓN ============================ */

// Chequeos previos a decidir. nivel: 'bloquea' (no se puede aprobar),
// 'aviso' (se puede, pero ojo) o 'info' (falta algo opcional).
function chequeosDe(s, rev) {
  const lista = [];
  (rev?.choques ?? []).forEach((ev) => lista.push({
    nivel: 'bloquea',
    texto: `Se cruza con el evento "${ev.nombre}" (${formatearFecha(ev.fecha, false)} – ${formatearFecha(ev.fechaFin, false)}). Solo puede haber un evento a la vez: pedí al cliente otras fechas.`,
  }));
  (rev?.solicitudesCruzadas ?? []).forEach((o) => lista.push({
    nivel: 'aviso',
    texto: `Otra solicitud abierta pide fechas que se cruzan: "${o.nombreEvento}" de ${o.cliente?.nombre ?? 'otro cliente'}. Solo una de las dos se va a poder aprobar.`,
  }));
  const dias = Math.floor((new Date(s.fecha) - Date.now()) / 86400000);
  if (dias < 0) lista.push({ nivel: 'aviso', texto: 'La fecha de inicio ya pasó: el evento se crearía como ya empezado.' });
  else if (dias < DIAS_AVISO) lista.push({ nivel: 'aviso', texto: `Empieza en ${dias === 0 ? 'menos de un día' : `${dias} días`}: queda poco tiempo para vender entradas.` });
  if (!s.aforoEstimado) lista.push({ nivel: 'info', texto: 'No indicó asistentes estimados: la jornada se crea sin aforo máximo.' });
  if (!s.imagenPortada) lista.push({ nivel: 'info', texto: 'Sin imagen de portada: la página del evento sale sin foto.' });
  if (!(s.cronograma ?? []).some((c) => c.hora && c.actividad)) lista.push({ nivel: 'info', texto: 'Sin cronograma.' });
  if (!(s.actividades ?? []).some((a) => a.titulo)) lista.push({ nivel: 'info', texto: 'Sin actividades.' });
  return lista;
}

const ICONO_CHEQUEO = { bloquea: FaTimesCircle, aviso: FaExclamationTriangle, info: FaInfoCircle };

function RevisionSolicitud({ id, onVolver, onCambio }) {
  const navigate = useNavigate();
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const cargar = useCallback(
    () => Promise.all([api.solicitudesEvento.obtener(id), api.solicitudesEvento.revision(id)])
      .then(([solicitud, revision]) => ({ solicitud, revision })),
    [id],
  );
  const { data, cargando, error, recargar } = useApi(cargar, { inicial: null });

  const [trabajando, setTrabajando] = useState(null); // 'aprobar' | 'rechazar' | 'cambios'
  const [modalCambios, setModalCambios] = useState(false);
  const [comentario, setComentario] = useState('');
  const [intentoCambios, setIntentoCambios] = useState(false);

  const cabecera = (titulo) => (
    <>
      <div className="qp-nav">
        <BotonVolver onClick={onVolver}>Volver a solicitudes</BotonVolver>
        <Migas items={[{ texto: 'Solicitudes de eventos', onClick: onVolver }, { texto: titulo, actual: true }]} />
      </div>
    </>
  );

  if (error) return <div className="pi-sol-container">{cabecera('Solicitud')}<EstadoError onReintentar={recargar} /></div>;
  if (cargando || !data) return <div className="pi-sol-container">{cabecera('Solicitud')}<EstadoCarga filas={8} /></div>;

  const { solicitud: s, revision: rev } = data;
  const chequeos = chequeosDe(s, rev);
  const bloqueada = chequeos.some((c) => c.nivel === 'bloquea');
  const cronograma = filasCronograma(s);
  const previas = rev?.cliente?.solicitudesPrevias ?? {};
  const totalPrevias = Object.values(previas).reduce((a, b) => a + b, 0);

  const tras = async (accion, fn, exito) => {
    setTrabajando(accion);
    try {
      const r = await fn();
      avisos.exito(exito);
      onCambio();
      await recargar();
      return r;
    } catch (err) {
      avisos.error(err.message, { titulo: 'No se pudo completar' });
      await recargar(); // p. ej. otro Admin la resolvió mientras tanto
      return null;
    } finally {
      setTrabajando(null);
    }
  };

  const aprobar = async () => {
    const hayAvisos = chequeos.some((c) => c.nivel === 'aviso');
    const ok = await confirmar({
      titulo: '¿Aprobar y crear el evento?',
      mensaje: `Se crea el evento "${s.nombreEvento}" con su jornada, su página pública y ${s.cliente?.nombre ?? 'el cliente'} como organizador.` +
        (hayAvisos ? ' Hay avisos en la revisión: confirmá que los viste.' : ''),
      textoConfirmar: 'Aprobar y crear',
    });
    if (!ok) return;
    const evento = await tras('aprobar', () => api.solicitudesEvento.aprobar(s.id), `El evento "${s.nombreEvento}" quedó creado.`);
    if (evento?.id) navigate(`/admin/eventos?evento=${evento.id}`);
  };

  const rechazar = async () => {
    const motivo = await confirmar({
      titulo: '¿Rechazar la solicitud?',
      mensaje: `Es definitivo: "${s.nombreEvento}" no se podrá editar ni reenviar. Si solo hay que corregir algo, usá "Pedir cambios". El cliente recibe el motivo por correo.`,
      campoNota: { etiqueta: 'Motivo del rechazo', placeholder: 'Ej. el lugar no está habilitado para eventos', requerido: true },
      textoConfirmar: 'Rechazar solicitud',
      peligroso: true,
    });
    if (motivo === null) return;
    await tras('rechazar', () => api.solicitudesEvento.rechazar(s.id, motivo), `La solicitud "${s.nombreEvento}" quedó rechazada.`);
  };

  const comentarioValido = comentario.trim().length >= 3;
  const enviarCambios = async (e) => {
    e?.preventDefault();
    setIntentoCambios(true);
    if (!comentarioValido) return document.getElementById('sol-comentario')?.focus();
    const r = await tras('cambios', () => api.solicitudesEvento.pedirCambios(s.id, comentario.trim()),
      'Le pediste cambios al cliente. Vuelve a esta bandeja cuando la reenvíe.');
    if (r) { setModalCambios(false); setComentario(''); setIntentoCambios(false); }
  };

  // Plantillas rápidas para el comentario (se pueden combinar y editar).
  const sugerencias = [
    ...(rev?.choques?.length ? ['Las fechas se cruzan con otro evento: proponé otras fechas.'] : []),
    ...(!s.imagenPortada ? ['Falta la imagen de portada.'] : []),
    ...(!cronograma.length ? ['Agregá el cronograma del evento.'] : []),
    ...(!s.aforoEstimado ? ['Indicá cuántos asistentes esperás.'] : []),
  ];

  return (
    <div className="pi-sol-container">
      {cabecera(s.nombreEvento)}
      <EncabezadoPagina
        titulo={s.nombreEvento}
        subtitulo={`Propuesta de ${s.cliente?.nombre ?? 'un cliente'} · recibida ${haceCuanto(s.createdAt)}${s.reenviadaEn ? ` · reenviada ${haceCuanto(s.reenviadaEn)}` : ''}`}
        icono={FaClipboardCheck}
        acciones={<InsigniaEstado estado={s.estado} />}
      />

      {s.estado === 'pendiente' && s.reenviadaEn && s.comentarioCambios && (
        <AvisoFijo tono="info" icono={FaPen} titulo="La reenvió después de tu pedido de cambios">
          Le habías pedido: “{s.comentarioCambios}”. Revisá que lo haya corregido.
        </AvisoFijo>
      )}

      <Tablero>
        <Panel span={12} titulo="Seguimiento" subtitulo="Lo mismo que ve el cliente en su pantalla.">
          <SeguimientoSolicitud solicitud={s} />
        </Panel>

        {/* --- LA PROPUESTA --- */}
        <PanelPropuesta solicitud={s} />

        {/* --- DECISIÓN --- */}
        <Panel span={4} icono={FaClipboardCheck} titulo={s.estado === 'pendiente' ? 'Revisión y decisión' : 'Estado'}>
          {s.estado === 'pendiente' && (
            <>
              <ul className="pi-sol-chequeos">
                {chequeos.length === 0 && (
                  <li className="pi-sol-chequeo pi-sol-chequeo--ok"><FaCheckCircle aria-hidden="true" /> Sin choques de fechas y con todos los datos. Lista para aprobar.</li>
                )}
                {chequeos.map((c, i) => {
                  const Icono = ICONO_CHEQUEO[c.nivel];
                  return <li key={i} className={`pi-sol-chequeo pi-sol-chequeo--${c.nivel}`}><Icono aria-hidden="true" /> {c.texto}</li>;
                })}
              </ul>
              <div className="pi-sol-acciones">
                <Boton
                  variante="exito" icono={FaCheckCircle} anchoCompleto
                  onClick={aprobar} cargando={trabajando === 'aprobar'} disabled={bloqueada || !!trabajando}
                >
                  Aprobar y crear evento
                </Boton>
                {bloqueada && <p className="pi-sol-nota">No se puede aprobar mientras las fechas se crucen con otro evento.</p>}
                <Boton
                  variante="secundario" icono={FaPen} anchoCompleto disabled={!!trabajando}
                  onClick={() => { setModalCambios(true); setIntentoCambios(false); }}
                >
                  Pedir cambios al cliente
                </Boton>
                <Boton variante="peligro-suave" icono={FaBan} anchoCompleto onClick={rechazar} cargando={trabajando === 'rechazar'} disabled={!!trabajando}>
                  Rechazar
                </Boton>
              </div>
            </>
          )}

          {s.estado === 'cambios_solicitados' && (
            <>
              <AvisoFijo tono="aviso" icono={FaPen} titulo={`Esperando al cliente · pedido ${haceCuanto(s.cambiosPedidosEn)}`}>
                Le pediste: “{s.comentarioCambios}”. Cuando la corrija y la reenvíe, vuelve a Pendientes.
              </AvisoFijo>
              <Boton variante="peligro-suave" icono={FaBan} anchoCompleto onClick={rechazar} cargando={trabajando === 'rechazar'}>
                Rechazar igualmente
              </Boton>
            </>
          )}

          {s.estado === 'aprobado' && (
            <>
              <AvisoFijo tono="exito" titulo="Aprobada">
                {s.resueltoPor?.nombre ? `Por ${s.resueltoPor.nombre}` : 'Aprobada'}{s.resueltoEn ? ` el ${formatearFecha(s.resueltoEn)}` : ''}.
              </AvisoFijo>
              {s.eventoId && (
                <Boton variante="secundario" icono={FaExternalLinkAlt} anchoCompleto onClick={() => navigate(`/admin/eventos?evento=${s.eventoId}`)}>
                  Ir al evento{s.evento?.nombre ? ` "${s.evento.nombre}"` : ''}
                </Boton>
              )}
            </>
          )}

          {s.estado === 'rechazado' && (
            <AvisoFijo tono="error" titulo="Rechazada">
              {s.resueltoPor?.nombre ? `Por ${s.resueltoPor.nombre}` : 'Rechazada'}{s.resueltoEn ? ` el ${formatearFecha(s.resueltoEn)}` : ''}.
              {s.motivoRechazo && <> Motivo: {s.motivoRechazo}</>}
            </AvisoFijo>
          )}
        </Panel>

        {/* --- CRONOGRAMA / ACTIVIDADES --- */}
        <PanelCronograma solicitud={s} />
        <PanelActividades solicitud={s} />

        {/* --- ORGANIZADOR --- */}
        <Panel span={4} icono={FaUserTie} titulo="Organizador">
          <div className="pi-sol-cliente">
            <strong>{s.cliente?.nombre}</strong>
            {s.cliente?.email && <a href={`mailto:${s.cliente.email}`}><FaEnvelope aria-hidden="true" /> {s.cliente.email}</a>}
            {s.cliente?.celular && <a href={`tel:${s.cliente.celular}`}><FaPhone aria-hidden="true" /> {s.cliente.celular}</a>}
          </div>
          <dl className="pi-sol-historial">
            <div><dt>Eventos que organizó</dt><dd>{rev?.cliente?.eventos ?? 0}</dd></div>
            <div><dt>Otras solicitudes</dt><dd>{totalPrevias}</dd></div>
            {totalPrevias > 0 && (
              <div className="pi-sol-historial-estados">
                {Object.entries(previas).map(([estado, n]) => (
                  <Insignia key={estado} tono={ESTADO_SOLICITUD[estado]?.tono ?? 'neutro'}>
                    {n} {(ESTADO_SOLICITUD[estado]?.texto ?? estado).toLowerCase()}
                  </Insignia>
                ))}
              </div>
            )}
          </dl>
          {totalPrevias === 0 && (rev?.cliente?.eventos ?? 0) === 0 && (
            <p className="pi-sol-nota">Es su primera solicitud.</p>
          )}
        </Panel>

        {/* --- VISTA PREVIA DE LA PÁGINA --- */}
        <PanelVistaPrevia
          solicitud={s}
          subtitulo="Con los colores, textos, portada, actividades y cronograma que mandó el cliente. Se copian tal cual al aprobar."
        />
      </Tablero>

      {modalCambios && (
        <Modal titulo="Pedir cambios al cliente" onCerrar={() => setModalCambios(false)} tamano="md">
          <form className="formulario" onSubmit={enviarCambios} noValidate>
            <p className="texto-ayuda">
              La solicitud vuelve a <strong>{s.cliente?.nombre ?? 'el cliente'}</strong> para que la corrija. Le llega
              este mensaje por correo y lo ve en su pantalla. Al reenviarla, vuelve a Pendientes.
            </p>
            {sugerencias.length > 0 && (
              <div className="pi-sol-sugerencias" aria-label="Frases sugeridas">
                {sugerencias.map((t) => (
                  <button
                    key={t} type="button" className="pi-sol-sugerencia"
                    onClick={() => setComentario((c) => (c.includes(t) ? c : `${c}${c.trim() ? ' ' : ''}${t}`))}
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
            <Campo
              id="sol-comentario"
              etiqueta="Qué tiene que cambiar"
              error={intentoCambios && !comentarioValido ? 'Contale al cliente qué tiene que cambiar (al menos 3 letras).' : null}
            >
              <textarea
                id="sol-comentario"
                rows={4}
                maxLength={500}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ej. la fecha se cruza con otro evento; proponé otra semana."
                aria-invalid={intentoCambios && !comentarioValido}
                aria-describedby={intentoCambios && !comentarioValido ? 'sol-comentario-error' : undefined}
                autoFocus
              />
            </Campo>
            <div className="modal-actions">
              <Boton variante="secundario" onClick={() => setModalCambios(false)} disabled={trabajando === 'cambios'}>Cancelar</Boton>
              <Boton type="submit" icono={FaPen} cargando={trabajando === 'cambios'}>Enviar pedido de cambios</Boton>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
