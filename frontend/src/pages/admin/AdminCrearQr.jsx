import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import StatCard from '../../components/StatCard.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import SelectorEvento from '../../components/SelectorEvento.jsx';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import Paginador from '../../components/Paginador.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useApi } from '../../utils/useApi.js';
import { limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaBoxes, FaPlus, FaTrash, FaFileDownload, FaFont, FaArrowsAltH, FaArrowsAltV,
  FaEye, FaLink, FaBan,
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
const MAX_TANDA = 2000;

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

// Un lado del QR en cm: entre 1 y 26 (26 cm ya no entra en una hoja A4).
const errorMedida = (valor, que) => {
  if (!String(valor).trim()) return `Indicá el ${que} del QR.`;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 1 && n <= 26 ? null : 'Debe estar entre 1 y 26 cm.';
};

const validarGeneracion = ({ cantidad, prefijo, anchoCm, altoCm }) => limpiarErrores({
  'qr-cantidad': !String(cantidad).trim()
    ? 'Indicá cuántos códigos generar.'
    : !(Number.isFinite(Number(cantidad)) && Number(cantidad) >= 1)
      ? 'Debe ser un número mayor a 0.'
      : Number(cantidad) > MAX_TANDA ? `El máximo por tanda es ${MAX_TANDA}.` : null,
  'qr-prefijo': prefijo.trim() ? null : 'Escribí un prefijo de 1 a 3 letras.',
  'qr-ancho': errorMedida(anchoCm, 'ancho'),
  'qr-alto': errorMedida(altoCm, 'alto'),
});

const ORDEN_CAMPOS = ['qr-cantidad', 'qr-prefijo', 'qr-ancho', 'qr-alto'];

export default function AdminCrearQr({ eventoId: eventoIdProp = null, tipoManilla = null, embebido = false } = {}) {
  useTituloPagina('Generar códigos QR', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const avisos = useAvisos();
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

  // El pool de manillas es a nivel EVENTO; cada manilla adopta la jornada cuando
  // el supervisor la vincula a una entrada. Las categorías dan el cupo total,
  // para sugerir cuántas generar.
  const cargarCategorias = useCallback(() => api.categoriasTicket.listar(eventoId), [eventoId]);
  const { data: categorias } = useApi(cargarCategorias, { inicial: [], activo: !!eventoId });

  const [form, setForm] = useState({ cantidad: '50', prefijo: 'QP', anchoCm: '5', altoCm: '5' });
  const [intento, setIntento] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errorGenerar, setErrorGenerar] = useState('');
  const errores = intento ? validarGeneracion(form) : {};
  const cambiar = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));

  const [pagina, setPagina] = useState(0);
  const [mostrarImagenes, setMostrarImagenes] = useState(false);
  const [codigoAVer, setCodigoAVer] = useState(null);
  const [vaciando, setVaciando] = useState(false);
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const [generandoPdf, setGenerandoPdf] = useState(null); // { actual, total } | null

  useEffect(() => {
    if (embebido) return;
    api.eventos.listarTodos().then(lista => {
      setEventosDisponibles(lista);
      setEventoId(prev => prev || lista[0]?.id);
    });
  }, [embebido]);

  // Embebido (abierto desde Gestion de Eventos) no carga el listado, asi que
  // `eventoActual` quedaba vacio: el titulo decia "este evento" y el PDF se
  // bajaba como `qr-evento-...` en vez de llevar el nombre. Se trae el evento
  // puntual. obtenerAdmin y no obtener: puede estar en borrador.
  useEffect(() => {
    if (!embebido || !eventoId) return;
    let vigente = true;
    api.eventos.obtenerAdmin(eventoId)
      .then(ev => { if (vigente && ev) setEventosDisponibles([ev]); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [embebido, eventoId]);

  const anchoPx = cmAPx(form.anchoCm) || 180;
  const altoPx = cmAPx(form.altoCm) || 180;

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

  // Resumen del evento: cupo total (Σ categorías de todas las jornadas), entradas
  // confirmadas, manillas ya generadas, y una cantidad sugerida (cupo + 10% de
  // reserva por pérdidas/cambios, menos lo ya generado).
  const resumenEvento = useMemo(() => {
    const cupo = categorias.reduce((s, c) => s + Number(c.cantidad || 0), 0);
    const confirmadas = categorias.reduce((s, c) => s + Number(c.vendidas || 0), 0);
    const yaGeneradas = codigos.length;
    const sugerido = Math.max(0, Math.ceil(cupo * 1.1) - yaGeneradas);
    return { cupo, confirmadas, yaGeneradas, sugerido };
  }, [categorias, codigos]);
  const totalPaginas = Math.max(1, Math.ceil(codigos.length / TAMANO_PAGINA));
  const codigosPagina = codigos.slice(pagina * TAMANO_PAGINA, pagina * TAMANO_PAGINA + TAMANO_PAGINA);

  const cambiarEvento = (nuevoId) => {
    setEventoId(nuevoId);
    setPagina(0);
    setMostrarImagenes(false);
  };

  // Generar una tanda: sin confirmación (se puede vaciar lo no vinculado), pero
  // CON cargando — antes se podía disparar dos tandas de 2000 con doble clic — y
  // con el error a la vista (antes la promesa se rompía en silencio).
  const handleGenerar = async (e) => {
    e.preventDefault();
    setIntento(true);
    const errs = validarGeneracion(form);
    if (Object.keys(errs).length) return enfocarPrimero(errs, ORDEN_CAMPOS);
    setGenerando(true);
    setErrorGenerar('');
    try {
      const n = Number(form.cantidad);
      await api.codigosQr.generar({ eventoId, cantidad: n, prefijo: form.prefijo });
      await recargarCodigos();
      setPagina(0);
      setMostrarImagenes(false);
      setIntento(false);
      avisos.exito(`Se generaron ${n} códigos QR.`);
    } catch (err) {
      setErrorGenerar(err?.message || 'No se pudieron generar los códigos.');
    } finally {
      setGenerando(false);
    }
  };

  const handleVaciar = async () => {
    const libres = stats.libres;
    const ok = await confirmar({
      titulo: '¿Borrar los códigos sin vincular?',
      mensaje: `Se eliminarán ${libres} código(s) QR de este evento que aún no están vinculados a una manilla. Los ya vinculados y los anulados no se tocan.`,
      textoConfirmar: `Borrar ${libres} códigos`,
      peligroso: true,
    });
    if (!ok) return;
    setVaciando(true);
    try {
      await api.codigosQr.eliminarNoVinculados(eventoId);
      await recargarCodigos();
      setPagina(0);
      setMostrarImagenes(false);
      avisos.exito('Se borraron los códigos sin vincular.');
    } catch (err) {
      avisos.error(err?.message || 'No se pudieron borrar los códigos.', { titulo: 'No se pudo borrar' });
    } finally {
      setVaciando(false);
    }
  };

  // Arma el PDF entero en el navegador (QR dibujado localmente, sin pedirle nada a
  // ninguna API externa) y lo descarga como archivo. `lista` puede ser la página
  // actual o el evento completo; en lotes grandes se ve el progreso en vivo.
  const descargarPdf = async (lista) => {
    if (lista.length === 0 || generandoPdf) return;
    setGenerandoPdf({ actual: 0, total: lista.length });
    try {
      const conTamano = lista.map(qr => ({ ...qr, ancho: anchoPx, alto: altoPx }));
      await construirPdfQr(conTamano, (actual, total) => setGenerandoPdf({ actual, total }), eventoActual);
    } catch (err) {
      avisos.error(err?.message || 'No se pudo armar el PDF.', { titulo: 'No se pudo descargar' });
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
        <EncabezadoPagina
          titulo="Generar códigos QR"
          subtitulo="Genera una cantidad de códigos QR únicos para el evento y descárgalos en PDF."
          icono={FaQrcode}
          acciones={
            <SelectorEvento
              id="qr-evento"
              eventos={eventosDisponibles}
              valor={eventoId}
              onCambio={cambiarEvento}
              bloqueado={eventoBloqueado}
              nombre={eventoActual?.nombre}
            />
          }
        />
      )}

      {(tipoManilla || eventoActual?.tipoManilla) === 'digital' && (
        <AvisoFijo tono="info" icono={FaQrcode}>
          Este evento es de <strong>manilla digital</strong>: cada entrada recibe su código QR
          solo al aprobarse la compra. Generar un lote acá es opcional (por ejemplo, para staff
          u otro uso aparte de las entradas).
        </AvisoFijo>
      )}

      <div className="qp-stats">
        <StatCard icon={<FaQrcode />} tono="total" valor={stats.total} label="Códigos generados" />
        <StatCard icon={<FaLink />} tono="ok" valor={stats.vinculados} label="Vinculados (activos)" />
        <StatCard icon={<FaBan />} tono="danger" valor={stats.anulados} label="Anulados (cambio de manilla)" />
        <StatCard icon={<FaBoxes />} tono="total" valor={stats.libres} label="Libres (sin vincular)" />
      </div>

      <Card>
        <h3 className="pi-adqr-subtitulo">Generar nuevos códigos</h3>
        <form onSubmit={handleGenerar} noValidate>
          <div className="pi-adqr-form-grid">
            <Campo
              id="qr-cantidad" etiqueta="Cantidad a generar" icono={FaBoxes} type="number"
              inputMode="numeric" min="1" max={MAX_TANDA} value={form.cantidad}
              onChange={cambiar('cantidad')} placeholder="Ej: 50" error={errores['qr-cantidad']}
            />
            <Campo
              id="qr-prefijo" etiqueta="Prefijo (1 a 3 letras)" icono={FaFont} maxLength={3}
              value={form.prefijo} placeholder="Ej: VIP" error={errores['qr-prefijo']}
              onChange={(e) => setForm(f => ({ ...f, prefijo: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) }))}
            />
            <Campo
              id="qr-ancho" etiqueta="Ancho del QR (cm)" icono={FaArrowsAltH} type="number"
              min="1" max="26" step="0.1" value={form.anchoCm} onChange={cambiar('anchoCm')}
              placeholder="Ej: 5" error={errores['qr-ancho']}
            />
            <Campo
              id="qr-alto" etiqueta="Alto del QR (cm)" icono={FaArrowsAltV} type="number"
              min="1" max="26" step="0.1" value={form.altoCm} onChange={cambiar('altoCm')}
              placeholder="Ej: 5" error={errores['qr-alto']}
            />
          </div>

          {resumenEvento.cupo > 0 && (
            <p className="texto-ayuda">
              Cupo del evento: <strong>{resumenEvento.cupo}</strong> entradas
              {' · '}{resumenEvento.confirmadas} confirmadas
              {' · '}{resumenEvento.yaGeneradas} manillas ya generadas.
              {resumenEvento.sugerido > 0 ? (
                <Boton
                  variante="fantasma"
                  tamano="sm"
                  onClick={() => setForm(f => ({ ...f, cantidad: String(resumenEvento.sugerido) }))}
                >
                  Usar sugerido: {resumenEvento.sugerido}
                </Boton>
              ) : (
                <span> Ya hay manillas para todo el cupo (+10% de reserva).</span>
              )}
            </p>
          )}

          {errorGenerar && <AvisoFijo tono="error">{errorGenerar}</AvisoFijo>}

          <div className="pi-adqr-form-actions">
            <Boton type="submit" icono={FaPlus} cargando={generando}>Generar códigos</Boton>
          </div>
        </form>
      </Card>

      <Card>
        <div className="pi-adqr-card-header">
          <h3 className="pi-adqr-subtitulo">
            Códigos de {eventoActual?.nombre || 'este evento'}
          </h3>
          {codigos.length > 0 && (
            <div className="btn-acciones">
              <Boton variante="fantasma" icono={FaEye} onClick={() => setMostrarImagenes(v => !v)}>
                {mostrarImagenes ? 'Ocultar QR de esta página' : 'Ver QR de esta página'}
              </Boton>
              <Boton
                variante="secundario" icono={FaFileDownload} disabled={!!generandoPdf}
                onClick={() => descargarPdf(codigosPagina)}
              >
                PDF (esta página)
              </Boton>
              <Boton
                variante="secundario" icono={FaFileDownload} disabled={!!generandoPdf}
                onClick={() => descargarPdf(codigos)}
              >
                PDF (todo el evento)
              </Boton>
              <Boton
                variante="peligro-suave" icono={FaTrash} onClick={handleVaciar}
                cargando={vaciando} disabled={stats.libres === 0}
              >
                Vaciar
              </Boton>
            </div>
          )}
        </div>

        {generandoPdf && (
          <div className="pi-adqr-progreso">
            <progress
              className="pi-adqr-progreso-barra"
              value={generandoPdf.actual}
              max={generandoPdf.total}
            />
            <span>Generando PDF… {generandoPdf.actual} / {generandoPdf.total}</span>
          </div>
        )}

        {errorCodigos ? (
          <EstadoError onReintentar={recargarCodigos} />
        ) : cargandoCodigos ? (
          <EstadoCarga filas={5} />
        ) : codigos.length === 0 ? (
          <EstadoVacio icono={FaQrcode} titulo="Aún no se generaron códigos QR para este evento." />
        ) : (
          <>
            <Paginador
              pagina={pagina}
              totalPaginas={totalPaginas}
              onCambio={setPagina}
              total={codigos.length}
              unidad="códigos"
            />

            <div className="pi-adqr-grid">
              {codigosPagina.map(qr => (
                mostrarImagenes ? (
                  <div key={qr.id} className="pi-adqr-tarjeta">
                    <QrImg qr={qr} ancho={anchoPx} alto={altoPx} />
                    <span className="pi-adqr-codigo">{qr.codigo}</span>
                  </div>
                ) : (
                  <button
                    key={qr.id}
                    type="button"
                    className="pi-adqr-chip"
                    onClick={() => setCodigoAVer(qr)}
                  >
                    <FaQrcode aria-hidden="true" />
                    <span className="pi-adqr-codigo">{qr.codigo}</span>
                  </button>
                )
              ))}
            </div>
          </>
        )}
      </Card>

      {/* El QR ampliado usa el Modal global (antes: overlay a mano con useModal). */}
      {codigoAVer && (
        <Modal titulo={codigoAVer.codigo} onCerrar={() => setCodigoAVer(null)} tamano="sm">
          <div className="pi-adqr-ampliado">
            <QrImg qr={codigoAVer} ancho={anchoPx} alto={altoPx} />
            <span className="pi-adqr-codigo">{codigoAVer.codigo}</span>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
