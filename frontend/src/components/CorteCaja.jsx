import { useCallback, useState } from 'react';
import { FaCashRegister, FaLockOpen, FaLock, FaCheckCircle, FaHistory } from 'react-icons/fa';
import { useApi } from '../utils/useApi.js';
import api from '../api/index.js';
import StatCard from './StatCard.jsx';
import Tabla from './Tabla.jsx';
import Modal from './Modal.jsx';
import Boton from './Boton.jsx';
import Campo from './Campo.jsx';
import Insignia from './Insignia.jsx';
import { AvisoFijo, useAvisos } from './Avisos.jsx';
import { useConfirmar } from './ConfirmarModal.jsx';
import { EstadoCarga, EstadoError, EstadoVacio } from './EstadosAsync.jsx';
import './CorteCaja.css';

const fmtBs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const fmtFechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// Verde si cuadra, ámbar si el descuadre es chico, rojo si es grande.
const tonoDif = (d) => {
  const a = Math.abs(Number(d) || 0);
  if (a < 0.01) return 'ok';
  if (a <= 5) return 'warn';
  return 'danger';
};
// Tono de <Insignia> -> tono de <AvisoFijo>.
const AVISO_DE = { ok: 'exito', warn: 'aviso', danger: 'error' };

/**
 * Arqueo de caja de un operador con efectivo (§5.2). Se monta dentro del panel
 * de Recargador / Devolución, ya con un evento elegido.
 *   modo: 'recarga' (Recargador, entra efectivo) | 'devolucion' (Devolución, sale efectivo)
 */
export default function CorteCaja({ evento, modo }) {
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const eventoId = evento?.id;
  const esDevol = modo === 'devolucion';
  const etiquetaSistema = esDevol ? 'Pagado en retiros (sistema)' : 'Recargado (sistema)';
  const labelFondo = esDevol
    ? 'Fondo de efectivo para pagar retiros'
    : 'Fondo de cambio inicial';
  const ayudaFondo = esDevol
    ? 'El efectivo real que te entregaron para pagar los retiros de este turno. No es saldo del evento: es plata física y sirve para cuadrar la caja al cerrar.'
    : 'El efectivo con el que arrancás el turno para poder dar cambio. Podés dejarlo en 0.';
  const labelEsperado = esDevol
    ? 'Efectivo que te debe quedar'
    : 'Efectivo esperado en caja';

  const cargar = useCallback(
    () =>
      Promise.all([
        api.cortesCaja.actual({ eventoId }),
        api.cortesCaja.listar({ eventoId }),
      ]).then(([caja, historial]) => ({ caja, historial })),
    [eventoId],
  );
  const { data, cargando, error, recargar } = useApi(cargar, { inicial: null, activo: !!eventoId });

  const [modalAbrir, setModalAbrir] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [montoDeclarado, setMontoDeclarado] = useState('');
  const [observacion, setObservacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errMut, setErrMut] = useState('');
  const [intentoCerrar, setIntentoCerrar] = useState(false);

  const caja = data?.caja || null;

  const errorInicial = montoInicial !== '' && Number(montoInicial) < 0 ? 'El fondo no puede ser negativo.' : null;
  const errorDeclarado = !intentoCerrar ? null
    : montoDeclarado === '' ? 'Escribí cuánto efectivo contaste (0 si no hay).'
      : Number(montoDeclarado) < 0 ? 'El monto no puede ser negativo.' : null;

  const abrir = async (e) => {
    e.preventDefault();
    if (errorInicial) return document.getElementById('caja-inicial')?.focus();
    setEnviando(true);
    setErrMut('');
    try {
      await api.cortesCaja.abrir({ eventoId, montoInicial: montoInicial === '' ? 0 : Number(montoInicial) });
      setModalAbrir(false);
      setMontoInicial('');
      await recargar();
      avisos.exito('Ya podés operar en este evento.', { titulo: 'Caja abierta' });
    } catch (e2) {
      setErrMut(e2.message);
    } finally {
      setEnviando(false);
    }
  };

  const difPreview = caja ? Number(montoDeclarado || 0) - Number(caja.montoEsperadoParcial || 0) : 0;

  const cerrar = async (e) => {
    e.preventDefault();
    setIntentoCerrar(true);
    if (montoDeclarado === '' || Number(montoDeclarado) < 0) return document.getElementById('caja-declarado')?.focus();

    // Si no cuadra, se confirma antes de cerrar (no se puede reabrir el mismo arqueo).
    if (Math.abs(difPreview) >= 0.01) {
      const ok = await confirmar({
        titulo: '¿Cerrar la caja con diferencia?',
        mensaje: `El conteo no cuadra: ${difPreview > 0 ? 'sobran' : 'faltan'} ${fmtBs(Math.abs(difPreview))}. Revisá el efectivo antes de cerrar; queda registrado en el historial.`,
        textoConfirmar: 'Cerrar igual',
        peligroso: true,
      });
      if (!ok) return;
    }

    setEnviando(true);
    setErrMut('');
    try {
      await api.cortesCaja.cerrar(caja.id, { montoDeclarado: Number(montoDeclarado), observacion: observacion.trim() || undefined });
      setModalCerrar(false);
      setMontoDeclarado('');
      setObservacion('');
      setIntentoCerrar(false);
      await recargar();
      avisos.exito(Math.abs(difPreview) < 0.01 ? 'El efectivo cuadró.' : 'Quedó registrado con su diferencia.', { titulo: 'Caja cerrada' });
    } catch (e2) {
      setErrMut(e2.message);
    } finally {
      setEnviando(false);
    }
  };

  const abrirModalCerrar = () => { setErrMut(''); setIntentoCerrar(false); setModalCerrar(true); };
  const abrirModalAbrir = () => { setErrMut(''); setModalAbrir(true); };

  return (
    <div className="pi-caja-wrap">
      <section className="pi-caja-seccion">
        <h3 className="pi-caja-titulo"><FaCashRegister aria-hidden="true" /> Arqueo de caja</h3>

        {error ? (
          <EstadoError onReintentar={recargar} />
        ) : cargando || !data ? (
          <EstadoCarga filas={3} />
        ) : !caja ? (
          <EstadoVacio
            compacto
            icono={FaLock}
            titulo="No tenés una caja abierta para este evento"
            mensaje={ayudaFondo}
            accion={<Boton icono={FaLockOpen} onClick={abrirModalAbrir}>Abrir caja</Boton>}
          />
        ) : (
          <>
            <div className="qp-stats">
              <StatCard valor={fmtFechaHora(caja.abiertaEn)} label="Caja abierta desde" />
              <StatCard valor={fmtBs(caja.montoInicial)} label={labelFondo} />
              <StatCard tono="total" valor={fmtBs(caja.montoSistemaParcial)} label={etiquetaSistema} />
              <StatCard tono="info" valor={fmtBs(caja.montoEsperadoParcial)} label={labelEsperado} />
            </div>
            <p className="texto-ayuda">
              {esDevol
                ? `${labelEsperado} = fondo (${fmtBs(caja.montoInicial)}) − pagado en retiros (${fmtBs(caja.montoSistemaParcial)}).`
                : `${labelEsperado} = fondo (${fmtBs(caja.montoInicial)}) + recargado en efectivo (${fmtBs(caja.montoSistemaParcial)}).`}
            </p>
            <div>
              <Boton icono={FaLock} onClick={abrirModalCerrar}>Cerrar caja</Boton>
            </div>
          </>
        )}
      </section>

      {data && data.historial.length > 0 && (
        <section className="pi-caja-seccion">
          <h3 className="pi-caja-titulo"><FaHistory aria-hidden="true" /> Cierres anteriores</h3>
          <p className="texto-ayuda">
            {esDevol
              ? 'Efectivo esperado = Fondo inicial − Pagado en retiros. Diferencia = Contado − Esperado.'
              : 'Efectivo esperado = Fondo inicial + Recargado. Diferencia = Contado − Esperado.'}
          </p>
          <Tabla
            card
            columnas={['Abierta', 'Cerrada', 'Fondo inicial', esDevol ? 'Pagado en retiros' : 'Recargado', 'Efectivo esperado', 'Contado', 'Diferencia']}
            datos={data.historial}
            porPagina={8}
            vacio="Sin cierres."
            renderFila={(c) => (
              <tr key={c.id}>
                <td>{fmtFechaHora(c.abiertaEn)}</td>
                <td>{c.cerradaEn ? fmtFechaHora(c.cerradaEn) : <Insignia tono="ok" punto latido>Abierta</Insignia>}</td>
                <td>{fmtBs(c.montoInicial)}</td>
                <td>{c.montoSistema == null ? '—' : fmtBs(c.montoSistema)}</td>
                <td>{c.montoEsperado == null ? '—' : fmtBs(c.montoEsperado)}</td>
                <td>{c.montoDeclarado == null ? '—' : fmtBs(c.montoDeclarado)}</td>
                <td>
                  {c.diferencia == null ? '—' : (
                    <Insignia tono={tonoDif(c.diferencia)}>
                      {c.diferencia > 0 ? '+' : ''}{fmtBs(c.diferencia)}
                    </Insignia>
                  )}
                </td>
              </tr>
            )}
          />
        </section>
      )}

      {modalAbrir && (
        <Modal titulo={<><FaLockOpen aria-hidden="true" /> Abrir caja</>} onCerrar={() => setModalAbrir(false)} tamano="sm">
          <form className="formulario" onSubmit={abrir} noValidate>
            <Campo
              id="caja-inicial" etiqueta={`${labelFondo}${esDevol ? '' : ' (opcional)'}`} prefijo="Bs"
              type="number" min="0" inputMode="decimal" placeholder="0" autoFocus
              ayuda={ayudaFondo}
              value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)}
              error={errorInicial}
              className="pi-caja-campo-monto"
            />
            {errMut && <AvisoFijo tono="error">{errMut}</AvisoFijo>}
            <div className="modal-actions">
              <Boton variante="secundario" onClick={() => setModalAbrir(false)} disabled={enviando}>Cancelar</Boton>
              <Boton type="submit" icono={FaLockOpen} cargando={enviando}>Abrir caja</Boton>
            </div>
          </form>
        </Modal>
      )}

      {modalCerrar && caja && (
        <Modal titulo={<><FaLock aria-hidden="true" /> Cerrar caja</>} onCerrar={() => setModalCerrar(false)} tamano="sm">
          <form className="formulario" onSubmit={cerrar} noValidate>
            <div className="pi-caja-resumen">
              <span>{labelEsperado}</span>
              <strong>{fmtBs(caja.montoEsperadoParcial)}</strong>
            </div>
            <Campo
              id="caja-declarado" etiqueta="Efectivo contado en la caja" prefijo="Bs"
              type="number" min="0" inputMode="decimal" placeholder="0" autoFocus
              value={montoDeclarado} onChange={(e) => setMontoDeclarado(e.target.value)}
              error={errorDeclarado}
              className="pi-caja-campo-monto"
            />
            {montoDeclarado !== '' && Number(montoDeclarado) >= 0 && (
              <AvisoFijo
                tono={AVISO_DE[tonoDif(difPreview)]}
                icono={Math.abs(difPreview) < 0.01 ? FaCheckCircle : undefined}
                titulo={Math.abs(difPreview) < 0.01 ? 'Cuadra' : `${difPreview > 0 ? 'Sobran' : 'Faltan'} ${fmtBs(Math.abs(difPreview))}`}
              >
                {Math.abs(difPreview) < 0.01 ? null : 'Volvé a contar antes de cerrar.'}
              </AvisoFijo>
            )}
            <Campo id="caja-obs" etiqueta="Observación (opcional)">
              <textarea
                id="caja-obs"
                rows={2}
                placeholder={esDevol
                  ? 'Ej: un retiro se pagó con un billete de más y quedó faltando cambio'
                  : 'Ej: se descontó cambio para colación'}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
              />
            </Campo>
            {errMut && <AvisoFijo tono="error">{errMut}</AvisoFijo>}
            <div className="modal-actions">
              <Boton variante="secundario" onClick={() => setModalCerrar(false)} disabled={enviando}>Cancelar</Boton>
              <Boton type="submit" icono={FaLock} cargando={enviando}>Confirmar cierre</Boton>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
