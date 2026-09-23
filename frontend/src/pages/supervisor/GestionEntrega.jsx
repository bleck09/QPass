import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Buscador from '../../components/Buscador.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import FiltroJornada from '../../components/FiltroJornada.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import HistorialManillas from '../../components/HistorialManillas.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import Insignia from '../../components/Insignia.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import FichaParticipante from '../../components/FichaParticipante.jsx';
import FotoZoom from '../../components/FotoZoom.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import {
  FaArrowLeft, FaLink, FaCheckCircle, FaQrcode,
  FaUsers, FaHourglassHalf, FaExclamationTriangle,
  FaIdCard, FaTicketAlt, FaCalendarAlt, FaHashtag, FaUserCircle,
  FaMoon, FaEnvelope, FaHistory, FaCalendarTimes, FaSearch,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { estadoEvento, filtrarEventos, nombreJornada, mostrarJornada, opcionesJornada, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import { MOTIVOS_CAMBIO_MANILLA, MOTIVO_OTRO } from '../../constants/manillas.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import { useApi } from '../../utils/useApi.js';
import { useDetalleUrl } from '../../utils/useDetalleUrl.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import ManillaFalsaModal from '../../components/ManillaFalsaModal.jsx';
import { esManillaFalsa } from '../../utils/duplicados.js';
import './GestionEntrega.css';
import './Supervisor.css';

const ESTADO_INGRESO = {
  ingresado: { tono: 'ok', texto: 'Adentro' },
  salio: { tono: 'neutro', texto: 'Salió' },
};

export default function GestionEntrega() {
  useTituloPagina('Entrega de manillas');
  const sesion = leerSesion();
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();

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
  // Guardando el vínculo: spinner y sin segundo toque.
  const [vinculando, setVinculando] = useState(false);
  const [intentoMotivo, setIntentoMotivo] = useState(false);

  // Verificación de manilla ya vinculada: escaneo de SOLO LECTURA. No cambia nada,
  // solo resuelve la entrada dueña de la manilla y la muestra para confirmar a
  // simple vista que el vínculo quedó bien (persona, evento, tipo, N.º, documento).
  const [verificando, setVerificando] = useState(false);
  const [entradaVerificada, setEntradaVerificada] = useState(null);
  // Copia de una manilla duplicada (detalle que manda el backend).
  const [manillaFalsa, setManillaFalsa] = useState(null);
  // Dos vistas en la misma pantalla: la lista de entrega y el historial. Con
  // muchos invitados, apilarlas obligaba a scrollear toda la tabla para llegar.
  const [vista, setVista] = useState('participantes');
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
    'Tipo de entrada',
    'Documento',
    'Vínculo QR',
    { texto: 'Acciones', srOnly: true },
  ], [multiJornada]);

  const esReemplazo = !!participanteVinculando?.codigoQrVinculado;
  const motivoListo = motivoCambio !== ''
    && (motivoCambio !== MOTIVO_OTRO || detalleMotivo.trim() !== '');

  const limpiarVinculo = () => {
    setCodigoValidado(null);
    setErrorCodigo('');
    setEscaneando(false);
    setMotivoCambio('');
    setDetalleMotivo('');
    setIntentoMotivo(false);
  };

  const abrirVincular = (participante) => {
    setParticipanteVinculando(participante);
    limpiarVinculo();
  };

  const cerrarVincular = () => {
    setParticipanteVinculando(null);
    limpiarVinculo();
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

  const errorMotivo = intentoMotivo && esReemplazo && !motivoListo
    ? (motivoCambio === MOTIVO_OTRO ? 'Contá qué pasó con la manilla anterior.' : 'Elegí por qué se cambia la manilla.')
    : null;

  const confirmarVinculo = async () => {
    if (vinculando || !codigoValidado || !participanteVinculando) return;
    setIntentoMotivo(true);
    if (esReemplazo && !motivoListo) {
      return document.getElementById(motivoCambio === MOTIVO_OTRO ? 'motivo-detalle' : 'motivo-cambio')?.focus();
    }

    // Reemplazar ANULA la manilla anterior: se confirma (PLAN §2.4).
    if (esReemplazo) {
      const ok = await confirmar({
        titulo: '¿Reemplazar la manilla?',
        mensaje: `La manilla ${participanteVinculando.codigoQrVinculado.codigo} de ${participanteVinculando.nombre} queda ANULADA y deja de funcionar. Desde ahora su entrada funciona con la nueva (${codigoValidado.codigo}).`,
        textoConfirmar: 'Sí, reemplazar',
        peligroso: true,
      });
      if (!ok) return;
    }

    // El motivo viaja SOLO en un reemplazo: en la primera entrega no hay
    // manilla anterior que anular, asi que no hay nada que justificar.
    const motivo = esReemplazo
      ? (motivoCambio === MOTIVO_OTRO ? detalleMotivo.trim() : motivoCambio)
      : undefined;
    setVinculando(true);
    setErrorCodigo('');
    try {
      await api.entradas.vincularQr(participanteVinculando.id, codigoValidado.id, motivo);
      refrescarEvento(eventoIdDetalle);
      avisos.exito(
        `${participanteVinculando.nombre} ya tiene la manilla ${codigoValidado.codigo}.`,
        { titulo: esReemplazo ? 'Manilla reemplazada' : 'Manilla entregada' },
      );
      cerrarVincular();
    } catch (err) {
      // Antes este error no se atrapaba: el modal quedaba igual y nadie se enteraba.
      setErrorCodigo(err.message);
    } finally {
      setVinculando(false);
    }
  };

  const handleManillaVerificada = async (codigo) => {
    setVerificando(false);
    setBuscandoVerificacion(true);
    setErrorVerificacion('');
    try {
      const entrada = await api.entradas.buscarPorCodigo(codigo, { contexto: 'entrega' });
      setEntradaVerificada(entrada);
    } catch (err) {
      if (esManillaFalsa(err)) setManillaFalsa(err.detalle);
      else setErrorVerificacion(err.message);
    } finally {
      setBuscandoVerificacion(false);
    }
  };

  const cerrarVerificacion = () => {
    setEntradaVerificada(null);
    setErrorVerificacion('');
    setVerificando(false);
  };

  // Contenido del modal de detalle del participante: todos sus datos + el flujo
  // de escaneo/vínculo de la manilla en la misma ventana.
  const renderPanelVinculo = (p) => (
    <div className="pi-entrega-panel-cols">
      <FichaParticipante
        foto={p.foto || p.usuario?.foto}
        nombre={p.nombre}
        datos={[
          mostrarJornada(p.diaEvento) && { icono: FaMoon, etiqueta: 'Jornada', valor: nombreJornada(p.diaEvento) },
          { icono: FaTicketAlt, etiqueta: 'Tipo de entrada', valor: p.categoriaTicket?.nombre || '—' },
          { icono: FaHashtag, etiqueta: 'N.º de entrada', valor: p.numero != null ? `#${p.numero}` : '—' },
          { icono: FaIdCard, etiqueta: 'Documento', valor: ciDeEntrada(p) || '—' },
          { icono: FaEnvelope, etiqueta: 'Correo', valor: p.correo },
          { icono: FaCalendarAlt, etiqueta: 'Evento', valor: eventoDetalle.nombre },
          { icono: FaUsers, etiqueta: 'Estado de ingreso', valor: ESTADO_INGRESO[p.estadoIngreso]?.texto || 'Sin ingresar' },
          { icono: FaQrcode, etiqueta: 'Manilla actual', valor: p.codigoQrVinculado?.codigo || 'Sin vincular', destacado: true },
        ]}
      />

      <div className="pi-entrega-panel-scan">
        {escaneando ? (
          <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
        ) : validando ? (
          <EstadoCarga filas={2} etiqueta="Verificando código…" />
        ) : codigoValidado ? (
          <AvisoFijo tono="exito" titulo="Manilla lista para vincular">
            <strong>{codigoValidado.codigo}</strong>
            {p.codigoQrVinculado && <> · reemplaza a {p.codigoQrVinculado.codigo}</>}
          </AvisoFijo>
        ) : (
          <EstadoVacio compacto icono={FaQrcode} titulo="Escaneá el QR de la manilla a entregar" />
        )}

        {errorCodigo && <AvisoFijo tono="error">{errorCodigo}</AvisoFijo>}

        {!escaneando && !codigoValidado && (
          <Boton
            icono={FaQrcode}
            onClick={() => { setErrorCodigo(''); setEscaneando(true); }}
            disabled={validando}
          >
            {errorCodigo ? 'Escanear otro código' : 'Escanear código QR'}
          </Boton>
        )}

        {/* El motivo solo se pide cuando hay una manilla anterior que anular.
            En la primera entrega no hay nada que justificar. */}
        {esReemplazo && codigoValidado && (
          <div className="formulario">
            <Campo id="motivo-cambio" etiqueta="¿Por qué se cambia la manilla?" error={motivoCambio !== MOTIVO_OTRO ? errorMotivo : null}>
              <select
                id="motivo-cambio"
                value={motivoCambio}
                onChange={(e) => setMotivoCambio(e.target.value)}
                aria-invalid={!!(motivoCambio !== MOTIVO_OTRO && errorMotivo)}
              >
                <option value="">Elegí un motivo…</option>
                {MOTIVOS_CAMBIO_MANILLA.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Campo>

            {motivoCambio === MOTIVO_OTRO && (
              <Campo
                id="motivo-detalle" etiqueta="Contanos qué pasó" placeholder="Ej.: se le soltó el broche" maxLength={120}
                value={detalleMotivo} onChange={(e) => setDetalleMotivo(e.target.value)}
                error={errorMotivo}
              />
            )}
          </div>
        )}

        <div className="modal-actions">
          <Boton variante="secundario" onClick={cerrarVincular} disabled={vinculando}>Cancelar</Boton>
          <Boton
            variante={p.codigoQrVinculado ? 'peligro' : 'primario'}
            icono={FaLink}
            onClick={confirmarVinculo}
            cargando={vinculando}
            disabled={!codigoValidado}
          >
            {p.codigoQrVinculado ? 'Reemplazar manilla' : 'Vincular manilla'}
          </Boton>
        </div>
      </div>
    </div>
  );

  const esDeEsteEvento = entradaVerificada?.eventoId === eventoIdDetalle;

  return (
    <div className="pi-entrega-container">

      {eventoDetalle ? (
        <>
          <div className="qp-nav">
            <Boton variante="fantasma" tamano="sm" icono={FaArrowLeft} onClick={volverALista}>Volver a Gestión de entrega</Boton>
          </div>

          <EncabezadoPagina
            titulo={eventoDetalle.nombre}
            subtitulo="Buscá a un participante y vinculá su código QR de entrega."
            icono={FaLink}
            acciones={(
              <Boton
                variante="secundario"
                icono={FaQrcode}
                onClick={() => { setErrorVerificacion(''); setVerificando(true); }}
                cargando={buscandoVerificacion}
              >
                {buscandoVerificacion ? 'Buscando…' : 'Verificar manilla'}
              </Boton>
            )}
          />

          {eventoDetalle.tipoManilla === 'digital' && (
            <AvisoFijo tono="info" icono={FaQrcode} titulo="Evento de manilla digital">
              El código QR de cada asistente se asigna solo al aprobarse su compra — no hace falta imprimir ni
              entregar nada acá. Igual podés vincular o reemplazar una manilla a mano si hace falta.
            </AvisoFijo>
          )}

          {errorVerificacion && <AvisoFijo tono="error">{errorVerificacion}</AvisoFijo>}

          <div className="qp-stats">
            <StatCard icon={<FaUsers />} tono="total" valor={stats.total} label="Total de participantes" />
            <StatCard icon={<FaCheckCircle />} tono="ok" valor={stats.entregados} label="Ya se entregó" />
            <StatCard icon={<FaHourglassHalf />} tono="warn" valor={stats.faltan} label="Falta entregar" />
          </div>

          <Pestanas
            className="pi-entrega-vistas"
            etiqueta="Ver participantes o historial de manillas"
            activo={vista}
            onCambio={setVista}
            items={[
              { id: 'participantes', etiqueta: `Participantes (${stats.total})`, icono: FaUsers },
              { id: 'historial', etiqueta: 'Historial de manillas', icono: FaHistory },
            ]}
          />

          {vista === 'participantes' && (<>
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
                  <div className="item-info">
                    {p.foto
                      ? <img width="40" height="40" src={p.foto} alt="" className="item-img item-img--avatar" />
                      : <div className="item-no-img item-img--avatar"><FaUserCircle aria-hidden="true" /></div>}
                    <div>
                      <div className="fila-nombre">{p.nombre}</div>
                      <div className="celda-secundaria"><FaEnvelope aria-hidden="true" /> {p.correo}</div>
                    </div>
                  </div>
                </td>
                {multiJornada && (
                  <td>
                    {mostrarJornada(p.diaEvento)
                      ? <Insignia tono="info" icono={FaMoon}>{nombreJornada(p.diaEvento)}</Insignia>
                      : '—'}
                  </td>
                )}
                <td>{p.categoriaTicket?.nombre || '—'}</td>
                <td>{ciDeEntrada(p) || <Insignia tono="warn">Sin documento</Insignia>}</td>
                <td>
                  {p.codigoQrVinculado
                    ? <Insignia tono="ok" icono={FaCheckCircle}>{p.codigoQrVinculado.codigo}</Insignia>
                    : <Insignia tono="warn" punto>Sin vincular</Insignia>}
                </td>
                <td>
                  <Boton variante={p.codigoQrVinculado ? 'secundario' : 'primario'} tamano="sm" icono={FaLink} onClick={() => abrirVincular(p)}>
                    {p.codigoQrVinculado ? 'Cambiar' : 'Vincular'}
                  </Boton>
                </td>
              </tr>
            )}
          />
          </>)}

          {vista === 'historial' && (
            <HistorialManillas eventoId={eventoIdDetalle} titulo={null} />
          )}
        </>
      ) : (
        <>
          <EncabezadoPagina
            titulo="Gestión de entrega"
            subtitulo="Seleccioná un evento para buscar participantes y vincular sus códigos QR."
            icono={FaLink}
          />

          {errorEventos ? (
            <EstadoError onReintentar={recargarEventos} />
          ) : cargandoEventos ? (
            <EstadoCarga filas={3} />
          ) : eventos.length === 0 ? (
            <EstadoVacio
              icono={FaCalendarTimes}
              titulo="Todavía no tenés ningún evento asignado"
              mensaje="Pedile a Admin que te asigne uno para empezar a entregar manillas."
            />
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
            <GrillaEventos
              eventos={eventosFiltrados}
              vacio={<EstadoVacio compacto icono={FaSearch} titulo="Ningún evento coincide con la búsqueda" />}
            >
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
          titulo={<><FaLink aria-hidden="true" /> {participanteVinculando.codigoQrVinculado ? 'Cambiar manilla' : 'Vincular manilla'}</>}
          onCerrar={cerrarVincular}
          cerrarEnBackdrop={!vinculando}
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

      {/* MODAL: RESULTADO DE LA VERIFICACIÓN (solo lectura, <Modal> global) */}
      {entradaVerificada && (
        <Modal titulo="Verificación de manilla" onCerrar={cerrarVerificacion} className="pi-sup-modal-tarjeta">
          <div className="pi-entrega-verif-fotos">
            {[
              { src: entradaVerificada.usuario?.foto, etiqueta: 'Foto de perfil' },
              { src: entradaVerificada.foto, etiqueta: 'Foto en puerta' },
            ].map(({ src, etiqueta }) => (
              <figure key={etiqueta} className="pi-entrega-verif-foto">
                {src
                  ? <FotoZoom width={110} height={110} src={src} alt={etiqueta} />
                  : <span className="pi-entrega-verif-sinfoto"><FaUserCircle aria-hidden="true" /></span>}
                <figcaption>{etiqueta}</figcaption>
              </figure>
            ))}
          </div>

          <FichaParticipante
            estado={esDeEsteEvento
              ? <Insignia tono="ok" icono={FaCheckCircle} solida>Vínculo verificado</Insignia>
              : <Insignia tono="warn" icono={FaExclamationTriangle} solida>Manilla de otro evento</Insignia>}
            nombre={entradaVerificada.nombre}
            datos={[
              { icono: FaCalendarAlt, etiqueta: 'Evento', valor: entradaVerificada.evento?.nombre || eventoDetalle?.nombre },
              mostrarJornada(entradaVerificada.diaEvento) && { icono: FaMoon, etiqueta: 'Jornada', valor: nombreJornada(entradaVerificada.diaEvento) },
              { icono: FaHashtag, etiqueta: 'N.º de entrada', valor: entradaVerificada.numero ? `#${entradaVerificada.numero}` : '—' },
              { icono: FaIdCard, etiqueta: 'Documento', valor: ciDeEntrada(entradaVerificada) || '—' },
              { icono: FaTicketAlt, etiqueta: 'Tipo de entrada', valor: entradaVerificada.categoriaTicket?.nombre || '—' },
              { icono: FaQrcode, etiqueta: 'Manilla vinculada', valor: entradaVerificada.codigoQrVinculado?.codigo || '—', destacado: true },
            ]}
          />

          <div className="modal-actions">
            <Boton variante="secundario" onClick={cerrarVerificacion}>Cerrar</Boton>
          </div>
        </Modal>
      )}

      {manillaFalsa && (
        <ManillaFalsaModal detalle={manillaFalsa} onCerrar={() => setManillaFalsa(null)} />
      )}

      {DialogoConfirmar}
    </div>
  );
}
