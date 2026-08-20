import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FaCalendarAlt, FaQrcode, FaBoxes, FaPlus, FaTrash, FaFileDownload, FaFont, FaArrowsAltH, FaArrowsAltV,
  FaEye, FaTimes, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { leerEventos } from '../../data/eventosAdmin';
import { leerQrDelEvento, generarQr, vaciarQrDelEvento } from '../../data/codigosQr';
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
function QrImg({ qr }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelado = false;
    generarDataUrlQr(qr).then((url) => { if (!cancelado) setDataUrl(url); });
    return () => { cancelado = true; };
  }, [qr]);

  if (!dataUrl) {
    return <div className="pi-adqr-qr-cargando" style={{ width: qr.ancho || 180, height: qr.alto || 180 }} />;
  }
  return (
    <img
      src={dataUrl}
      alt={qr.codigo}
      style={{ width: `${qr.ancho || 180}px`, height: `${qr.alto || 180}px` }}
    />
  );
}

export default function AdminCrearQr() {
  const location = useLocation();
  const eventosDisponibles = useMemo(() => leerEventos(), []);

  const [eventoId, setEventoId] = useState(location.state?.eventoId || eventosDisponibles[0]?.id);
  const [qrDelEvento, setQrDelEvento] = useState(() => leerQrDelEvento(eventoId));
  const [cantidad, setCantidad] = useState('50');
  const [prefijo, setPrefijo] = useState('QP');
  const [anchoCm, setAnchoCm] = useState('5');
  const [altoCm, setAltoCm] = useState('5');
  const [pagina, setPagina] = useState(0);
  const [mostrarImagenes, setMostrarImagenes] = useState(false);
  const [codigoAVer, setCodigoAVer] = useState(null);
  const [generandoPdf, setGenerandoPdf] = useState(null); // { actual, total } | null

  const eventoActual = eventosDisponibles.find(ev => ev.id === eventoId);
  const totalPaginas = Math.max(1, Math.ceil(qrDelEvento.codigos.length / TAMANO_PAGINA));
  const codigosPagina = qrDelEvento.codigos.slice(pagina * TAMANO_PAGINA, pagina * TAMANO_PAGINA + TAMANO_PAGINA);

  const cambiarEvento = (nuevoId) => {
    setEventoId(nuevoId);
    setQrDelEvento(leerQrDelEvento(nuevoId));
    setPagina(0);
    setMostrarImagenes(false);
  };

  const handleGenerar = (e) => {
    e.preventDefault();
    const n = Number(cantidad);
    if (!n || n < 1) return;
    if (!prefijo.trim()) return;
    setQrDelEvento(generarQr(eventoId, n, {
      prefijo,
      ancho: cmAPx(anchoCm) || 180,
      alto: cmAPx(altoCm) || 180,
    }));
    setPagina(0);
    setMostrarImagenes(false);
  };

  const handleVaciar = () => {
    if (!window.confirm('¿Borrar todos los códigos QR generados para este evento?')) return;
    setQrDelEvento(vaciarQrDelEvento(eventoId));
    setPagina(0);
    setMostrarImagenes(false);
  };

  const irAPagina = (n) => {
    setPagina(Math.min(Math.max(n, 0), totalPaginas - 1));
  };

  // Arma el PDF entero en el navegador (QR dibujado localmente, sin pedirle nada a
  // ninguna API externa) y lo descarga como archivo. `codigos` puede ser la página
  // actual o el evento completo; en lotes grandes se ve el progreso en vivo.
  const descargarPdf = async (codigos) => {
    if (codigos.length === 0 || generandoPdf) return;
    setGenerandoPdf({ actual: 0, total: codigos.length });
    try {
      await construirPdfQr(codigos, (actual, total) => setGenerandoPdf({ actual, total }));
    } finally {
      setGenerandoPdf(null);
    }
  };

  return (
    <div className="pi-adqr-container">

      <div className="pi-adqr-header">
        <div>
          <h2><FaQrcode color="var(--indigo-profundo)" /> Generar Códigos QR</h2>
          <p>Genera una cantidad de códigos QR únicos para el evento y descárgalos en PDF (simulado, sin backend real).</p>
        </div>
        <div className="pi-adqr-selector-evento">
          <FaCalendarAlt />
          <select value={eventoId} onChange={(e) => cambiarEvento(e.target.value)}>
            {eventosDisponibles.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pi-adqr-kpi-grid">
        <div className="pi-adqr-kpi-card">
          <FaQrcode color="var(--indigo-profundo)" size={20} />
          <span className="numero">{qrDelEvento.codigos.length}</span>
          <span className="label">Códigos generados</span>
        </div>
      </div>

      <div className="pi-adqr-card">
        <h3 className="pi-adqr-subtitulo">Generar nuevos códigos</h3>
        <form onSubmit={handleGenerar} className="pi-adqr-form">
          <div className="pi-adqr-input-group">
            <label>Cantidad a generar</label>
            <div className="pi-adqr-input-wrapper">
              <FaBoxes className="pi-adqr-input-icon" />
              <input
                type="number"
                min="1"
                max="2000"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="Ej: 50"
                required
              />
            </div>
          </div>
          <div className="pi-adqr-input-group">
            <label>Prefijo (1 a 3 letras)</label>
            <div className="pi-adqr-input-wrapper">
              <FaFont className="pi-adqr-input-icon" />
              <input
                type="text"
                value={prefijo}
                onChange={(e) => setPrefijo(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
                placeholder="Ej: VIP"
                maxLength={3}
                required
              />
            </div>
          </div>
          <div className="pi-adqr-input-group">
            <label>Ancho del QR (cm)</label>
            <div className="pi-adqr-input-wrapper">
              <FaArrowsAltH className="pi-adqr-input-icon" />
              <input
                type="number"
                min="1"
                max="26"
                step="0.1"
                value={anchoCm}
                onChange={(e) => setAnchoCm(e.target.value)}
                placeholder="Ej: 5"
                required
              />
            </div>
          </div>
          <div className="pi-adqr-input-group">
            <label>Alto del QR (cm)</label>
            <div className="pi-adqr-input-wrapper">
              <FaArrowsAltV className="pi-adqr-input-icon" />
              <input
                type="number"
                min="1"
                max="26"
                step="0.1"
                value={altoCm}
                onChange={(e) => setAltoCm(e.target.value)}
                placeholder="Ej: 5"
                required
              />
            </div>
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
          {qrDelEvento.codigos.length > 0 && (
            <div className="pi-adqr-acciones-lista">
              <button
                className="pi-adqr-btn-vaciar"
                style={{ background: 'transparent', color: 'var(--indigo-profundo)' }}
                onClick={() => setMostrarImagenes(v => !v)}
              >
                <FaEye /> {mostrarImagenes ? 'Ocultar QR de esta página' : 'Ver QR de esta página'}
              </button>
              <button
                className="pi-adqr-btn-imprimir"
                onClick={() => descargarPdf(codigosPagina)}
                disabled={!!generandoPdf}
              >
                <FaFileDownload /> Descargar PDF (esta página)
              </button>
              <button
                className="pi-adqr-btn-imprimir"
                onClick={() => descargarPdf(qrDelEvento.codigos)}
                disabled={!!generandoPdf}
              >
                <FaFileDownload /> Descargar PDF (todo el evento)
              </button>
              <button className="pi-adqr-btn-vaciar" onClick={handleVaciar}>
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

        {qrDelEvento.codigos.length === 0 ? (
          <p className="pi-adqr-empty">Aún no se generaron códigos QR para este evento.</p>
        ) : (
          <>
            {totalPaginas > 1 && (
              <div className="pi-adqr-paginador">
                <button type="button" onClick={() => irAPagina(pagina - 1)} disabled={pagina === 0}>
                  <FaChevronLeft />
                </button>
                <span>Página {pagina + 1} de {totalPaginas} ({qrDelEvento.codigos.length} códigos en total)</span>
                <button type="button" onClick={() => irAPagina(pagina + 1)} disabled={pagina === totalPaginas - 1}>
                  <FaChevronRight />
                </button>
              </div>
            )}

            <div className="pi-adqr-grid">
              {codigosPagina.map(qr => (
                mostrarImagenes ? (
                  <div key={qr.id} className="pi-adqr-tarjeta">
                    <QrImg key={qr.id} qr={qr} />
                    <span className="pi-adqr-codigo">{qr.codigo}</span>
                  </div>
                ) : (
                  <button
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
          <div className="pi-adqr-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="pi-adqr-modal-cerrar" onClick={() => setCodigoAVer(null)}>
              <FaTimes />
            </button>
            <QrImg key={codigoAVer.id} qr={codigoAVer} />
            <span className="pi-adqr-codigo">{codigoAVer.codigo}</span>
          </div>
        </div>
      )}

    </div>
  );
}
