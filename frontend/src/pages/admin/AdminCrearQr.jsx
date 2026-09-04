import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaQrcode, FaBoxes, FaPlus, FaTrash, FaFileDownload, FaFont, FaArrowsAltH, FaArrowsAltV,
  FaEye, FaTimes, FaChevronLeft, FaChevronRight, FaLink, FaBan
} from 'react-icons/fa';
import BotonVolver from '../../components/BotonVolver.jsx';
import api from '../../api/index.js';
import { generarDataUrlQr, construirPdfQr } from '../../utils/qrPdf';
import './AdminCrearQr.css';

// Referencia para convertir cm -> px (96px = 1 pulgada, el estándar de pantalla/CSS).
const PX_POR_CM = 96 / 2.54;
const cmAPx = (cm) => Math.round(Number(cm) * PX_POR_CM);

// Con eventos de miles de códigos no se puede tener la imagen de cada QR dibujada a la
// vez. Por eso la lista por defecto solo muestra el texto del código, y las imágenes
// (dibujadas localmente, sin red) se acotan por página.
const TAMANO_PAGINA = 100;

// Dibuja el QR de un código bajo demanda (con la librería `qrcode`, sin red de por medio).
// El tamaño (ancho/alto) es solo un dato de impresión, no viene del backend: se aplica el
// tamaño elegido en el formulario actual a todos los códigos que se muestran/imprimen.
function QrImg({ qr, ancho = 180, alto = 180 }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelado = false;
    generarDataUrlQr({ codigo: qr.codigo, ancho, alto }).then((url) => { if (!cancelado) setDataUrl(url); });
    return () => { cancelado = true; };
  }, [qr, ancho, alto]);

  if (!dataUrl) {
    return <div className="pi-adqr-qr-cargando" style={{ width: ancho, height: alto }} />;
  }
  return (
    <img src={dataUrl} alt={qr.codigo} width={ancho} height={alto} style={{ width: `${ancho}px`, height: `${alto}px` }} />
  );
}

export default function AdminCrearQr({ eventoId: eventoIdProp = null, embebido = false } = {}) {
  useTituloPagina('Generar códigos QR', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(eventoIdProp || location.state?.eventoId || '');

  // Códigos del evento con estados cargando/error/reintentar (Manual 8.9).
  const cargarCodigos = useCallback(
    () => api.codigosQr.listar({ eventoId }),
    [eventoId],
  );
  const {
    data: codigos,
    cargando: cargandoCodigos,
    error: errorCodigos,
    recargar: recargarCodigos,
  } = useApi(cargarCodigos, { inicial: [], activo: !!eventoId });

  const [cantidad, setCantidad] = useState('50');
  const [prefijo, setPrefijo] = useState('QP');
  const [anchoCm, setAnchoCm] = useState('5');
  const [altoCm, setAltoCm] = useState('5');
  const [errores, setErrores] = useState({});
  const limpiarError = (campo) => setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
  const [pagina, setPagina] = useState(0);
  const [mostrarImagenes, setMostrarImagenes] = useState(false);
  const [codigoAVer, setCodigoAVer] = useState(null);
  const [confirmar, DialogoConfirmar] = useConfirmar();

  // Foco del modal de QR ampliado (A1 / Manual 8.6)
  const modalQrRef = useRef(null);
  useFocoModal(modalQrRef, !!codigoAVer);
  const [generandoPdf, setGenerandoPdf] = useState(null); // { actual, total } | null

  // Modal del QR ampliado: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  useEffect(() => {
    if (!codigoAVer) return;
    const alTecla = (e) => { if (e.key === 'Escape') setCodigoAVer(null); };
    window.addEventListener('keydown', alTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTecla);
      document.body.style.overflow = '';
    };
  }, [codigoAVer]);

  useEffect(() => {
    if (embebido) return;
    api.eventos.listar().then(lista => {
      setEventosDisponibles(lista);
      setEventoId(prev => prev || lista[0]?.id);
    });
  }, [embebido]);


  const anchoPx = cmAPx(anchoCm) || 180;
  const altoPx = cmAPx(altoCm) || 180;

  const eventoActual = eventosDisponibles.find(ev => ev.id === eventoId);
  // Embebido o llegado desde Gestión de Eventos: evento fijo (sin selector/volver).
  const eventoBloqueado = embebido || !!location.state?.eventoId;

  // Un código anulado siempre estuvo vinculado antes (se anula al perder/cambiar la
  // manilla o al reemplazarla por una nueva). Los que nunca se usaron quedan libres.
  const stats = useMemo(() => {
    const total = codigos.length;
    const vinculados = codigos.filter(c => c.entradaId && !c.anulado).length;
    const anulados = codigos.filter(c => c.anulado).length;
    return { total, vinculados, anulados, libres: total - vinculados - anulados };
  }, [codigos]);
  const totalPaginas = Math.max(1, Math.ceil(codigos.length / TAMANO_PAGINA));
  const codigosPagina = codigos.slice(pagina * TAMANO_PAGINA, pagina * TAMANO_PAGINA + TAMANO_PAGINA);

  const cambiarEvento = (nuevoId) => {
    setEventoId(nuevoId);
    setPagina(0);
    setMostrarImagenes(false);
  };

  const handleGenerar = async (e) => {
    e.preventDefault();

    const errs = {};
    const n = Number(cantidad);
    if (!String(cantidad).trim()) errs.cantidad = 'Indicá cuántos códigos generar.';
    else if (!Number.isFinite(n) || n < 1) errs.cantidad = 'Debe ser un número mayor a 0.';
    else if (n > 2000) errs.cantidad = 'El máximo por tanda es 2000.';

    if (!prefijo.trim()) errs.prefijo = 'Escribí un prefijo de 1 a 3 letras.';

    const a = Number(anchoCm);
    if (!String(anchoCm).trim()) errs.ancho = 'Indicá el ancho del QR.';
    else if (!Number.isFinite(a) || a < 1 || a > 26) errs.ancho = 'Debe estar entre 1 y 26 cm.';

    const h = Number(altoCm);
    if (!String(altoCm).trim()) errs.alto = 'Indicá el alto del QR.';
    else if (!Number.isFinite(h) || h < 1 || h > 26) errs.alto = 'Debe estar entre 1 y 26 cm.';

    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    await api.codigosQr.generar({ eventoId, cantidad: n, prefijo });
    await recargarCodigos();
    setPagina(0);
    setMostrarImagenes(false);
  };

  const handleVaciar = async () => {
    const ok = await confirmar({
      titulo: '¿Borrar los códigos sin vincular?',
      mensaje: 'Se eliminarán todos los códigos QR de este evento que aún no estén vinculados a una manilla. Los ya vinculados no se tocan.',
      textoConfirmar: 'Borrar códigos',
      peligroso: true,
    });
    if (!ok) return;
    await api.codigosQr.eliminarNoVinculados(eventoId);
    await recargarCodigos();
    setPagina(0);
    setMostrarImagenes(false);
  };

  const irAPagina = (n) => {
    setPagina(Math.min(Math.max(n, 0), totalPaginas - 1));
  };

  // Arma el PDF entero en el navegador (QR dibujado localmente, sin pedirle nada a
  // ninguna API externa) y lo descarga como archivo. `codigos` puede ser la página
  // actual o el evento completo; en lotes grandes se ve el progreso en vivo.
  const descargarPdf = async (lista) => {
    if (lista.length === 0 || generandoPdf) return;
    setGenerandoPdf({ actual: 0, total: lista.length });
    try {
      const conTamano = lista.map(qr => ({ ...qr, ancho: anchoPx, alto: altoPx }));
      await construirPdfQr(conTamano, (actual, total) => setGenerandoPdf({ actual, total }));
    } finally {
      setGenerandoPdf(null);
    }
  };

  return (
    <div className="pi-adqr-container">

      {!embebido && (
        <BotonVolver onClick={() => navigate('/admin/eventos', { state: { eventoId } })}>
          Volver al evento
        </BotonVolver>
      )}

      {!embebido && (
        <div className="pi-adqr-header">
          <div>
            <h1><FaQrcode color="var(--indigo-profundo)" aria-hidden="true" /> Generar códigos QR</h1>
            <p>Genera una cantidad de códigos QR únicos para el evento y descárgalos en PDF.</p>
          </div>
          <div className="pi-adqr-selector-evento">
            <FaCalendarAlt />
            {eventoBloqueado ? (
              <strong>{eventoActual?.nombre || 'Evento'}</strong>
            ) : (
              <select value={eventoId} onChange={(e) => cambiarEvento(e.target.value)}>
                {eventosDisponibles.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div className="pi-adqr-kpi-grid">
        <div className="pi-adqr-kpi-card">
          <FaQrcode color="var(--indigo-profundo)" size={20} />
          <span className="numero">{stats.total}</span>
          <span className="label">Códigos generados</span>
        </div>
        <div className="pi-adqr-kpi-card">
          <FaLink color="var(--verde-recarga-texto)" size={20} />
          <span className="numero">{stats.vinculados}</span>
          <span className="label">Vinculados (activos)</span>
        </div>
        <div className="pi-adqr-kpi-card">
          <FaBan color="var(--rojo-error-texto)" size={20} />
          <span className="numero">{stats.anulados}</span>
          <span className="label">Anulados (cambio de manilla)</span>
        </div>
        <div className="pi-adqr-kpi-card">
          <FaBoxes color="var(--indigo-profundo)" size={20} />
          <span className="numero">{stats.libres}</span>
          <span className="label">Libres (sin vincular)</span>
        </div>
      </div>

      <div className="pi-adqr-card">
        <h3 className="pi-adqr-subtitulo">Generar nuevos códigos</h3>
        <form onSubmit={handleGenerar} className="pi-adqr-form" noValidate>
          <div className="pi-adqr-input-group">
            <label htmlFor="qr-cantidad">Cantidad a generar</label>
            <div className="pi-adqr-input-wrapper">
              <FaBoxes className="pi-adqr-input-icon" aria-hidden="true" />
              <input
                id="qr-cantidad"
                type="number"
                inputMode="numeric"
                min="1"
                max="2000"
                value={cantidad}
                onChange={(e) => { setCantidad(e.target.value); limpiarError('cantidad'); }}
                placeholder="Ej: 50"
                aria-invalid={!!errores.cantidad}
                aria-describedby={errores.cantidad ? 'qr-cantidad-error' : undefined}
              />
            </div>
            {errores.cantidad && <p id="qr-cantidad-error" className="pi-adqr-error">{errores.cantidad}</p>}
          </div>
          <div className="pi-adqr-input-group">
            <label htmlFor="qr-prefijo">Prefijo (1 a 3 letras)</label>
            <div className="pi-adqr-input-wrapper">
              <FaFont className="pi-adqr-input-icon" aria-hidden="true" />
              <input
                id="qr-prefijo"
                type="text"
                value={prefijo}
                onChange={(e) => { setPrefijo(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)); limpiarError('prefijo'); }}
                placeholder="Ej: VIP"
                maxLength={3}
                aria-invalid={!!errores.prefijo}
                aria-describedby={errores.prefijo ? 'qr-prefijo-error' : undefined}
              />
            </div>
            {errores.prefijo && <p id="qr-prefijo-error" className="pi-adqr-error">{errores.prefijo}</p>}
          </div>
          <div className="pi-adqr-input-group">
            <label htmlFor="qr-ancho">Ancho del QR (cm)</label>
            <div className="pi-adqr-input-wrapper">
              <FaArrowsAltH className="pi-adqr-input-icon" aria-hidden="true" />
              <input
                id="qr-ancho"
                type="number"
                min="1"
                max="26"
                step="0.1"
                value={anchoCm}
                onChange={(e) => { setAnchoCm(e.target.value); limpiarError('ancho'); }}
                placeholder="Ej: 5"
                aria-invalid={!!errores.ancho}
                aria-describedby={errores.ancho ? 'qr-ancho-error' : undefined}
              />
            </div>
            {errores.ancho && <p id="qr-ancho-error" className="pi-adqr-error">{errores.ancho}</p>}
          </div>
          <div className="pi-adqr-input-group">
            <label htmlFor="qr-alto">Alto del QR (cm)</label>
            <div className="pi-adqr-input-wrapper">
              <FaArrowsAltV className="pi-adqr-input-icon" aria-hidden="true" />
              <input
                id="qr-alto"
                type="number"
                min="1"
                max="26"
                step="0.1"
                value={altoCm}
                onChange={(e) => { setAltoCm(e.target.value); limpiarError('alto'); }}
                placeholder="Ej: 5"
                aria-invalid={!!errores.alto}
                aria-describedby={errores.alto ? 'qr-alto-error' : undefined}
              />
            </div>
            {errores.alto && <p id="qr-alto-error" className="pi-adqr-error">{errores.alto}</p>}
          </div>
          <button type="submit" className="pi-adqr-btn-add">
            <FaPlus /> Generar Códigos
          </button>
        </form>
      </div>

      <div className="pi-adqr-card">
        <div className="pi-adqr-card-header">
          <h3 className="pi-adqr-subtitulo">
            Códigos de {eventoActual?.nombre || 'este evento'}
          </h3>
          {codigos.length > 0 && (
            <div className="pi-adqr-acciones-lista">
              <button
                type="button"
                className="pi-adqr-btn-vaciar"
                style={{ background: 'transparent', color: 'var(--indigo-profundo)' }}
                onClick={() => setMostrarImagenes(v => !v)}
              >
                <FaEye /> {mostrarImagenes ? 'Ocultar QR de esta página' : 'Ver QR de esta página'}
              </button>
              <button
                type="button"
                className="pi-adqr-btn-imprimir"
                onClick={() => descargarPdf(codigosPagina)}
                disabled={!!generandoPdf}
              >
                <FaFileDownload /> Descargar PDF (esta página)
              </button>
              <button
                type="button"
                className="pi-adqr-btn-imprimir"
                onClick={() => descargarPdf(codigos)}
                disabled={!!generandoPdf}
              >
                <FaFileDownload /> Descargar PDF (todo el evento)
              </button>
              <button type="button" className="pi-adqr-btn-vaciar" onClick={handleVaciar}>
                <FaTrash /> Vaciar
              </button>
            </div>
          )}
        </div>

        {generandoPdf && (
          <div className="pi-adqr-progreso">
            <div className="pi-adqr-progreso-barra">
              <div
                className="pi-adqr-progreso-relleno"
                style={{ width: `${(generandoPdf.actual / generandoPdf.total) * 100}%` }}
              />
            </div>
            <span>Generando PDF… {generandoPdf.actual} / {generandoPdf.total}</span>
          </div>
        )}

        {errorCodigos ? (
          <EstadoError onReintentar={recargarCodigos} />
        ) : cargandoCodigos ? (
          <EstadoCarga filas={5} />
        ) : codigos.length === 0 ? (
          <p className="pi-adqr-empty">Aún no se generaron códigos QR para este evento.</p>
        ) : (
          <>
            {totalPaginas > 1 && (
              <div className="pi-adqr-paginador">
                <button type="button" onClick={() => irAPagina(pagina - 1)} disabled={pagina === 0}>
                  <FaChevronLeft />
                </button>
                <span>Página {pagina + 1} de {totalPaginas} ({codigos.length} códigos en total)</span>
                <button type="button" onClick={() => irAPagina(pagina + 1)} disabled={pagina === totalPaginas - 1}>
                  <FaChevronRight />
                </button>
              </div>
            )}

            <div className="pi-adqr-grid">
              {codigosPagina.map(qr => (
                mostrarImagenes ? (
                  <div key={qr.id} className="pi-adqr-tarjeta">
                    <QrImg key={qr.id} qr={qr} ancho={anchoPx} alto={altoPx} />
                    <span className="pi-adqr-codigo">{qr.codigo}</span>
                  </div>
                ) : (
                  <button type="button"
                    key={qr.id}
                    type="button"
                    className="pi-adqr-chip"
                    onClick={() => setCodigoAVer(qr)}
                  >
                    <FaQrcode />
                    <span className="pi-adqr-codigo">{qr.codigo}</span>
                  </button>
                )
              ))}
            </div>
          </>
        )}
      </div>

      {codigoAVer && (
        <div className="pi-adqr-modal-fondo" onClick={() => setCodigoAVer(null)}>
          <div ref={modalQrRef} tabIndex={-1} className="pi-adqr-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Código QR ampliado">
            <button type="button" className="pi-adqr-modal-cerrar" onClick={() => setCodigoAVer(null)} aria-label="Cerrar">
              <FaTimes aria-hidden="true" />
            </button>
            <QrImg key={codigoAVer.id} qr={codigoAVer} ancho={anchoPx} alto={altoPx} />
            <span className="pi-adqr-codigo">{codigoAVer.codigo}</span>
          </div>
        </div>
      )}

      {DialogoConfirmar}
    </div>
  );
}
