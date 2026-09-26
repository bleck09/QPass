import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaDollarSign, FaShoppingCart, FaReceipt, FaWallet,
  FaStore, FaClock, FaTrophy, FaUsers, FaBan, FaBoxes, FaUserFriends, FaChartLine, FaCalendarTimes,
} from 'react-icons/fa';
import DetalleVentaModal from '../../components/DetalleVentaModal.jsx';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import {
  Tablero, FilaKpis, TileKpi, Panel, BarrasDestacadas, DonaLeyenda, ListaRanking, BarraMeta,
} from '../../components/Tablero.jsx';
import { variacionDe } from '../../utils/graficos.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Modal from '../../components/Modal.jsx';
import SelectorRango from '../../components/SelectorRango.jsx';
import AvisosStockPanel from '../../components/AvisosStockPanel.jsx';
import { rangoDe } from '../../utils/rangoFechas.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import Boton from '../../components/Boton.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import Campo from '../../components/Campo.jsx';
import Insignia from '../../components/Insignia.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { generarDataUrlQr } from '../../utils/qrPdf';
import './UsuNegoDasboar.css';

const fmtBs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const fmtHoraNum = (h) => `${String(h).padStart(2, '0')}:00`;
const fmtHora = (iso) => new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

// Variación de un par { actual, anterior, variacion? } del payload (W6,
// comparación §1.2 #1). Sin par o sin base previa -> null (no hay chip).
function varDe(par) {
  if (!par) return null;
  return par.variacion != null ? par.variacion : variacionDe(par.actual, par.anterior);
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

  const volverALista = () => setEventoSeleccionado(null);

  const [ventaDetalle, setVentaDetalle] = useState(null);

  // Anulación de venta (§5.3)
  const [ventaAnular, setVentaAnular] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [errAnular, setErrAnular] = useState('');
  const [intentoAnular, setIntentoAnular] = useState(false);
  const avisos = useAvisos();
  const confirmarAnular = async (e) => {
    e?.preventDefault();
    setIntentoAnular(true);
    if (motivoAnular.trim().length < 3) return document.getElementById('ngd-motivo')?.focus();
    setAnulando(true);
    setErrAnular('');
    try {
      await api.ventas.anular(ventaAnular.id, motivoAnular.trim());
      avisos.exito('El saldo volvió al comprador y se descontó de tu billetera.', { titulo: 'Venta anulada' });
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
        <EncabezadoPagina
          titulo="Dashboard de negocio"
          subtitulo="Elegí el evento del que querés ver el resumen."
          icono={FaChartLine}
        />
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <EstadoVacio
            icono={FaCalendarTimes}
            titulo="Todavía no tenés ningún evento asignado"
            mensaje="Pedile a Admin que te asigne uno para ver tus ventas."
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
  // Ventas por hora: solo el tramo con actividad (24 barras no entran).
  const conVentas = data ? data.ventasPorHora.filter((h) => h.ventas > 0) : [];
  const horasActivas = conVentas.length
    ? data.ventasPorHora.slice(conVentas[0].hora, conVentas[conVentas.length - 1].hora + 1)
    : [];
  const horaPico = conVentas.reduce((m, h) => (!m || h.ingresos > m.ingresos ? h : m), null);
  const hayCategorias = data?.ventasPorCategoria?.length > 1 ||
    (data?.ventasPorCategoria?.length === 1 && data.ventasPorCategoria[0].categoria !== 'Sin categoría');

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
      <EncabezadoPagina
        titulo={eventoSeleccionado.nombre}
        subtitulo="Resumen de tus puestos y ventas en este evento."
        icono={FaChartLine}
        acciones={<SelectorRango valor={rango} onCambio={setRango} />}
      />

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando || !data ? (
        <EstadoCarga filas={8} />
      ) : data.resumen.puestos === 0 ? (
        <EstadoVacio icono={FaStore} titulo="No tenés puestos en este evento" mensaje="Activá uno desde Mis puestos para ver sus ventas acá." />
      ) : (
        <>
          <AvisosStockPanel />

          <Tablero>
            {/* --- KPIs (§3.1) --- */}
            <FilaKpis>
              <TileKpi
                icon={<FaDollarSign />}
                tono="ok"
                label="Ventas del evento"
                valor={fmtBs(data.resumen.ingresoTotal)}
                variacion={varDe(data.resumen.comparativa?.ingresoTotal)}
                nota={data.resumen.anuladas?.cantidad > 0
                  ? `${data.resumen.anuladas.cantidad} anuladas (${fmtBs(data.resumen.anuladas.monto)})`
                  : undefined}
                serie={horasActivas}
                serieKey="ingresos"
              />
              <TileKpi
                icon={<FaShoppingCart />}
                tono="total"
                label="N.º de ventas"
                valor={data.resumen.totalVentas}
                variacion={varDe(data.resumen.comparativa?.totalVentas)}
                serie={horasActivas}
                serieKey="ventas"
              />
              <TileKpi
                icon={<FaReceipt />}
                tono="info"
                label="Ticket promedio"
                valor={fmtBs(data.resumen.ticketPromedio)}
                variacion={varDe(data.resumen.comparativa?.ticketPromedio)}
              />
              <TileKpi
                icon={<FaUserFriends />}
                label="Clientes que compraron"
                valor={data.resumen.clientesUnicos ?? 0}
                nota={`${data.resumen.unidadesTotales ?? 0} unidades vendidas`}
              />
            </FilaKpis>

            {/* --- VENTAS POR HORA (W1) --- */}
            <Panel
              span={8}
              icono={FaClock}
              titulo="Ventas por hora"
              subtitulo={horaPico ? `Hora pico: ${fmtHoraNum(horaPico.hora)} · ${fmtBs(horaPico.ingresos)}` : undefined}
              vacio="Todavía no hay ventas registradas."
              tabla={{
                columnas: ['Hora', { texto: 'Ventas', align: 'center' }, 'Ingresos'],
                datos: horasActivas,
                renderFila: (h) => (
                  <tr key={h.hora}>
                    <td>{fmtHoraNum(h.hora)}</td>
                    <td className="td-centro">{h.ventas}</td>
                    <td>{fmtBs(h.ingresos)}</td>
                  </tr>
                ),
              }}
            >
              <BarrasDestacadas
                datos={horasActivas}
                xKey="hora"
                yKey="ingresos"
                nombre="Ingresos"
                fmtX={fmtHoraNum}
                fmtValor={fmtBs}
              />
            </Panel>

            {/* --- BILLETERA + CÓDIGO DE RETIRO --- */}
            <Panel span={4} icono={FaWallet} titulo="Mi billetera" subtitulo="Solo lo de este evento.">
              <div className="qp-tablero-panel__hero">
                <strong>{fmtBs(data.resumen.saldoBilletera)}</strong>
                <span>por retirar</span>
              </div>
              <BarraMeta
                tono="info"
                label="Acreditado vs. ventas"
                detalle={`${fmtBs(data.resumen.acreditadoBilletera)} / ${fmtBs(data.resumen.ingresoTotal)}`}
                pct={data.resumen.ingresoTotal > 0 ? (data.resumen.acreditadoBilletera / data.resumen.ingresoTotal) * 100 : 0}
              />
              {codigoRetiro?.codigo && (
                <div className="pi-ngd-retiro-cuerpo">
                  <QrRetiro codigo={codigoRetiro.codigo} />
                  <div>
                    <p className="pi-ngd-retiro-codigo">{codigoRetiro.codigo}</p>
                    <p className="pi-ngd-nota">
                      {data.resumen.saldoBilletera > 0
                        ? 'Presentá este código en Devoluciones para retirar tus ganancias. Te van a pedir tu carnet y una foto de tu cara.'
                        : 'Todavía no tenés saldo para retirar en este evento.'}
                    </p>
                  </div>
                </div>
              )}
            </Panel>

            {/* --- TOP PRODUCTOS (W2) --- */}
            <Panel span={4} icono={FaTrophy} titulo="Productos más vendidos">
              <ListaRanking
                ranking
                vacio="Todavía no hay ventas con productos."
                items={data.topProductos.map((p) => ({
                  id: p.nombre,
                  titulo: p.nombre,
                  sub: `${((p.pctUnidades ?? 0) * 100).toFixed(1)}% de las unidades`,
                  valor: `${p.unidades} u.`,
                  valorSub: fmtBs(p.ingresos),
                }))}
              />
            </Panel>

            {/* --- POR AYUDANTE (W4) --- */}
            <Panel span={4} icono={FaUsers} titulo="Ventas por ayudante">
              <ListaRanking
                ranking
                vacio="Todavía no hay ventas."
                items={data.porAyudante.map((a) => ({
                  id: a.id,
                  titulo: a.nombre,
                  sub: `${a.ventas} ventas · ${a.productoTop ? `más vende ${a.productoTop}` : 'sin productos'}`,
                  valor: fmtBs(a.ingresos),
                  valorSub: `ticket ${fmtBs(a.ticketPromedio)}`,
                }))}
              />
            </Panel>

            {/* --- MEJORES CLIENTES --- */}
            <Panel span={4} icono={FaUserFriends} titulo="Clientes que más compran">
              <ListaRanking
                ranking
                vacio="Todavía no hay ventas."
                items={(data.topClientes ?? []).map((c) => ({
                  id: c.id,
                  titulo: c.nombre,
                  sub: `Entrada N.º ${c.numero ?? '—'} · ${c.compras} compras`,
                  valor: fmtBs(c.gastado),
                  valorSub: `${c.unidades} u.`,
                }))}
              />
            </Panel>

            {/* --- POR CATEGORÍA DE PRODUCTO (§5.11) — solo si hay categorías cargadas --- */}
            {hayCategorias && (
              <Panel span={data.porPuesto.length > 1 ? 5 : 12} icono={FaBoxes} titulo="Ventas por categoría">
                <DonaLeyenda
                  datos={data.ventasPorCategoria.map((c) => ({ nombre: c.categoria, valor: c.ingresos }))}
                  fmt={fmtBs}
                  centroLabel="vendido"
                />
              </Panel>
            )}

            {/* --- POR PUESTO (W3) — solo si hay más de uno --- */}
            {data.porPuesto.length > 1 && (
              <Panel span={hayCategorias ? 7 : 12} icono={FaStore} titulo="Ventas por puesto">
                <Tabla
                  columnas={['Puesto', { texto: 'Ventas', align: 'center' }, { texto: 'Unidades', align: 'center' }, 'Producto estrella', 'Ingresos']}
                  datos={data.porPuesto}
                  porPagina={0}
                  vacio="Sin datos."
                  renderFila={(p) => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td className="td-centro">{p.ventas}</td>
                      <td className="td-centro">{p.unidades ?? 0}</td>
                      <td>{p.productoTop ? `${p.productoTop} (${p.productoTopUnidades} u.)` : '—'}</td>
                      <td>{fmtBs(p.ingresos)}</td>
                    </tr>
                  )}
                />
              </Panel>
            )}
            {/* --- ÚLTIMAS VENTAS (W5) --- */}
            <Panel span={12} icono={FaShoppingCart} titulo="Últimas ventas" subtitulo="Tocá una fila para ver el detalle o anularla.">
            <Tabla
              columnas={['Hora', 'Puesto', 'Ayudante', { texto: 'N.º entrada', align: 'center' }, 'Productos', 'Monto', { texto: 'Acciones', srOnly: true }]}
              datos={data.ultimasVentas}
              vacio="Todavía no hay ventas en este evento."
              renderFila={(v) => (
                <tr key={v.id} className={`pi-ngd-fila-venta${v.anulada ? ' pi-ngd-fila-anulada' : ''}`} onClick={() => setVentaDetalle(v)}>
                  <td>{fmtHora(v.createdAt)}</td>
                  <td>{v.puesto}</td>
                  <td>{v.ayudante}</td>
                  <td className="td-centro">{v.entradaNumero ?? '—'}</td>
                  <td>
                    <ul className="pi-ngd-items-lista">
                      {(v.detalle ?? []).map((it, idx) => (
                        <li key={idx}><strong>{it.cantidad}×</strong> {it.nombreProducto}</li>
                      ))}
                    </ul>
                  </td>
                  <td>{fmtBs(v.monto)}</td>
                  <td className="td-derecha" onClick={(e) => e.stopPropagation()}>
                    <div className="btn-acciones">
                      <Boton variante="secundario" tamano="sm" onClick={() => setVentaDetalle(v)}>Ver detalle</Boton>
                      {v.anulada
                        ? <Insignia tono="danger" icono={FaBan}>Anulada</Insignia>
                        : (
                          <Boton variante="peligro-suave" tamano="sm" icono={FaBan} onClick={() => { setVentaAnular(v); setMotivoAnular(''); setErrAnular(''); setIntentoAnular(false); }}>
                            Anular
                          </Boton>
                        )}
                    </div>
                  </td>
                </tr>
              )}
            />
            </Panel>
          </Tablero>
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
            <Boton
              variante="peligro-suave"
              icono={FaBan}
              onClick={() => { setVentaAnular(ventaDetalle); setVentaDetalle(null); setMotivoAnular(''); setErrAnular(''); setIntentoAnular(false); }}
            >
              Anular venta
            </Boton>
          )}
        />
      )}

      {ventaAnular && (
        <Modal titulo="Anular venta" onCerrar={() => setVentaAnular(null)} tamano="sm">
          <form className="formulario" onSubmit={confirmarAnular} noValidate>
            <p className="texto-ayuda">
              Vas a anular una venta de <strong>{fmtBs(ventaAnular.monto)}</strong> ({ventaAnular.puesto},
              ayudante {ventaAnular.ayudante}). El saldo vuelve al comprador y se le descuenta a tu billetera.
            </p>
            <Campo
              id="ngd-motivo" etiqueta="Motivo"
              error={intentoAnular && motivoAnular.trim().length < 3 ? 'Contá brevemente por qué (al menos 3 letras).' : null}
            >
              <textarea
                id="ngd-motivo"
                rows={2}
                placeholder="Ej: cobró 50 en vez de 5"
                value={motivoAnular}
                onChange={(e) => setMotivoAnular(e.target.value)}
                aria-invalid={intentoAnular && motivoAnular.trim().length < 3}
                aria-describedby={intentoAnular && motivoAnular.trim().length < 3 ? 'ngd-motivo-error' : undefined}
                autoFocus
              />
            </Campo>
            {errAnular && <AvisoFijo tono="error">{errAnular}</AvisoFijo>}
            <div className="modal-actions">
              <Boton variante="secundario" onClick={() => setVentaAnular(null)} disabled={anulando}>Cancelar</Boton>
              <Boton type="submit" variante="peligro" icono={FaBan} cargando={anulando}>Anular venta</Boton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
