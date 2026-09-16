import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaDollarSign, FaShoppingCart, FaReceipt, FaWallet,
  FaStore, FaClock, FaTrophy, FaUsers, FaBan, FaBoxes, FaUserFriends,
} from 'react-icons/fa';
import DetalleVentaModal from '../../components/DetalleVentaModal.jsx';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
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
import AvisosStockPanel from '../../components/AvisosStockPanel.jsx';
import { rangoDe } from '../../utils/rangoFechas.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { generarDataUrlQr } from '../../utils/qrPdf';
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

// QR del código de retiro, renderizado localmente.
function QrRetiro({ codigo }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let vivo = true;
    generarDataUrlQr({ codigo, ancho: 180, alto: 180 }).then((u) => { if (vivo) setUrl(u); });
    return () => { vivo = false; };
  }, [codigo]);
  return url
    ? <img src={url} alt={codigo} width={180} height={180} className="pi-ngd-retiro-qr" />
    : <div className="pi-ngd-retiro-qr pi-ngd-retiro-qr-cargando" />;
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

  // Código de retiro: se presenta en Devoluciones para cobrar las ganancias del evento.
  const cargarCodigoRetiro = useCallback(
    () => api.codigosRetiroNegocio.mio(eventoId),
    [eventoId],
  );
  const { data: codigoRetiro } = useApi(cargarCodigoRetiro, { inicial: null, activo: !!eventoId });

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

  const [ventaDetalle, setVentaDetalle] = useState(null);

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
      <div className="qp-nav">
        <BotonVolver onClick={volverALista}>Cambiar de evento</BotonVolver>
        <Migas
          items={[
            { texto: 'Eventos', onClick: volverALista },
            { texto: eventoSeleccionado.nombre, actual: true },
          ]}
        />
      </div>
      <div className="pi-ngd-header">
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
          <AvisosStockPanel />

          {/* --- RESUMEN (§3.1) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo">Resumen del evento</h3>
            <div className="pi-ngd-grid">
              <StatCard
                icon={<FaDollarSign />}
                tono="ok"
                valor={fmtBs(data.resumen.ingresoTotal)}
                label="Ventas del evento"
                nota={data.resumen.anuladas?.cantidad > 0
                  ? `${data.resumen.anuladas.cantidad} anuladas (${fmtBs(data.resumen.anuladas.monto)})`
                  : undefined}
                extra={<ChipVar par={data.resumen.comparativa?.ingresoTotal} />}
              />
              <StatCard
                icon={<FaShoppingCart />}
                tono="total"
                valor={data.resumen.totalVentas}
                label="N.º de ventas"
                extra={<ChipVar par={data.resumen.comparativa?.totalVentas} />}
              />
              <StatCard
                icon={<FaBoxes />}
                tono="info"
                valor={data.resumen.unidadesTotales ?? 0}
                label="Unidades vendidas"
                nota={data.topProductos[0] ? `más vendido: ${data.topProductos[0].nombre}` : undefined}
              />
              <StatCard
                icon={<FaUserFriends />}
                valor={data.resumen.clientesUnicos ?? 0}
                label="Clientes que compraron"
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
                nota="debe coincidir con ventas"
              />
              <StatCard
                icon={<FaWallet />}
                valor={fmtBs(data.resumen.saldoBilletera)}
                label="Saldo en mi billetera (este evento)"
                nota="lo que aún no retiraste"
              />
            </div>
          </section>

          {/* --- CÓDIGO DE RETIRO --- */}
          {codigoRetiro?.codigo && (
            <section className="pi-ngd-seccion pi-ngd-retiro">
              <h3 className="pi-ngd-seccion-titulo"><FaWallet aria-hidden="true" /> Código de retiro</h3>
              <div className="pi-ngd-retiro-cuerpo">
                <QrRetiro codigo={codigoRetiro.codigo} />
                <div>
                  <p className="pi-ngd-retiro-codigo">{codigoRetiro.codigo}</p>
                  {data.resumen.saldoBilletera > 0 ? (
                    <p>
                      Presentá este código en el puesto de <strong>Devoluciones</strong> para
                      retirar tus ganancias de este evento
                      {' '}(<strong>{fmtBs(data.resumen.saldoBilletera)}</strong> disponibles).
                    </p>
                  ) : (
                    <p>Todavía no tenés saldo para retirar en este evento.</p>
                  )}
                  <p className="pi-ngd-nota">
                    En Devoluciones te van a pedir tu carnet y una foto de tu cara: nadie más
                    puede cobrar con este código.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* --- VENTAS POR HORA (W1) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo"><FaClock aria-hidden="true" /> Ventas por hora</h3>
            <VentasPorHora data={data.ventasPorHora} animar={animar} />
          </section>

          {/* --- TOP PRODUCTOS (W2) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo"><FaTrophy aria-hidden="true" /> Productos más vendidos</h3>
            <Tabla
              columnas={['#', 'Producto', 'Unidades vendidas', { texto: '% de unidades', align: 'center' }, 'Ingresos']}
              datos={data.topProductos}
              vacio="Todavía no hay ventas con productos."
              renderFila={(p, i) => {
                const max = data.topProductos[0]?.unidades || 1;
                return (
                  <tr key={p.nombre}>
                    <td><span className={`pi-ngd-rank${i < 3 ? ` pi-ngd-rank--${i + 1}` : ''}`}>{i + 1}</span></td>
                    <td><strong>{p.nombre}</strong></td>
                    <td>
                      <div className="pi-ngd-bar" aria-hidden="true">
                        <div className="pi-ngd-bar-fill" style={{ width: `${Math.round((p.unidades / max) * 100)}%` }} />
                      </div>
                      <span className="pi-ngd-bar-txt">{p.unidades} u.</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{((p.pctUnidades ?? 0) * 100).toFixed(1)}%</td>
                    <td>{fmtBs(p.ingresos)}</td>
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
                columnas={['Puesto', { texto: 'Ventas', align: 'center' }, { texto: 'Unidades', align: 'center' }, 'Producto estrella', 'Ingresos']}
                datos={data.porPuesto}
                vacio="Sin datos."
                renderFila={(p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{p.ventas}</td>
                    <td style={{ textAlign: 'center' }}>{p.unidades ?? 0}</td>
                    <td>{p.productoTop ? `${p.productoTop} (${p.productoTopUnidades} u.)` : '—'}</td>
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
              columnas={['#', 'Ayudante', { texto: 'Ventas', align: 'center' }, { texto: 'Unidades', align: 'center' }, 'Lo que más vende', 'Ingresos', 'Ticket promedio']}
              datos={data.porAyudante}
              vacio="Todavía no hay ventas."
              renderFila={(a, i) => (
                <tr key={a.id}>
                  <td><span className={`pi-ngd-rank${i < 3 ? ` pi-ngd-rank--${i + 1}` : ''}`}>{i + 1}</span></td>
                  <td><strong>{a.nombre}</strong></td>
                  <td style={{ textAlign: 'center' }}>{a.ventas}</td>
                  <td style={{ textAlign: 'center' }}>{a.unidades ?? 0}</td>
                  <td>{a.productoTop ? `${a.productoTop} (${a.productoTopUnidades} u.)` : '—'}</td>
                  <td>{fmtBs(a.ingresos)}</td>
                  <td>{fmtBs(a.ticketPromedio)}</td>
                </tr>
              )}
            />
          </section>

          {/* --- MEJORES CLIENTES --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo"><FaUserFriends aria-hidden="true" /> Clientes que más compran</h3>
            <Tabla
              columnas={['#', 'Cliente', { texto: 'N.º entrada', align: 'center' }, { texto: 'Compras', align: 'center' }, { texto: 'Unidades', align: 'center' }, 'Gastado']}
              datos={data.topClientes ?? []}
              vacio="Todavía no hay ventas."
              renderFila={(c, i) => (
                <tr key={c.id}>
                  <td><span className={`pi-ngd-rank${i < 3 ? ` pi-ngd-rank--${i + 1}` : ''}`}>{i + 1}</span></td>
                  <td>{c.nombre}</td>
                  <td style={{ textAlign: 'center' }}>{c.numero ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>{c.compras}</td>
                  <td style={{ textAlign: 'center' }}>{c.unidades}</td>
                  <td>{fmtBs(c.gastado)}</td>
                </tr>
              )}
            />
          </section>

          {/* --- ÚLTIMAS VENTAS (W5) --- */}
          <section className="pi-ngd-seccion">
            <h3 className="pi-ngd-seccion-titulo"><FaShoppingCart aria-hidden="true" /> Últimas ventas</h3>
            <Tabla
              columnas={['Hora', 'Puesto', 'Ayudante', { texto: 'N.º entrada', align: 'center' }, 'Productos', 'Monto', { texto: 'Acciones', srOnly: true }]}
              datos={data.ultimasVentas}
              vacio="Todavía no hay ventas en este evento."
              renderFila={(v) => (
                <tr key={v.id} className={`pi-ngd-fila-venta${v.anulada ? ' pi-ngd-fila-anulada' : ''}`} onClick={() => setVentaDetalle(v)}>
                  <td>{fmtHora(v.createdAt)}</td>
                  <td>{v.puesto}</td>
                  <td>{v.ayudante}</td>
                  <td style={{ textAlign: 'center' }}>{v.entradaNumero ?? '—'}</td>
                  <td>
                    <ul className="pi-ngd-items-lista">
                      {(v.detalle ?? []).map((it, idx) => (
                        <li key={idx}><strong>{it.cantidad}×</strong> {it.nombreProducto}</li>
                      ))}
                    </ul>
                  </td>
                  <td>{fmtBs(v.monto)}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn-secundario-sm" onClick={() => setVentaDetalle(v)}>
                      Ver detalle
                    </button>{' '}
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

      {ventaDetalle && (
        <DetalleVentaModal
          fmt={fmtBs}
          venta={{
            fecha: ventaDetalle.createdAt,
            cliente: ventaDetalle.cliente,
            documento: ventaDetalle.entradaNumero != null ? `Entrada N.º ${ventaDetalle.entradaNumero}` : null,
            puesto: ventaDetalle.puesto,
            ayudante: ventaDetalle.ayudante,
            anulada: ventaDetalle.anulada,
            motivoAnulacion: ventaDetalle.motivoAnulacion,
            monto: ventaDetalle.monto,
            items: ventaDetalle.detalle,
          }}
          onCerrar={() => setVentaDetalle(null)}
          acciones={!ventaDetalle.anulada && (
            <button
              type="button"
              className="pi-ngd-btn-anular"
              onClick={() => { setVentaAnular(ventaDetalle); setVentaDetalle(null); setMotivoAnular(''); setErrAnular(''); }}
            >
              <FaBan aria-hidden="true" /> Anular venta
            </button>
          )}
        />
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
