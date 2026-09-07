import { useCallback, useState } from 'react';
import {
  FaCashRegister, FaLockOpen, FaLock, FaCheckCircle, FaExclamationTriangle,
} from 'react-icons/fa';
import { useApi } from '../utils/useApi.js';
import api from '../api/index.js';
import StatCard from './StatCard.jsx';
import Tabla from './Tabla.jsx';
import Modal from './Modal.jsx';
import { EstadoCarga, EstadoError } from './EstadosAsync.jsx';
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

/**
 * Arqueo de caja de un operador con efectivo (§5.2). Se monta dentro del panel
 * de Recargador / Devolución, ya con un evento elegido.
 *   modo: 'recarga' (Recargador, entra efectivo) | 'devolucion' (Devolución, sale efectivo)
 */
export default function CorteCaja({ evento, modo }) {
  const eventoId = evento?.id;
  const etiquetaSistema = modo === 'devolucion' ? 'Entregado (sistema)' : 'Recargado (sistema)';

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

  const caja = data?.caja || null;

  const abrir = async () => {
    setEnviando(true);
    setErrMut('');
    try {
      await api.cortesCaja.abrir({ eventoId, montoInicial: montoInicial === '' ? 0 : Number(montoInicial) });
      setModalAbrir(false);
      setMontoInicial('');
      await recargar();
    } catch (e) {
      setErrMut(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = async () => {
    if (montoDeclarado === '' || Number(montoDeclarado) < 0) return;
    setEnviando(true);
    setErrMut('');
    try {
      await api.cortesCaja.cerrar(caja.id, { montoDeclarado: Number(montoDeclarado), observacion: observacion.trim() || undefined });
      setModalCerrar(false);
      setMontoDeclarado('');
      setObservacion('');
      await recargar();
    } catch (e) {
      setErrMut(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const difPreview = caja ? Number(montoDeclarado || 0) - Number(caja.montoEsperadoParcial || 0) : 0;

  return (
    <div className="pi-caja-wrap">
      <section className="pi-caja-seccion">
        <h3 className="pi-caja-titulo"><FaCashRegister aria-hidden="true" /> Arqueo de caja</h3>

        {error ? (
          <EstadoError onReintentar={recargar} />
        ) : cargando || !data ? (
          <EstadoCarga filas={3} />
        ) : !caja ? (
          <div className="pi-caja-cerrada">
            <p>No tenés una caja abierta para este evento.</p>
            <button type="button" className="pi-caja-btn-primario" onClick={() => setModalAbrir(true)}>
              <FaLockOpen aria-hidden="true" /> Abrir caja
            </button>
          </div>
        ) : (
          <>
            <div className="pi-caja-grid">
              <StatCard valor={fmtFechaHora(caja.abiertaEn)} label="Caja abierta desde" />
              <StatCard valor={fmtBs(caja.montoInicial)} label="Fondo de cambio inicial" />
              <StatCard tono="total" valor={fmtBs(caja.montoSistemaParcial)} label={etiquetaSistema} />
              <StatCard tono="info" valor={fmtBs(caja.montoEsperadoParcial)} label="Efectivo esperado ahora" />
            </div>
            <button type="button" className="pi-caja-btn-primario" onClick={() => setModalCerrar(true)}>
              <FaLock aria-hidden="true" /> Cerrar caja
            </button>
          </>
        )}
      </section>

      {data && data.historial.length > 0 && (
        <section className="pi-caja-seccion">
          <h3 className="pi-caja-titulo">Cierres anteriores</h3>
          <Tabla
            card
            columnas={['Abierta', 'Cerrada', 'Sistema', 'Esperado', 'Declarado', 'Diferencia']}
            datos={data.historial}
            porPagina={8}
            vacio="Sin cierres."
            renderFila={(c) => (
              <tr key={c.id}>
                <td>{fmtFechaHora(c.abiertaEn)}</td>
                <td>{c.cerradaEn ? fmtFechaHora(c.cerradaEn) : <span className="pi-caja-abierta-badge">Abierta</span>}</td>
                <td>{c.montoSistema == null ? '—' : fmtBs(c.montoSistema)}</td>
                <td>{c.montoEsperado == null ? '—' : fmtBs(c.montoEsperado)}</td>
                <td>{c.montoDeclarado == null ? '—' : fmtBs(c.montoDeclarado)}</td>
                <td>
                  {c.diferencia == null ? '—' : (
                    <span className={`pi-caja-dif pi-caja-dif--${tonoDif(c.diferencia)}`}>
                      {c.diferencia > 0 ? '+' : ''}{fmtBs(c.diferencia)}
                    </span>
                  )}
                </td>
              </tr>
            )}
          />
        </section>
      )}

      {modalAbrir && (
        <Modal titulo="Abrir caja" onCerrar={() => setModalAbrir(false)} tamano="sm">
          <div className="pi-caja-form">
            <label htmlFor="caja-inicial">Fondo de cambio inicial (opcional)</label>
            <input
              id="caja-inicial"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="0"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              autoFocus
            />
            <p className="pi-caja-ayuda">El efectivo con el que arrancás el turno. Podés dejarlo en 0.</p>
            {errMut && <p className="pi-caja-err"><FaExclamationTriangle aria-hidden="true" /> {errMut}</p>}
            <div className="pi-caja-acciones">
              <button type="button" className="pi-caja-btn-sec" onClick={() => setModalAbrir(false)} disabled={enviando}>Cancelar</button>
              <button type="button" className="pi-caja-btn-primario" onClick={abrir} disabled={enviando}>
                <FaLockOpen aria-hidden="true" /> Abrir caja
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalCerrar && caja && (
        <Modal titulo="Cerrar caja" onCerrar={() => setModalCerrar(false)} tamano="sm">
          <div className="pi-caja-form">
            <div className="pi-caja-resumen">
              <span>Efectivo esperado</span>
              <strong>{fmtBs(caja.montoEsperadoParcial)}</strong>
            </div>
            <label htmlFor="caja-declarado">Efectivo contado en la caja</label>
            <input
              id="caja-declarado"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="0"
              value={montoDeclarado}
              onChange={(e) => setMontoDeclarado(e.target.value)}
              autoFocus
            />
            {montoDeclarado !== '' && (
              <div className={`pi-caja-preview pi-caja-preview--${tonoDif(difPreview)}`}>
                {Math.abs(difPreview) < 0.01
                  ? <><FaCheckCircle aria-hidden="true" /> Cuadra</>
                  : <>Diferencia: {difPreview > 0 ? 'sobran ' : 'faltan '}{fmtBs(Math.abs(difPreview))}</>}
              </div>
            )}
            <label htmlFor="caja-obs">Observación (opcional)</label>
            <textarea
              id="caja-obs"
              rows={2}
              placeholder="Ej: se descontó cambio para colación"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
            {errMut && <p className="pi-caja-err"><FaExclamationTriangle aria-hidden="true" /> {errMut}</p>}
            <div className="pi-caja-acciones">
              <button type="button" className="pi-caja-btn-sec" onClick={() => setModalCerrar(false)} disabled={enviando}>Cancelar</button>
              <button
                type="button"
                className="pi-caja-btn-primario"
                onClick={cerrar}
                disabled={enviando || montoDeclarado === '' || Number(montoDeclarado) < 0}
              >
                <FaLock aria-hidden="true" /> Confirmar cierre
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
