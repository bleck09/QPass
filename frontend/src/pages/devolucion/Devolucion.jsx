import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
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
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle,
  FaMoneyBillWave, FaUser, FaBuilding, FaHistory, FaCamera, FaRedo, FaArrowLeft,
  FaCashRegister, FaCalendarAlt, FaTicketAlt, FaCalendarTimes,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { subirFotoCapturada } from '../../utils/imagenes.js';
import { estadoEvento, filtrarEventos, FILTROS_ESTADO_EVENTO, ciDeEntrada } from '../../utils/eventos.js';
import CorteCaja from '../../components/CorteCaja.jsx';
import EscanerQr from '../../components/EscanerQr.jsx';
import AvisoSinCaja from '../../components/AvisoSinCaja.jsx';
import CapturarFoto from '../../components/CapturarFoto.jsx';
import FotoZoom from '../../components/FotoZoom.jsx';
import ManillaFalsaModal from '../../components/ManillaFalsaModal.jsx';
import { esManillaFalsa } from '../../utils/duplicados.js';
import './Devolucion.css';

// §5.11 — motivos tipados del retiro (deben coincidir con el enum del backend).
const MOTIVOS_DEVOLUCION = [
  ['retiro_efectivo', 'Retiro en efectivo'],
  ['saldo_no_usado', 'Saldo no usado'],
  ['error_recarga', 'Error de recarga'],
  ['otro', 'Otro (detallar)'],
];

/**
 * Foto obligatoria del retiro (carnet o cara): tomarla con la cámara, verla y
 * poder repetirla. Antes estaba copiado dos veces y los errores de subida se
 * perdían detrás del modal.
 */
function FotoRequerida({ id, titulo, icono: Icono, valor, onCambio, faltante, alt }) {
  const avisos = useAvisos();
  const [capturando, setCapturando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const alCapturar = async (foto) => {
    setCapturando(false);
    setSubiendo(true);
    try {
      onCambio(await subirFotoCapturada(foto, 'carnets'));
    } catch (err) {
      avisos.error(err.message, { titulo: 'No se pudo guardar la foto' });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className={`pi-dev-form-carnet${faltante ? ' falta' : ''}`} id={id}>
      <p className="pi-dev-form-carnet-titulo"><Icono aria-hidden="true" /> {titulo}</p>
      {capturando ? (
        <CapturarFoto onCapturada={alCapturar} onCancelar={() => setCapturando(false)} />
      ) : valor ? (
        <div className="pi-dev-carnet-preview">
          <FotoZoom width={200} height={150} src={valor} alt={alt} />
          <Boton variante="secundario" tamano="sm" icono={FaRedo} onClick={() => setCapturando(true)}>Tomar otra</Boton>
        </div>
      ) : (
        <Boton variante="secundario" icono={FaCamera} onClick={() => setCapturando(true)} cargando={subiendo}>
          {subiendo ? 'Guardando foto…' : `Tomar ${titulo.toLowerCase()}`}
        </Boton>
      )}
      {faltante && !valor && !capturando && (
        <p className="input-group__error"><FaExclamationTriangle aria-hidden="true" /> Es obligatoria para hacer el retiro.</p>
      )}
    </div>
  );
}

export default function Devolucion() {
  useTituloPagina('Devoluciones');
  const sesion = leerSesion();
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/caja')
    ? 'caja'
    : location.pathname.endsWith('/historial') ? 'historial' : 'escanear';

  // Carga primaria: eventos asignados.
  const cargarInicial = useCallback(
    () => api.eventos.misAsignados(sesion.id, sesion.rol),
    [sesion.id, sesion.rol],
  );
  const {
    data: eventos,
    cargando: cargandoInicial,
    error: errorInicial,
    recargar: recargarInicial,
  } = useApi(cargarInicial, { inicial: [] });

  const [eventoDetalle, setEventoDetalle] = useState(null);
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const [monto, setMonto] = useState('');
  const [motivoDevol, setMotivoDevol] = useState('retiro_efectivo');
  const [notaDevol, setNotaDevol] = useState('');
  const [fotoCarnet, setFotoCarnet] = useState(null);
  // Foto de la cara de quien cobra — obligatoria en el retiro de un negocio.
  const [fotoRostro, setFotoRostro] = useState(null);
  const [retiroExitoso, setRetiroExitoso] = useState(null);
  const [retiros, setRetiros] = useState([]);
  // Sale efectivo: mientras se registra, spinner y sin segundo toque.
  const [retirando, setRetirando] = useState(false);
  // Tras el primer intento se muestra qué falta (antes el botón quedaba gris sin explicar).
  const [intento, setIntento] = useState(false);

  // §5.2 — no se pueden registrar devoluciones sin una caja de arqueo abierta.
  const cargarCaja = useCallback(
    () => (eventoDetalle ? api.cortesCaja.actual({ eventoId: eventoDetalle.id }) : Promise.resolve(null)),
    [eventoDetalle],
  );
  const { data: cajaAbierta, recargar: recargarCaja } = useApi(cargarCaja, { inicial: null, activo: !!eventoDetalle });
  useEffect(() => { if (pestana === 'escanear') recargarCaja(); }, [pestana, recargarCaja]);

  const recargarRetiros = (evId) => api.transacciones.listar({ eventoId: evId, tipo: 'devolucion' }).then(lista =>
    setRetiros(lista.filter(t => t.operador.id === sesion.id)),
  );

  const abrirEvento = (ev) => {
    setEventoDetalle(ev);
    recargarRetiros(ev.id);
  };

  const volverALista = () => setEventoDetalle(null);

  const totalRetiradoHoy = useMemo(
    () => retiros.reduce((suma, item) => suma + Number(item.monto), 0),
    [retiros]
  );

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  const [busquedaHist, setBusquedaHist] = useState('');
  const retirosFiltrados = useMemo(() => {
    const q = busquedaHist.trim().toLowerCase();
    if (!q) return retiros;
    return retiros.filter((item) =>
      `${item.entrada?.nombre || ''} ${ciDeEntrada(item.entrada) || ''}`.toLowerCase().includes(q),
    );
  }, [retiros, busquedaHist]);

  const excedeSaldo = tarjetaQR && Number(monto) > tarjetaQR.saldoDisponible;
  // §5.2 — además del saldo cashless del asistente, el efectivo FÍSICO de la
  // caja abierta también es finito: no se puede devolver más de lo que queda
  // ahí (montoInicial menos lo ya devuelto con esa caja). El backend vuelve a
  // validar esto igual (por si la caja se movió en otra pestaña/dispositivo).
  const efectivoEnCaja = cajaAbierta ? Number(cajaAbierta.montoEsperadoParcial) : null;
  const excedeCaja = efectivoEnCaja != null && Number(monto) > efectivoEnCaja;
  const [errorRetiro, setErrorRetiro] = useState('');

  const iniciarEscaneo = () => {
    setErrorEscaneo('');
    setEscaneando(true);
  };

  // Copia de una manilla duplicada (detalle que manda el backend).
  const [manillaFalsa, setManillaFalsa] = useState(null);

  // Un mismo escaneo sirve para la manilla de un asistente o el código de retiro
  // de un negocio: se prueba primero como entrada, y si no, como código de negocio.
  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setBuscando(true);
    setErrorEscaneo('');
    const limpiarForm = () => {
      setMonto('');
      setFotoCarnet(null);
      setFotoRostro(null);
      setRetiroExitoso(null);
      setErrorRetiro('');
      setIntento(false);
    };
    try {
      let entrada = null;
      try {
        entrada = await api.entradas.buscarPorCodigo(codigo, { contexto: 'devolucion' });
      } catch (err) {
        // Copia de una manilla duplicada: no se prueba como código de negocio.
        if (esManillaFalsa(err)) {
          setManillaFalsa(err.detalle);
          return;
        }
        entrada = null; // no es una manilla
      }
      if (entrada) {
        if (!entrada.usuarioId) {
          setErrorEscaneo('Este participante no tiene una cuenta con billetera — no se le puede hacer un retiro.');
          return;
        }
        limpiarForm();
        setTarjetaQR({
          ...entrada,
          tipo: 'Normal',
          eventoId: entrada.eventoId || entrada.evento?.id,
          eventoNombre: entrada.evento?.nombre,
          saldoDisponible: Number(entrada.usuario?.saldo ?? 0),
        });
        return;
      }
      // ¿Código de retiro de negocio?
      const neg = await api.codigosRetiroNegocio.buscar(codigo);
      limpiarForm();
      setTarjetaQR({
        tipo: 'Negocio',
        usuarioId: neg.negocioId,
        nombre: neg.negocioNombre,
        eventoId: neg.eventoId,
        eventoNombre: neg.eventoNombre,
        saldoDisponible: neg.saldo,
      });
    } catch {
      setErrorEscaneo('Código no reconocido: no es una manilla ni un código de retiro de negocio.');
    } finally {
      setBuscando(false);
    }
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setMonto('');
    setMotivoDevol('retiro_efectivo');
    setNotaDevol('');
    setFotoCarnet(null);
    setFotoRostro(null);
    setRetiroExitoso(null);
    setErrorRetiro('');
    setIntento(false);
  };

  const esNegocio = tarjetaQR?.tipo === 'Negocio';
  // La manilla / código puede ser de OTRO evento: no se puede operar acá.
  const eventoNoCoincide = !!(tarjetaQR && eventoDetalle && tarjetaQR.eventoId && tarjetaQR.eventoId !== eventoDetalle.id);

  const errorMonto = !intento && !monto ? null
    : !(Number(monto) > 0) ? (intento ? 'Escribí cuántos puntos se retiran.' : null)
      : excedeSaldo ? `El máximo disponible es ${tarjetaQR.saldoDisponible} pts.`
        : excedeCaja ? `Tu caja solo tiene Bs. ${efectivoEnCaja.toFixed(2)}. Cerrala y abrí una nueva con más fondo.`
          : null;
  const faltaCarnet = intento && !fotoCarnet;
  const faltaRostro = intento && esNegocio && !fotoRostro;

  const confirmarRetiro = async (e) => {
    e?.preventDefault();
    setErrorRetiro('');
    setIntento(true);
    const valor = Number(monto);
    if (retirando || !tarjetaQR || eventoNoCoincide) return;
    if (!valor || valor <= 0 || valor > tarjetaQR.saldoDisponible || excedeCaja) return document.getElementById('dev-monto')?.focus();
    if (!fotoCarnet) return document.getElementById('dev-foto-carnet')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (esNegocio && !fotoRostro) return document.getElementById('dev-foto-rostro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Sale dinero: se confirma con monto y a quién (PLAN §2.4).
    const ok = await confirmar({
      titulo: `¿Entregar ${valor} pts en efectivo?`,
      mensaje: `A ${tarjetaQR.nombre}. Se descuentan de su saldo (le quedan ${tarjetaQR.saldoDisponible - valor} pts) y salen de tu caja.`,
      textoConfirmar: `Sí, retirar ${valor} pts`,
    });
    if (!ok) return;

    setRetirando(true);
    try {
      await api.transacciones.devolucion({
        usuarioId: tarjetaQR.usuarioId,
        entradaId: tarjetaQR.tipo === 'Normal' ? tarjetaQR.id : undefined,
        codigoQr: tarjetaQR.tipo === 'Normal' ? tarjetaQR.codigoQrVinculado?.codigo : undefined,
        monto: valor,
        fotoCarnetUrl: fotoCarnet,
        fotoRostroUrl: fotoRostro || undefined,
        eventoId: eventoDetalle.id,
        motivoDevolucion: motivoDevol,
        nota: motivoDevol === 'otro' && notaDevol.trim() ? notaDevol.trim() : undefined,
      });
      recargarRetiros(eventoDetalle.id);
      recargarCaja();
      setRetiroExitoso({ monto: valor, saldo: tarjetaQR.saldoDisponible - valor });
    } catch (err) {
      if (esManillaFalsa(err)) {
        cerrarTarjeta();
        setManillaFalsa(err.detalle);
        return;
      }
      // Ej.: la caja se quedó sin efectivo justo ahora (otra devolución recién
      // hecha en paralelo) o el plazo de retiro venció — el backend vuelve a
      // validar todo esto igual, así que este error puede ser la primera
      // noticia real del problema.
      setErrorRetiro(err.message);
      recargarCaja();
    } finally {
      setRetirando(false);
    }
  };

  if (!eventoDetalle) {
    return (
      <div className="pi-dev-container">
        <EncabezadoPagina titulo="Gestión de devoluciones" icono={FaMoneyBillWave} subtitulo="Elegí el evento en el que vas a hacer retiros." />
        {errorInicial ? (
          <EstadoError onReintentar={recargarInicial} />
        ) : cargandoInicial ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <EstadoVacio
            icono={FaCalendarTimes}
            titulo="Todavía no tenés ningún evento asignado"
            mensaje="Pedile a Admin que te asigne uno para empezar a hacer retiros."
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
                  cta="Abrir devoluciones"
                />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pi-dev-container">
      <div className="qp-nav">
        <Boton variante="fantasma" tamano="sm" icono={FaArrowLeft} onClick={volverALista}>Cambiar de evento</Boton>
      </div>

      <EncabezadoPagina titulo={eventoDetalle.nombre} icono={FaMoneyBillWave} subtitulo="Devolvé saldo en efectivo escaneando la manilla o el código del negocio.">
        <Pestanas
          navegacion
          etiqueta="Secciones de devoluciones"
          activo={pestana}
          onCambio={(id) => navigate(id === 'escanear' ? '/devolucion' : `/devolucion/${id}`)}
          items={[
            { id: 'escanear', etiqueta: 'Escanear QR', icono: FaQrcode },
            { id: 'historial', etiqueta: `Historial (${retiros.length})`, icono: FaHistory },
            { id: 'caja', etiqueta: 'Arqueo de caja', icono: FaCashRegister },
          ]}
        />
      </EncabezadoPagina>

      {/* --- PESTAÑA: ARQUEO DE CAJA --- */}
      {pestana === 'caja' && <CorteCaja evento={eventoDetalle} modo="devolucion" />}

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-dev-escanear-panel">
          {!cajaAbierta ? (
            <AvisoSinCaja
              descripcion="Necesitás un arqueo de caja abierto para este evento antes de escanear y registrar devoluciones."
              onAbrir={() => navigate('/devolucion/caja')}
            />
          ) : (
            <>
              <FaQrcode className="pi-dev-escanear-ic" aria-hidden="true" />
              <h3>Escaneá el código QR</h3>
              <p>
                Sirve para la <strong>manilla de un asistente</strong> o para el
                <strong> código de retiro de un negocio</strong> (el que ve en su dashboard).
              </p>
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
        <div className="pi-dev-historial">
          <div className="qp-stats">
            <StatCard icon={<FaHistory />} valor={retiros.length} label="Retiros realizados" />
            <StatCard icon={<FaMoneyBillWave />} tono="warn" valor={totalRetiradoHoy} unidad="pts" label="Total devuelto" />
          </div>

          <Buscador
            valor={busquedaHist}
            onCambio={setBusquedaHist}
            placeholder="Buscar por nombre o documento…"
          />

          <Tabla
            card
            columnas={['Beneficiario', 'Documento', 'Tipo', 'Carnet', 'Monto', 'Saldo resultante', 'Fecha', 'Hora']}
            datos={retirosFiltrados}
            vacio={busquedaHist.trim()
              ? 'No hay devoluciones que coincidan con la búsqueda.'
              : 'Todavía no procesaste ninguna devolución para este evento.'}
            renderFila={item => (
              <tr key={item.id}>
                <td>
                  <div className="pi-dev-fila-persona">
                    {item.entrada?.foto && <FotoZoom width={34} height={34} src={item.entrada.foto} alt={item.entrada.nombre} className="pi-dev-mini-avatar" />}
                    <span>{item.entrada?.nombre || '—'}</span>
                  </div>
                </td>
                <td>{ciDeEntrada(item.entrada) || '—'}</td>
                <td><Insignia tono="info" icono={FaUser}>Normal</Insignia></td>
                <td>
                  {item.fotoCarnetUrl
                    ? <FotoZoom width={40} height={40} src={item.fotoCarnetUrl} alt={`Carnet de ${item.entrada?.nombre}`} className="pi-dev-mini-carnet" />
                    : <span className="celda-secundaria">—</span>}
                </td>
                <td className="pi-dev-monto-celda">-{Number(item.monto)} pts</td>
                <td>{Number(item.saldoResultante)} pts</td>
                <td>{new Date(item.createdAt).toLocaleDateString('es-BO')}</td>
                <td>{new Date(item.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            )}
          />
        </div>
      )}

      {/* --- TARJETA DE RETIRO AL ESCANEAR (<Modal> global) --- */}
      {tarjetaQR && (
        <Modal
          titulo={retiroExitoso ? 'Retiro realizado' : `Retiro de saldo: ${tarjetaQR.nombre}`}
          onCerrar={cerrarTarjeta}
          cerrarEnBackdrop={!retirando}
          tamano={retiroExitoso || eventoNoCoincide ? 'md' : 'lg'}
          className="pi-dev-modal-tarjeta"
        >
          {retiroExitoso ? (
            <div className="pi-dev-exito">
              <FaCheckCircle className="pi-dev-exito-ic" aria-hidden="true" />
              <h3>¡Retiro realizado!</h3>
              <p>Se descontaron <strong>{retiroExitoso.monto} pts</strong> a {tarjetaQR.nombre}.</p>
              <div className="pi-dev-exito-saldo">
                <FaWallet aria-hidden="true" /> Saldo restante: <strong>{retiroExitoso.saldo} pts</strong>
              </div>
              <Boton variante="exito" tamano="lg" icono={FaCheckCircle} onClick={cerrarTarjeta}>Listo</Boton>
            </div>
          ) : (
            <form className="pi-dev-tarjeta-cols" onSubmit={confirmarRetiro} noValidate>
              <div className="pi-dev-col-id">
                <FichaParticipante
                  estado={eventoNoCoincide
                    ? <Insignia tono="danger" icono={FaExclamationTriangle} solida>De otro evento</Insignia>
                    : <Insignia tono="ok" icono={FaCheckCircle} solida>{esNegocio ? 'Código de negocio válido' : 'Código QR válido'}</Insignia>}
                  foto={!esNegocio ? (tarjetaQR.usuario?.foto || tarjetaQR.foto) : null}
                  nombre={tarjetaQR.nombre}
                  datos={[
                    { icono: esNegocio ? FaBuilding : FaUser, etiqueta: 'Tipo', valor: `Usuario ${tarjetaQR.tipo}` },
                    !esNegocio && { icono: FaIdCard, etiqueta: 'Documento', valor: ciDeEntrada(tarjetaQR) || '—' },
                    { icono: FaCalendarAlt, etiqueta: 'Evento', valor: tarjetaQR.eventoNombre || eventoDetalle.nombre },
                    !esNegocio && { icono: FaTicketAlt, etiqueta: 'Tipo de entrada', valor: tarjetaQR.categoriaTicket?.nombre },
                    { icono: FaWallet, etiqueta: esNegocio ? 'Disponible para retirar' : 'Saldo disponible', valor: `${tarjetaQR.saldoDisponible} pts`, destacado: true },
                  ]}
                />
                {esNegocio && !eventoNoCoincide && (
                  <AvisoFijo tono="aviso" titulo="Retiro de un negocio">
                    Se exige foto del carnet <strong>y</strong> foto de la cara de quien cobra.
                  </AvisoFijo>
                )}
              </div>

              <div className="pi-dev-col-form">
                {eventoNoCoincide ? (
                  <AvisoFijo tono="error" titulo="No se puede hacer la devolución desde acá">
                    {esNegocio ? 'Este código' : 'Esta manilla'} es del evento «{tarjetaQR.eventoNombre}» y este
                    puesto atiende «{eventoDetalle.nombre}».
                  </AvisoFijo>
                ) : (
                  <>
                    <Campo
                      id="dev-monto" etiqueta={<><FaMoneyBillWave aria-hidden="true" /> Monto a retirar (puntos)</>} prefijo="pts"
                      type="number" min="1" inputMode="numeric" placeholder="Ej: 50" autoFocus
                      value={monto} onChange={(e) => setMonto(e.target.value)}
                      error={errorMonto}
                      className="pi-dev-campo-monto"
                    />
                    <Filtros
                      etiqueta="Montos rápidos"
                      opciones={[
                        { valor: String(Math.round(tarjetaQR.saldoDisponible / 2)), texto: 'Mitad' },
                        { valor: String(tarjetaQR.saldoDisponible), texto: 'Retirar todo' },
                      ]}
                      activo={monto}
                      onCambio={setMonto}
                    />

                    <Campo id="dev-motivo" etiqueta="Motivo del retiro">
                      <select id="dev-motivo" value={motivoDevol} onChange={(e) => setMotivoDevol(e.target.value)}>
                        {MOTIVOS_DEVOLUCION.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                      </select>
                    </Campo>
                    {motivoDevol === 'otro' && (
                      <Campo
                        id="dev-motivo-nota" etiqueta="Detalle del motivo" placeholder="Contá brevemente qué pasó"
                        value={notaDevol} onChange={(e) => setNotaDevol(e.target.value)} maxLength={140}
                      />
                    )}

                    <FotoRequerida
                      id="dev-foto-carnet" titulo="Foto del carnet de quien retira" icono={FaIdCard}
                      valor={fotoCarnet} onCambio={setFotoCarnet} faltante={faltaCarnet} alt="Carnet de quien retira"
                    />
                    {esNegocio && (
                      <FotoRequerida
                        id="dev-foto-rostro" titulo="Foto de la cara de quien cobra" icono={FaUser}
                        valor={fotoRostro} onCambio={setFotoRostro} faltante={faltaRostro} alt="Cara de quien cobra"
                      />
                    )}

                    {errorRetiro && <AvisoFijo tono="error" titulo="No se pudo hacer el retiro">{errorRetiro}</AvisoFijo>}
                  </>
                )}
              </div>

              <div className="modal-actions pi-dev-tarjeta-acciones">
                {eventoNoCoincide ? (
                  <Boton variante="secundario" onClick={cerrarTarjeta}>Cerrar</Boton>
                ) : (
                  <>
                    <Boton variante="secundario" onClick={cerrarTarjeta} disabled={retirando}>Cancelar</Boton>
                    <Boton type="submit" variante="exito" tamano="lg" icono={FaCheckCircle} cargando={retirando}>
                      {retirando ? 'Registrando…' : Number(monto) > 0 ? `Retirar ${Number(monto)} pts` : 'Confirmar retiro'}
                    </Boton>
                  </>
                )}
              </div>
            </form>
          )}
        </Modal>
      )}

      {manillaFalsa && (
        <ManillaFalsaModal detalle={manillaFalsa} onCerrar={() => setManillaFalsa(null)} />
      )}

      {DialogoConfirmar}
    </div>
  );
}
