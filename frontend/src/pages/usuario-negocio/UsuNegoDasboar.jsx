import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowLeft, FaDollarSign, FaShoppingCart, FaReceipt, FaWallet,
  FaStore, FaClock, FaTrophy, FaUsers, FaBan,
} from 'react-icons/fa';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import StatCard from '../../components/StatCard.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Modal from '../../components/Modal.jsx';
import SelectorRango from '../../components/SelectorRango.jsx';
import { rangoDe } from '../../utils/rangoFechas.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import './UsuNegoDasboar.css';
import '../supervisor/GestionEntrega.css';

const fmtBs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const fmtHoraNum = (h) => `${String(h).padStart(2, '0')}:00`;
const fmtHora = (iso) => new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

// Chip "▲ 12.3% vs. periodo anterior" (W6, comparación §1.2 #1). `par` es
// { actual, anterior, variacion? } del payload; sin `par` no renderiza nada.
function ChipVar({ par }) {
  if (!par) return null;
  const varia = par.variacion != null
    ? par.variacion
    : par.anterior === 0 ? null : (par.actual - par.anterior) / par.anterior;
  if (varia == null) return null;
  const pct = varia * 100;
  const plano = Math.abs(pct) < 0.05;
  return (
    <span
      className="pi-ngd-nota"
      title="vs. periodo anterior"
      style={{ color: plano ? 'var(--text-muted)' : pct >= 0 ? 'var(--ok)' : 'var(--danger)' }}
    >
      {plano ? '=' : pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function UsuNegoDasboar() {
  useTituloPagina('Dashboard de negocio');
  const sesion = leerSesion();

  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const eventoId = eventoSeleccionado?.id || '';

  // --- Carga 1: eventos asignados (para el selector) ---
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

  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  // --- Carga 2: dashboard del evento elegido ---
  const [rango, setRango] = useState('todo'); // por defecto: todo el evento
  const cargarDash = useCallback(
    () => api.dashboard.negocio(eventoId, rangoDe(rango)),
    [eventoId, rango],
  );
  const {
    data,
    cargando,
    error,
    recargar,
  } = useApi(cargarDash, { inicial: null, activo: !!eventoId });

  // Anima las barras: cada vez que cambia el evento, vuelven a crecer desde 0.
  const [animar, setAnimar] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimar(true), 100);
    return () => {
      clearTimeout(t);
      setAnimar(false);
    };
  }, [eventoId]);

  const volverALista = () => setEventoSeleccionado(null);

  // Anulación de venta (§5.3)
  const [ventaAnular, setVentaAnular] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [errAnular, setErrAnular] = useState('');
  const confirmarAnular = async () => {
    if (motivoAnular.trim().length < 3) return;
    setAnulando(true);
    setErrAnular('');
    try {
      await api.ventas.anular(ventaAnular.id, motivoAnular.trim());
      setVentaAnular(null);
      setMotivoAnular('');
      await recargar();
    } catch (e) {
      setErrAnular(e.message);
    } finally {
      setAnulando(false);
    }
  };

  // ---------- SELECTOR DE EVENTO ----------
  if (!eventoSeleccionado) {
    return (
      <div className="pi-ngd-container">
        <div className="pi-ngd-header">
          <h1>Dashboard de negocio</h1>
          <p>Elige el evento del que quieres ver el resumen.</p>
        </div>
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <p className="pi-entrega-sin-eventos">
            Todavía no tienes ningún evento asignado. Pídele a Admin que te asigne uno.
          </p>
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
              {(ev) => (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  onClick={() => setEventoSeleccionado(ev)}
                  cta="Ver dashboard"
                />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  // ---------- DASHBOARD ----------
  return (
    <div className="pi-ngd-container">
      <div className="pi-ngd-header">
        <button className="pi-entrega-btn-volver" onClick={volverALista}>
          <FaArrowLeft /> Cambiar de evento
        </button>
        <h1>{eventoSeleccionado.nombre}</h1>
        <p>Resumen de tus puestos y ventas en este evento.</p>
        <div className="pi-ngd-rango">
          <SelectorRango valor={rango} onCambio={setRango} />
        </div>
      </div>

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando || !data ? (
        <EstadoCarga filas={8} />
      ) : data.resumen.puestos === 0 ? (
        <p className="pi-entrega-sin-eventos">No tienes puestos en este evento.</p>
      ) : (
        <>
          {/* --- RESUMEN (§3.1) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo">Resumen del evento</h3>
            <div className="pi-ngd-grid">
              <StatCard
                icon={<FaDollarSign />}
                tono="ok"
                valor={fmtBs(data.resumen.ingresoTotal)}
                label="Ventas del evento"
                extra={
                  <>
                    {data.resumen.anuladas?.cantidad > 0 && (
                      <span className="pi-ngd-nota">{data.resumen.anuladas.cantidad} anuladas ({fmtBs(data.resumen.anuladas.monto)})</span>
                    )}
                    <ChipVar par={data.resumen.comparativa?.ingresoTotal} />
                  </>
                }
              />
              <StatCard
                icon={<FaShoppingCart />}
                tono="total"
                valor={data.resumen.totalVentas}
                label="N.º de ventas"
                extra={<ChipVar par={data.resumen.comparativa?.totalVentas} />}
              />
              <StatCard
                icon={<FaReceipt />}
                valor={fmtBs(data.resumen.ticketPromedio)}
                label="Ticket promedio"
                extra={<ChipVar par={data.resumen.comparativa?.ticketPromedio} />}
              />
              <StatCard
                icon={<FaWallet />}
                tono="info"
                valor={fmtBs(data.resumen.acreditadoBilletera)}
                label="Acreditado a mi billetera"
                extra={<span className="pi-ngd-nota">debe coincidir con ventas</span>}
              />
              <StatCard
                icon={<FaWallet />}
                valor={fmtBs(data.resumen.saldoBilletera)}
                label="Saldo en mi billetera de este evento"
                extra={<span className="pi-ngd-nota">lo que aún no retiraste</span>}
              />
            </div>
          </section>

          {/* --- VENTAS POR HORA (W1) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo"><FaClock aria-hidden="true" /> Ventas por hora</h3>
            <VentasPorHora data={data.ventasPorHora} animar={animar} />
          </section>

          {/* --- TOP PRODUCTOS (W2) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo"><FaTrophy aria-hidden="true" /> Top productos</h3>
            <Tabla
              columnas={['Producto', { texto: 'Unidades', align: 'center' }, 'Ingresos']}
              datos={data.topProductos}
              vacio="Todavía no hay ventas con productos."
              renderFila={(p) => {
                const max = data.topProductos[0]?.ingresos || 1;
                return (
                  <tr key={p.nombre}>
                    <td>{p.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{p.unidades}</td>
                    <td>
                      <div className="pi-ngd-bar" aria-hidden="true">
                        <div className="pi-ngd-bar-fill" style={{ width: `${Math.round((p.ingresos / max) * 100)}%` }} />
                      </div>
                      <span className="pi-ngd-bar-txt">{fmtBs(p.ingresos)}</span>
                    </td>
                  </tr>
                );
              }}
            />
          </section>

          {/* --- POR CATEGORÍA DE PRODUCTO (§5.11) — solo si hay categorías cargadas --- */}
          {(data.ventasPorCategoria?.length > 1 ||
            (data.ventasPorCategoria?.length === 1 && data.ventasPorCategoria[0].categoria !== 'Sin categoría')) && (
            <section className="pi-ngd-seccion">
              <h3 className="pi-ngd-seccion-titulo"><FaTrophy aria-hidden="true" /> Ventas por categoría</h3>
              <Tabla
                columnas={['Categoría', { texto: 'Unidades', align: 'center' }, 'Ingresos']}
                datos={data.ventasPorCategoria}
                vacio="Sin datos."
                renderFila={(c) => (
                  <tr key={c.categoria}>
                    <td>{c.categoria}</td>
                    <td style={{ textAlign: 'center' }}>{c.unidades}</td>
                    <td>{fmtBs(c.ingresos)}</td>
                  </tr>
                )}
              />
            </section>
          )}

          {/* --- POR PUESTO (W3) — solo si hay más de uno --- */}
          {data.porPuesto.length > 1 && (
            <section className="pi-ngd-seccion">
              <h3 className="pi-ngd-seccion-titulo"><FaStore aria-hidden="true" /> Ventas por puesto</h3>
              <Tabla
                columnas={['Puesto', { texto: 'Ventas', align: 'center' }, 'Ingresos']}
                datos={data.porPuesto}
                vacio="Sin datos."
                renderFila={(p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{p.ventas}</td>
                    <td>{fmtBs(p.ingresos)}</td>
                  </tr>
                )}
              />
            </section>
          )}

          {/* --- POR AYUDANTE (W4) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo"><FaUsers aria-hidden="true" /> Ventas por ayudante</h3>
            <Tabla
              columnas={['Ayudante', { texto: 'Ventas', align: 'center' }, 'Ingresos', 'Ticket promedio']}
              datos={data.porAyudante}
              vacio="Todavía no hay ventas."
              renderFila={(a) => (
                <tr key={a.id}>
                  <td>{a.nombre}</td>
                  <td style={{ textAlign: 'center' }}>{a.ventas}</td>
                  <td>{fmtBs(a.ingresos)}</td>
                  <td>{fmtBs(a.ticketPromedio)}</td>
                </tr>
              )}
            />
          </section>

          {/* --- ÚLTIMAS VENTAS (W5) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo"><FaShoppingCart aria-hidden="true" /> Últimas ventas</h3>
            <Tabla
              columnas={['Hora', 'Puesto', 'Ayudante', { texto: 'N.º entrada', align: 'center' }, 'Monto', { texto: 'Ítems', align: 'center' }, { texto: 'Acciones', srOnly: true }]}
              datos={data.ultimasVentas}
              vacio="Todavía no hay ventas en este evento."
              renderFila={(v) => (
                <tr key={v.id} className={v.anulada ? 'pi-ngd-fila-anulada' : ''}>
                  <td>{fmtHora(v.createdAt)}</td>
                  <td>{v.puesto}</td>
                  <td>{v.ayudante}</td>
                  <td style={{ textAlign: 'center' }}>{v.entradaNumero ?? '—'}</td>
                  <td>{fmtBs(v.monto)}</td>
                  <td style={{ textAlign: 'center' }}>{v.items}</td>
                  <td style={{ textAlign: 'right' }}>
                    {v.anulada
                      ? <span className="pi-ngd-badge-anulada">Anulada</span>
                      : (
                        <button type="button" className="pi-ngd-btn-anular" onClick={() => { setVentaAnular(v); setMotivoAnular(''); setErrAnular(''); }}>
                          <FaBan aria-hidden="true" /> Anular
                        </button>
                      )}
                  </td>
                </tr>
              )}
            />
          </section>
        </>
      )}

      {ventaAnular && (
        <Modal titulo="Anular venta" onCerrar={() => setVentaAnular(null)} tamano="sm">
          <div className="pi-ngd-form-anular">
            <p>
              Vas a anular una venta de <strong>{fmtBs(ventaAnular.monto)}</strong> ({ventaAnular.puesto},
              ayudante {ventaAnular.ayudante}). El saldo vuelve al comprador y se le descuenta a tu billetera.
            </p>
            <label htmlFor="ngd-motivo">Motivo</label>
            <textarea
              id="ngd-motivo"
              rows={2}
              placeholder="Ej: cobró 50 en vez de 5"
              value={motivoAnular}
              onChange={(e) => setMotivoAnular(e.target.value)}
              autoFocus
            />
            {errAnular && <p className="pi-ngd-err">{errAnular}</p>}
            <div className="pi-ngd-form-acciones">
              <button type="button" className="pi-ngd-btn-sec" onClick={() => setVentaAnular(null)} disabled={anulando}>Cancelar</button>
              <button
                type="button"
                className="pi-ngd-btn-anular pi-ngd-btn-anular--fuerte"
                onClick={confirmarAnular}
                disabled={anulando || motivoAnular.trim().length < 3}
              >
                <FaBan aria-hidden="true" /> Anular venta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Bar chart CSS: solo muestra el rango de horas con actividad para no apretar 24 barras.
function VentasPorHora({ data, animar }) {
  const conVentas = data.filter((h) => h.ventas > 0);
  if (conVentas.length === 0) {
    return <p className="pi-ngd-nota">Todavía no hay ventas registradas.</p>;
  }
  const desde = conVentas[0].hora;
  const hasta = conVentas[conVentas.length - 1].hora;
  const rango = data.slice(desde, hasta + 1);
  const max = Math.max(...rango.map((h) => h.ingresos), 1);

  return (
    <div className="pi-ngd-chart">
      {rango.map((h) => (
        <div key={h.hora} className="pi-ngd-bar-col">
          <span className="pi-ngd-bar-val">{h.ventas || ''}</span>
          <div className="pi-ngd-bar-track">
            <div
              className="pi-ngd-bar-grow"
              style={{ height: animar ? `${(h.ingresos / max) * 100}%` : 0 }}
              title={`${fmtHoraNum(h.hora)} — ${fmtBs(h.ingresos)} · ${h.ventas} ventas`}
            />
          </div>
          <span className="pi-ngd-bar-lbl">{fmtHoraNum(h.hora)}</span>
        </div>
      ))}
    </div>
  );
}
