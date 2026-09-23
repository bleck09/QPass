import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import Modal from '../../components/Modal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Buscador from '../../components/Buscador.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import Insignia from '../../components/Insignia.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import Filtros from '../../components/Filtros.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import FichaParticipante from '../../components/FichaParticipante.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaHistory, FaIdCard, FaCoins, FaCheckCircle, FaWallet,
  FaExclamationTriangle, FaClipboardList, FaArrowLeft, FaCashRegister, FaCalendarAlt, FaTicketAlt, FaCalendarTimes,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { estadoEvento, filtrarEventos, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import CorteCaja from '../../components/CorteCaja.jsx';
import EscanerQr from '../../components/EscanerQr.jsx';
import AvisoSinCaja from '../../components/AvisoSinCaja.jsx';
import FotoZoom from '../../components/FotoZoom.jsx';
import ManillaFalsaModal from '../../components/ManillaFalsaModal.jsx';
import { esManillaFalsa } from '../../utils/duplicados.js';
import './Recargador.css';

const montosRapidos = [20, 50, 100, 200];

/**
 * Formulario "¿Pasó algo con esta recarga?" — el mismo después de recargar y
 * desde el Historial (antes estaba copiado dos veces).
 */
function FormIncidencia({ idBase, montoEntregado, onEnviar, onCancelar }) {
  const [montoSolicitado, setMontoSolicitado] = useState('');
  const [nota, setNota] = useState('');
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const errorNota = intento && !nota.trim() ? 'Contale a Admin qué pasó.' : null;
  const pagado = montoSolicitado === '' ? null : Number(montoSolicitado);

  const enviar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (!nota.trim()) return document.getElementById(`${idBase}-nota`)?.focus();
    setEnviando(true);
    setError('');
    try {
      await onEnviar({ montoSolicitado: pagado, nota: nota.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="formulario pi-rec-form-incidencia" onSubmit={enviar} noValidate>
      <Campo
        id={`${idBase}-pagado`} etiqueta="¿Cuánto pagó en realidad?" prefijo="pts"
        type="number" min="0" inputMode="numeric" placeholder={`Ej: ${montoEntregado}`} autoFocus
        value={montoSolicitado} onChange={(e) => setMontoSolicitado(e.target.value)}
      />
      {pagado != null && pagado !== montoEntregado && (
        pagado < montoEntregado ? (
          <AvisoFijo tono="aviso" titulo={`Se le cargaron ${montoEntregado - pagado} pts de más`}>
            Esa plata se retiene de su saldo (no la puede gastar) hasta que Admin lo resuelva.
          </AvisoFijo>
        ) : (
          <AvisoFijo tono="info" titulo={`Le faltó cargar ${pagado - montoEntregado} pts`}>
            Admin se los va a acreditar al resolver.
          </AvisoFijo>
        )
      )}
      <Campo id={`${idBase}-nota`} etiqueta="¿Qué pasó? (para Admin)" error={errorNota}>
        <textarea
          id={`${idBase}-nota`}
          rows={3}
          placeholder="Ej: pagó 100 en efectivo pero apreté 200 sin querer"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          aria-invalid={!!errorNota}
          aria-describedby={errorNota ? `${idBase}-nota-error` : undefined}
        />
      </Campo>
      {error && <AvisoFijo tono="error">{error}</AvisoFijo>}
      <div className="modal-actions">
        <Boton variante="secundario" onClick={onCancelar} disabled={enviando}>Cancelar</Boton>
        <Boton type="submit" icono={FaExclamationTriangle} cargando={enviando}>Enviar reporte</Boton>
      </div>
    </form>
  );
}

export default function Recargador() {
  useTituloPagina('Recargar saldo');
  const sesion = leerSesion();
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/incidencias')
    ? 'incidencias'
    : location.pathname.endsWith('/caja') ? 'caja'
    : location.pathname.endsWith('/historial') ? 'historial' : 'escanear';

  // Carga primaria (lista de eventos asignados) con estados cargando/error/reintentar (Manual 8.9).
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

  const [eventoDetalle, setEventoDetalle] = useState(null);

  // §5.2 — no se puede recargar sin una caja de arqueo abierta para el evento.
  const cargarCaja = useCallback(
    () => (eventoDetalle ? api.cortesCaja.actual({ eventoId: eventoDetalle.id }) : Promise.resolve(null)),
    [eventoDetalle],
  );
  const { data: cajaAbierta, recargar: recargarCaja } = useApi(cargarCaja, { inicial: null, activo: !!eventoDetalle });
  // Al volver de la pestaña "Arqueo de caja" se refresca el estado de la caja.
  useEffect(() => { if (pestana === 'escanear') recargarCaja(); }, [pestana, recargarCaja]);

  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const [monto, setMonto] = useState('');
  const [intentoMonto, setIntentoMonto] = useState(false);
  // Mientras se registra la recarga: spinner y sin segundo toque (evita recargar dos veces).
  const [recargando, setRecargando] = useState(false);
  const [errorRecarga, setErrorRecarga] = useState('');
  const [recargaExitosa, setRecargaExitosa] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [incidencias, setIncidencias] = useState([]);

  // Reporte de incidencia: después de confirmar la recarga (en la tarjeta) o
  // desde el Historial (por si se cerró la tarjeta sin reportar).
  const [mostrarFormIncidencia, setMostrarFormIncidencia] = useState(false);
  const [incidenciaReportada, setIncidenciaReportada] = useState(false);
  const [historialAReportar, setHistorialAReportar] = useState(null);
  const [historialReportados, setHistorialReportados] = useState([]);

  const recargarHistorial = (evId) => api.transacciones.listar({ eventoId: evId, tipo: 'recarga' }).then(lista =>
    setHistorial(lista.filter(t => t.operador.id === sesion.id)),
  );

  const abrirEvento = (ev) => {
    setEventoDetalle(ev);
    recargarHistorial(ev.id);
    api.incidencias.listar({ eventoId: ev.id }).then(setIncidencias);
  };

  const volverALista = () => setEventoDetalle(null);

  const irAPestana = (id) => {
    if (id === 'incidencias' && eventoDetalle) {
      // Refrescamos por si Admin resolvió alguna desde su panel.
      api.incidencias.listar({ eventoId: eventoDetalle.id }).then(setIncidencias);
    }
    navigate(id === 'escanear' ? '/recargador' : `/recargador/${id}`);
  };

  const totalHistorialHoy = useMemo(
    () => historial.reduce((suma, item) => suma + Number(item.monto), 0),
    [historial]
  );

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  const [busquedaHist, setBusquedaHist] = useState('');
  const historialFiltrado = useMemo(() => {
    const q = busquedaHist.trim().toLowerCase();
    if (!q) return historial;
    return historial.filter((item) =>
      `${item.entrada?.nombre || ''} ${ciDeEntrada(item.entrada) || ''}`.toLowerCase().includes(q),
    );
  }, [historial, busquedaHist]);

  const iniciarEscaneo = () => {
    setErrorEscaneo('');
    setEscaneando(true);
  };

  // Copia de una manilla duplicada (detalle que manda el backend).
  const [manillaFalsa, setManillaFalsa] = useState(null);

  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setBuscando(true);
    try {
      const entrada = await api.entradas.buscarPorCodigo(codigo, { contexto: 'recarga' });
      if (!entrada.usuarioId) {
        setErrorEscaneo('Este participante no tiene una cuenta con billetera — no se le puede recargar.');
        return;
      }
      setMonto('');
      setIntentoMonto(false);
      setErrorRecarga('');
      setRecargaExitosa(null);
      setTarjetaQR({ ...entrada, saldo: Number(entrada.usuario?.saldo ?? 0) });
    } catch (err) {
      if (esManillaFalsa(err)) setManillaFalsa(err.detalle);
      else setErrorEscaneo(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setMonto('');
    setRecargaExitosa(null);
    setErrorRecarga('');
    setMostrarFormIncidencia(false);
    setIncidenciaReportada(false);
  };

  // La manilla escaneada puede ser de OTRO evento: en ese caso no se puede recargar acá.
  const eventoNoCoincide = !!(tarjetaQR && eventoDetalle && tarjetaQR.eventoId && tarjetaQR.eventoId !== eventoDetalle.id);
  const errorMonto = intentoMonto && !(Number(monto) > 0) ? 'Escribí cuántos puntos vas a recargar.' : null;

  const confirmarRecarga = async (e) => {
    e?.preventDefault();
    setIntentoMonto(true);
    const valor = Number(monto);
    if (recargando || !tarjetaQR || eventoNoCoincide) return;
    if (!valor || valor <= 0) return document.getElementById('rec-monto')?.focus();

    // Mueve dinero: se confirma con monto y a quién (PLAN §2.4). Ataja el
    // error típico de "apreté 200 en vez de 20".
    const ok = await confirmar({
      titulo: `¿Recargar ${valor} pts?`,
      mensaje: `A ${tarjetaQR.nombre}. Su saldo pasa de ${tarjetaQR.saldo} a ${tarjetaQR.saldo + valor} pts. Cobrá el efectivo antes de confirmar.`,
      textoConfirmar: `Sí, recargar ${valor} pts`,
    });
    if (!ok) return;

    setRecargando(true);
    setErrorRecarga('');
    try {
      const { transaccion } = await api.transacciones.recarga({
        entradaId: tarjetaQR.id,
        eventoId: eventoDetalle.id,
        monto: valor,
        codigoQr: tarjetaQR.codigoQrVinculado?.codigo,
      });
      recargarHistorial(eventoDetalle.id);
      setRecargaExitosa({ monto: valor, saldo: Number(transaccion.saldoResultante) });
    } catch (err) {
      if (esManillaFalsa(err)) {
        cerrarTarjeta();
        setManillaFalsa(err.detalle);
      } else {
        // Antes este error se perdía: la recarga no se hacía y no se avisaba.
        setErrorRecarga(err.message);
      }
    } finally {
      setRecargando(false);
    }
  };

  // Se dispara aparte, una vez que la recarga ya quedó confirmada: el recargador
  // cuenta qué pasó, sin condiciones de montos — Admin decide qué hacer con eso.
  const reportarIncidencia = async ({ montoSolicitado, nota }) => {
    await api.incidencias.crear({
      entradaId: tarjetaQR.id,
      montoEntregado: recargaExitosa.monto,
      montoSolicitado,
      nota,
    });
    api.incidencias.listar({ eventoId: eventoDetalle.id }).then(setIncidencias);
    setIncidenciaReportada(true);
    setMostrarFormIncidencia(false);
    avisos.exito('Admin lo va a revisar y decidir qué hacer.', { titulo: 'Incidencia reportada' });
  };

  const reportarIncidenciaHistorial = async ({ montoSolicitado, nota }) => {
    await api.incidencias.crear({
      entradaId: historialAReportar.entradaId,
      montoEntregado: Number(historialAReportar.monto),
      montoSolicitado,
      nota,
    });
    api.incidencias.listar({ eventoId: eventoDetalle.id }).then(setIncidencias);
    setHistorialReportados(prev => [...prev, historialAReportar.id]);
    setHistorialAReportar(null);
    avisos.exito('Admin lo va a revisar y decidir qué hacer.', { titulo: 'Incidencia reportada' });
  };

  if (!eventoDetalle) {
    return (
      <div className="pi-rec-container">
        <EncabezadoPagina titulo="Recarga de puntos" icono={FaCoins} subtitulo="Elegí el evento en el que vas a recargar." />
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <EstadoVacio
            icono={FaCalendarTimes}
            titulo="Todavía no tenés ningún evento asignado"
            mensaje="Pedile a Admin que te asigne uno para empezar a recargar."
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
            <GrillaEventos eventos={eventosFiltrados}>
              {ev => (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  onClick={() => abrirEvento(ev)}
                  disabled={estadoEvento(ev) === 'archivado'}
                  cta="Abrir recargas"
                />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  const incidenciasPendientes = incidencias.filter(i => i.estado === 'pendiente').length;

  return (
    <div className="pi-rec-container">
      <div className="qp-nav">
        <Boton variante="fantasma" tamano="sm" icono={FaArrowLeft} onClick={volverALista}>Cambiar de evento</Boton>
      </div>

      <EncabezadoPagina titulo={eventoDetalle.nombre} icono={FaCoins} subtitulo="Recargá saldo escaneando la manilla del participante.">
        <Pestanas
          navegacion
          etiqueta="Secciones del recargador"
          activo={pestana}
          onCambio={irAPestana}
          items={[
            { id: 'escanear', etiqueta: 'Escanear QR', icono: FaQrcode },
            { id: 'historial', etiqueta: `Historial (${historial.length})`, icono: FaHistory },
            { id: 'incidencias', etiqueta: 'Incidencias', icono: FaClipboardList, contador: incidenciasPendientes || null },
            { id: 'caja', etiqueta: 'Arqueo de caja', icono: FaCashRegister },
          ]}
        />
      </EncabezadoPagina>

      {/* --- PESTAÑA: ARQUEO DE CAJA --- */}
      {pestana === 'caja' && <CorteCaja evento={eventoDetalle} modo="recarga" />}

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-rec-escanear-panel">
          {!cajaAbierta ? (
            <AvisoSinCaja
              descripcion="Necesitás un arqueo de caja abierto para este evento antes de escanear y registrar recargas."
              onAbrir={() => navigate('/recargador/caja')}
            />
          ) : (
            <>
              <FaQrcode className="pi-rec-escanear-ic" aria-hidden="true" />
              <h3>Escaneá el código QR del participante</h3>
              <p>Apuntá la cámara al código QR para cargar sus datos y registrar la recarga.</p>
              <Boton tamano="lg" pildora icono={FaQrcode} onClick={iniciarEscaneo} cargando={buscando} disabled={escaneando}>
                {buscando ? 'Buscando…' : 'Escanear código QR'}
              </Boton>
              {errorEscaneo && <AvisoFijo tono="error">{errorEscaneo}</AvisoFijo>}
            </>
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
        <div className="pi-rec-historial">
          <div className="qp-stats">
            <StatCard icon={<FaHistory />} valor={historial.length} label="Recargas realizadas" />
            <StatCard icon={<FaCoins />} tono="ok" valor={totalHistorialHoy} unidad="pts" label="Total recargado" />
            <StatCard valor={sesion.nombre} label="Recargador" />
          </div>

          <Buscador
            valor={busquedaHist}
            onCambio={setBusquedaHist}
            placeholder="Buscar por nombre o documento…"
          />

          <Tabla
            card
            columnas={['Participante', 'Documento', 'Monto', 'Saldo resultante', 'Fecha', 'Hora', { texto: 'Acciones', srOnly: true }]}
            datos={historialFiltrado}
            vacio={busquedaHist.trim()
              ? 'No hay recargas que coincidan con la búsqueda.'
              : 'Todavía no hiciste ninguna recarga en esta sesión.'}
            renderFila={item => (
              <tr key={item.id}>
                <td>
                  <div className="pi-rec-fila-persona">
                    {item.entrada?.foto && <FotoZoom width={34} height={34} src={item.entrada.foto} alt={item.entrada.nombre} className="pi-rec-mini-avatar" />}
                    <span>{item.entrada?.nombre || '—'}</span>
                  </div>
                </td>
                <td>{ciDeEntrada(item.entrada) || '—'}</td>
                <td className="pi-rec-monto-celda">+{Number(item.monto)} pts</td>
                <td>{Number(item.saldoResultante)} pts</td>
                <td>{new Date(item.createdAt).toLocaleDateString('es-BO')}</td>
                <td>{new Date(item.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  {historialReportados.includes(item.id) ? (
                    <Insignia tono="warn" icono={FaExclamationTriangle}>Reportado</Insignia>
                  ) : (
                    <Boton variante="peligro-suave" tamano="sm" icono={FaExclamationTriangle} onClick={() => setHistorialAReportar(item)}>
                      Reportar
                    </Boton>
                  )}
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* --- PESTAÑA: INCIDENCIAS --- */}
      {pestana === 'incidencias' && (
        <div className="pi-rec-historial">
          <p className="texto-ayuda">
            Reportes de recargas con algún problema (el participante pidió más de lo que se le pudo dar, etc.).
            Quedan pendientes hasta que Admin las revise y decida qué hacer.
          </p>
          <Tabla
            card
            columnas={['Participante', 'Documento', 'Se le dio', 'Dijo que quería', 'Qué pasó', 'Estado', 'Fecha']}
            datos={incidencias}
            vacio="No reportaste ninguna incidencia de recarga."
            renderFila={inc => (
              <tr key={inc.id}>
                <td>
                  <div className="pi-rec-fila-persona">
                    {inc.entrada.foto && <FotoZoom width={34} height={34} src={inc.entrada.foto} alt={inc.entrada.nombre} className="pi-rec-mini-avatar" />}
                    <span>{inc.entrada.nombre}</span>
                  </div>
                </td>
                <td>{ciDeEntrada(inc.entrada) || '—'}</td>
                <td>{Number(inc.montoEntregado)} pts</td>
                <td>{inc.montoSolicitado != null ? `${Number(inc.montoSolicitado)} pts` : '—'}</td>
                <td>{inc.nota || '—'}</td>
                <td>
                  {inc.estado === 'pendiente'
                    ? <Insignia tono="warn" icono={FaExclamationTriangle} punto latido>Pendiente</Insignia>
                    : <Insignia tono="ok" icono={FaCheckCircle}>Resuelta</Insignia>}
                </td>
                <td>{new Date(inc.createdAt).toLocaleDateString('es-BO')}</td>
              </tr>
            )}
          />
        </div>
      )}

      {/* --- TARJETA AL ESCANEAR EL QR (<Modal> global) --- */}
      {tarjetaQR && (
        <Modal
          titulo={recargaExitosa ? 'Recarga exitosa' : `Recargar a ${tarjetaQR.nombre}`}
          onCerrar={cerrarTarjeta}
          cerrarEnBackdrop={!recargando}
          className="pi-rec-modal-tarjeta"
        >
          {recargaExitosa ? (
            <div className="pi-rec-exito">
              <FaCheckCircle className="pi-rec-exito-ic" aria-hidden="true" />
              <h3>¡Recarga exitosa!</h3>
              <p>Se acreditaron <strong>{recargaExitosa.monto} pts</strong> a {tarjetaQR.nombre}.</p>
              <div className="pi-rec-exito-saldo">
                <FaWallet aria-hidden="true" /> Nuevo saldo: <strong>{recargaExitosa.saldo} pts</strong>
              </div>

              {incidenciaReportada ? (
                <AvisoFijo tono="exito" titulo="Incidencia reportada">
                  Admin va a revisar lo que pasó con {tarjetaQR.nombre} y decidir qué hacer.
                </AvisoFijo>
              ) : mostrarFormIncidencia ? (
                <>
                  <p className="texto-ayuda">Le cargaste <strong>{recargaExitosa.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                  <FormIncidencia
                    idBase="rec-inc"
                    montoEntregado={recargaExitosa.monto}
                    onEnviar={reportarIncidencia}
                    onCancelar={() => setMostrarFormIncidencia(false)}
                  />
                </>
              ) : (
                <Boton variante="fantasma" tamano="sm" icono={FaExclamationTriangle} onClick={() => setMostrarFormIncidencia(true)}>
                  ¿Pasó algo con esta recarga? Reportar
                </Boton>
              )}

              {!mostrarFormIncidencia && (
                <Boton variante="exito" tamano="lg" icono={FaCheckCircle} onClick={cerrarTarjeta}>Listo</Boton>
              )}
            </div>
          ) : (
            <>
              <FichaParticipante
                estado={eventoNoCoincide
                  ? <Insignia tono="danger" icono={FaExclamationTriangle} solida>Manilla de otro evento</Insignia>
                  : <Insignia tono="ok" icono={FaCheckCircle} solida>Código QR válido</Insignia>}
                foto={tarjetaQR.usuario?.foto || tarjetaQR.foto}
                nombre={tarjetaQR.nombre}
                datos={[
                  { icono: FaIdCard, etiqueta: 'Documento', valor: ciDeEntrada(tarjetaQR) || '—' },
                  { icono: FaCalendarAlt, etiqueta: 'Evento', valor: tarjetaQR.evento?.nombre || '—' },
                  { icono: FaTicketAlt, etiqueta: 'Tipo de entrada', valor: tarjetaQR.categoriaTicket?.nombre || '—' },
                  { icono: FaWallet, etiqueta: 'Saldo actual', valor: `${tarjetaQR.saldo} pts`, destacado: true },
                ]}
              />

              {eventoNoCoincide ? (
                <>
                  <AvisoFijo tono="error" titulo="No se puede recargar desde acá">
                    Esta manilla es del evento «{tarjetaQR.evento?.nombre}» y este puesto atiende «{eventoDetalle.nombre}».
                  </AvisoFijo>
                  <div className="modal-actions">
                    <Boton variante="secundario" onClick={cerrarTarjeta}>Cerrar</Boton>
                  </div>
                </>
              ) : (
                <form className="formulario pi-rec-form-monto" onSubmit={confirmarRecarga} noValidate>
                  <Campo
                    id="rec-monto" etiqueta={<><FaCoins aria-hidden="true" /> Monto a recargar (puntos)</>} prefijo="pts"
                    type="number" min="1" inputMode="numeric" placeholder="Ej: 100" autoFocus
                    value={monto} onChange={(e) => setMonto(e.target.value)}
                    error={errorMonto}
                    className="pi-rec-campo-monto"
                  />
                  <Filtros
                    etiqueta="Montos rápidos"
                    className="pi-rec-montos-rapidos"
                    opciones={montosRapidos.map((m) => ({ valor: String(m), texto: `${m} pts` }))}
                    activo={monto}
                    onCambio={setMonto}
                  />
                  {errorRecarga && <AvisoFijo tono="error" titulo="No se pudo recargar">{errorRecarga}</AvisoFijo>}
                  <div className="modal-actions">
                    <Boton variante="secundario" onClick={cerrarTarjeta} disabled={recargando}>Cancelar</Boton>
                    <Boton type="submit" variante="exito" tamano="lg" icono={FaCheckCircle} cargando={recargando}>
                      {recargando ? 'Recargando…' : Number(monto) > 0 ? `Recargar ${Number(monto)} pts` : 'Recargar'}
                    </Boton>
                  </div>
                </form>
              )}
            </>
          )}
        </Modal>
      )}

      {/* --- REPORTAR INCIDENCIA DESDE UNA RECARGA YA PASADA (Historial) --- */}
      {historialAReportar && (
        <Modal
          titulo={<><FaExclamationTriangle aria-hidden="true" /> Reportar incidencia</>}
          onCerrar={() => setHistorialAReportar(null)}
          className="pi-rec-modal-tarjeta"
        >
          <FichaParticipante
            foto={historialAReportar.entrada?.foto}
            nombre={historialAReportar.entrada?.nombre}
            datos={[
              { icono: FaIdCard, etiqueta: 'Documento', valor: ciDeEntrada(historialAReportar.entrada) || '—' },
              { icono: FaWallet, etiqueta: 'Se le dio', valor: `${Number(historialAReportar.monto)} pts`, destacado: true },
            ]}
          />
          <FormIncidencia
            idBase="rec-inc-hist"
            montoEntregado={Number(historialAReportar.monto)}
            onEnviar={reportarIncidenciaHistorial}
            onCancelar={() => setHistorialAReportar(null)}
          />
        </Modal>
      )}

      {manillaFalsa && (
        <ManillaFalsaModal detalle={manillaFalsa} onCerrar={() => setManillaFalsa(null)} />
      )}

      {DialogoConfirmar}
    </div>
  );
}
