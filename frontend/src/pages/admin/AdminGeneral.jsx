import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaFileInvoiceDollar, FaCalendarPlus, FaExclamationTriangle,
  FaUserEdit, FaCoins, FaWallet, FaTimesCircle, FaLayerGroup,
  FaExclamationCircle, FaCheckCircle, FaChevronRight,
  FaCircle, FaUsers, FaSignInAlt, FaSignOutAlt, FaBan, FaCashRegister, FaLock,
} from 'react-icons/fa';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import StatCard from '../../components/StatCard.jsx';
import {
  Tablero, FilaKpis, TileKpi, Panel, ListaRanking,
} from '../../components/Tablero.jsx';
import { variacionDe } from '../../utils/graficos.jsx';
import Tabla from '../../components/Tabla.jsx';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import SelectorRango from '../../components/SelectorRango.jsx';
import { rangoDe } from '../../utils/rangoFechas.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import Insignia from '../../components/Insignia.jsx';
import Boton from '../../components/Boton.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import {
  GraficoRecaudacionDiaria,
  GraficoComprasDiarias, GraficoIncidenciasRecargador,
} from './GraficosAdmin.jsx';
import './AdminGeneral.css';

// "hace 3 h 20 min" a partir del ISO del caso más viejo sin atender.
function antiguedad(iso) {
  if (!iso) return null;
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  if (h < 24) return resto ? `hace ${h} h ${resto} min` : `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d ${h % 24} h`;
}

// Semáforo de la bandeja de trabajo: verde <1 h, ámbar 1-4 h, rojo >4 h.
function tonoAntiguedad(iso, total) {
  if (!total || !iso) return 'neutral';
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h > 4) return 'danger';
  if (h >= 1) return 'warn';
  return 'ok';
}

const fmtPts = (n) => `${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })} pts`;
const fmtBs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const fmtPct = (frac) => `${(Number(frac || 0) * 100).toFixed(1)}%`;
const fmtFecha = (iso) => new Date(iso).toLocaleDateString('es-BO');

// segundos -> "3 h 20 min" / "45 min" / "2 d 4 h" / "—"
function fmtDuracion(seg) {
  if (seg == null) return '—';
  const min = Math.round(seg / 60);
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}

export default function AdminGeneral() {
  useTituloPagina('Dashboard general');
  const navigate = useNavigate();

  // Rango de fechas: solo acota los KPIs "del periodo" (recaudado, tasa de rechazo).
  const [rango, setRango] = useState('30d');

  const cargar = useCallback(
    () =>
      Promise.all([
        api.dashboard.adminPendientes(),
        api.dashboard.adminKpis(rangoDe(rango)),
        api.dashboard.adminEventos(),
        api.dashboard.adminAlertas(),
        api.dashboard.adminCortesCaja(),
        api.dashboard.adminEmbudo(),
        api.dashboard.adminRecaudacionDiaria(rangoDe(rango)),
        api.dashboard.adminPorEvento(rangoDe(rango)),
        api.dashboard.adminComprasDiarias(rangoDe(rango)),
        api.dashboard.adminIncidenciasRecargador(),
      ]).then(([pendientes, kpis, eventos, alertas, cortesCaja, embudo, recaudDiaria, porEvento, comprasDiarias, incidRecargador]) =>
        ({ pendientes, kpis, eventos, alertas, cortesCaja, embudo, recaudDiaria, porEvento, comprasDiarias, incidRecargador })),
    [rango],
  );
  const { data, cargando, error, recargar } = useApi(cargar, { inicial: null });

  // Operación en vivo (spec 1.4): se pollea sola cada 30 s; el resto del tablero NO.
  const [vivo, setVivo] = useState(null);
  useEffect(() => {
    let cancelado = false;
    const cargarVivo = () =>
      api.dashboard.adminVivo().then((v) => { if (!cancelado) setVivo(v); }).catch(() => {});
    cargarVivo();
    const id = setInterval(cargarVivo, 30000);
    return () => { cancelado = true; clearInterval(id); };
  }, []);

  return (
    <div className="pi-adg-container">
      <EncabezadoPagina titulo="Dashboard general" subtitulo="Todo el sistema, todos los eventos." icono={FaLayerGroup} />

      {vivo?.activo && vivo.eventos.map((ev) => <OperacionVivo key={ev.id} ev={ev} />)}

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando || !data ? (
        <EstadoCarga filas={8} />
      ) : (
        <>
          <Tablero>
            {/* --- BANDEJA DE TRABAJO (spec 1.1) --- */}
            <div className="qp-span-12 qp-tablero__cab">
              <h3>Bandeja de trabajo</h3>
            </div>
            <FilaKpis>
              {[
                {
                  clave: 'comprobantes',
                  label: 'Comprobantes por revisar',
                  icono: <FaFileInvoiceDollar />,
                  ir: () => navigate('/admin/eventos'),
                },
                {
                  clave: 'solicitudesEvento',
                  label: 'Solicitudes de evento',
                  icono: <FaCalendarPlus />,
                  ir: () => navigate('/admin/solicitudes-eventos'),
                },
                {
                  clave: 'incidenciasRecarga',
                  label: 'Incidencias de recarga',
                  icono: <FaExclamationTriangle />,
                  ir: () => navigate('/admin/reportes'),
                },
                {
                  clave: 'reportesDatos',
                  label: 'Reportes de datos',
                  icono: <FaUserEdit />,
                  ir: () => navigate('/admin/reportes'),
                },
              ].map(({ clave, label, icono, ir }) => {
                const caso = data.pendientes[clave] || { total: 0, masAntiguo: null };
                return (
                  <TileKpi
                    key={clave}
                    icon={icono}
                    tono={tonoAntiguedad(caso.masAntiguo, caso.total)}
                    valor={caso.total}
                    label={label}
                    nota={caso.total > 0 && caso.masAntiguo ? `el más viejo, ${antiguedad(caso.masAntiguo)}` : 'al día'}
                    onClick={ir}
                  />
                );
              })}
            </FilaKpis>

            {/* --- INDICADORES (spec 1.2) --- */}
            <div className="qp-span-12 qp-tablero__cab">
              <div>
                <h3>Indicadores</h3>
                {data.kpis.rango && (
                  <p>
                    Recaudado, rechazo y gráficos del {fmtFecha(data.kpis.rango.desde)} al {fmtFecha(data.kpis.rango.hasta)}.
                  </p>
                )}
              </div>
              <SelectorRango valor={rango} onCambio={setRango} />
            </div>
            <FilaKpis>
              <TileKpi
                icon={<FaCoins />}
                tono="ok"
                label="Recaudado por entradas"
                valor={fmtBs(data.kpis.recaudadoEntradas)}
                variacion={data.kpis.comparativa?.recaudadoEntradas.variacion}
                textoVariacion={data.kpis.comparativa ? `vs. ${fmtBs(data.kpis.comparativa.recaudadoEntradas.anterior)}` : undefined}
                serie={data.recaudDiaria?.puntos}
                serieKey="monto"
              />
              <TileKpi
                icon={<FaLayerGroup />}
                tono="total"
                label="Eventos en el sistema"
                valor={data.kpis.eventos.total}
                nota={`${data.kpis.eventos.publicados} publicados · ${data.kpis.eventos.borradores} borradores`}
              />
              <TileKpi
                icon={<FaWallet />}
                tono="info"
                label="Saldo cashless en circulación"
                valor={fmtPts(data.kpis.saldoCashlessCirculacion)}
                nota="pasivo, no es ganancia"
              />
              <TileKpi
                icon={<FaWallet />}
                tono={data.kpis.saldoCaducadoNoReclamado > 0 ? 'warn' : 'neutral'}
                label="Saldo caducado sin reclamar"
                valor={fmtPts(data.kpis.saldoCaducadoNoReclamado)}
                nota="venció el plazo de retiro"
              />
              <TileKpi
                icon={<FaTimesCircle />}
                tono={
                  data.kpis.tasaRechazoComprobantes > 0.2
                    ? 'danger'
                    : data.kpis.tasaRechazoComprobantes > 0.1
                      ? 'warn'
                      : 'neutral'
                }
                label="Rechazo de comprobantes"
                valor={fmtPct(data.kpis.tasaRechazoComprobantes)}
                variacion={data.kpis.comparativa && variacionDe(
                  data.kpis.comparativa.tasaRechazoComprobantes.actual,
                  data.kpis.comparativa.tasaRechazoComprobantes.anterior,
                )}
                textoVariacion={data.kpis.comparativa ? `antes ${fmtPct(data.kpis.comparativa.tasaRechazoComprobantes.anterior)}` : undefined}
                invertir
                nota={`${data.kpis.comprobantes.confirmadas} ok · ${data.kpis.comprobantes.rechazadas} rechazados`}
              />
              <TileKpi
                icon={<FaCheckCircle />}
                label="Tiempo mediano de aprobación"
                valor={fmtDuracion(data.kpis.tiempoAprobacion?.medianaSegundos)}
                nota={data.kpis.tiempoAprobacion?.p90Segundos != null
                  ? `p90: ${fmtDuracion(data.kpis.tiempoAprobacion.p90Segundos)}`
                  : undefined}
              />
            </FilaKpis>

            {/* --- ANÁLISIS (spec W1/W2/W4/W5) + ALERTAS (spec W7) --- */}
            <Panel span={8}>
              <GraficoRecaudacionDiaria data={data.recaudDiaria} />
            </Panel>

            <Panel
              span={4}
              icono={FaExclamationCircle}
              titulo="Alertas"
              acciones={data.alertas.length > 0 && <Insignia tono="danger" solida>{data.alertas.length}</Insignia>}
            >
              {data.alertas.length === 0 ? (
                <EstadoVacio compacto icono={FaCheckCircle} titulo="Sin alertas. Todo en orden." />
              ) : (
                <ul className="pi-adg-alertas">
                  {data.alertas.map((a, i) => {
                    const clickable = !!a.eventoId;
                    const contenido = (
                      <>
                        <FaExclamationCircle className="pi-adg-alerta-icono" aria-hidden="true" />
                        <span className="pi-adg-alerta-msg">{a.mensaje}</span>
                        {clickable && <FaChevronRight className="pi-adg-alerta-flecha" aria-hidden="true" />}
                      </>
                    );
                    // Clicable = <button> (antes <li onClick>: no se podía abrir con el teclado).
                    return (
                      <li key={`${a.tipo}-${a.eventoId || i}`}>
                        {clickable ? (
                          <button
                            type="button"
                            className={`pi-adg-alerta pi-adg-alerta--${a.nivel} pi-adg-alerta--click`}
                            onClick={() => navigate('/admin/eventos', { state: { eventoId: a.eventoId } })}
                          >
                            {contenido}
                          </button>
                        ) : (
                          <div className={`pi-adg-alerta pi-adg-alerta--${a.nivel}`}>{contenido}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel span={4} icono={FaCoins} titulo="Recaudación por evento" subtitulo="Top 10 del periodo.">
              <ListaRanking
                ranking
                vacio="Sin recaudación en el periodo."
                items={(data.porEvento ?? []).map((f) => ({
                  id: f.eventoId,
                  titulo: f.nombre,
                  valor: fmtBs(f.recaudado),
                  onClick: () => navigate('/admin', { state: { eventoId: f.eventoId } }),
                }))}
              />
            </Panel>

            <Panel span={8}>
              <GraficoComprasDiarias data={data.comprasDiarias} />
            </Panel>

            <Panel span={6}>
              <GraficoIncidenciasRecargador data={data.incidRecargador} />
            </Panel>

            {/* --- EMBUDO — CICLO DE VIDA (spec W3) --- */}
            <Panel span={6} icono={FaLayerGroup} titulo="Ciclo de vida de eventos">
              <Embudo etapas={data.embudo.etapas} />
              {data.embudo.eventosDirectos > 0 && (
                <p className="pi-adg-nota-rango">
                  {data.embudo.eventosDirectos} evento(s) creados directo por Admin no entran en el embudo.
                </p>
              )}
            </Panel>

            {/* --- TODOS LOS EVENTOS (spec W6) --- */}
            <Panel span={12} icono={FaLayerGroup} titulo="Todos los eventos" subtitulo="Tocá un evento para abrir su panel.">
              <Tabla
                columnas={[
                  'Evento', 'Fecha', 'Estado', 'Vendidas / Cupo', 'Ocupación',
                  'Recaudado', 'Recargado', 'Consumido', 'Saldo remanente', 'Pendientes',
                ]}
                datos={data.eventos}
                vacio="Todavía no hay eventos en el sistema."
                renderFila={(ev) => (
                  <tr
                    key={ev.id}
                    className="pi-adg-fila"
                    onClick={() => navigate('/admin', { state: { eventoId: ev.id } })}
                  >
                    <td>
                      {/* El nombre es el botón (teclado); la fila entera sigue respondiendo al mouse. */}
                      <Boton
                        variante="fantasma"
                        tamano="sm"
                        className="pi-adg-ev-nombre"
                        onClick={(e) => { e.stopPropagation(); navigate('/admin', { state: { eventoId: ev.id } }); }}
                      >
                        {ev.nombre}
                      </Boton>
                      {!ev.publicado && <Insignia tono="warn">Borrador</Insignia>}
                    </td>
                    <td>{fmtFecha(ev.fecha)}</td>
                    <td>
                      <BadgeEstadoEvento evento={ev} />
                      {ev.congelado && <FaLock className="pi-adg-lock" title="Cifras de cierre congeladas" aria-hidden="true" />}
                    </td>
                    <td>{ev.vendidas} / {ev.cupo || '—'}</td>
                    <td>
                      <div className="pi-adg-bar" aria-hidden="true">
                        <div className="pi-adg-bar-fill" style={{ width: `${Math.min(100, Math.round(ev.ocupacion * 100))}%` }} />
                      </div>
                      <span className="pi-adg-bar-txt">{Math.round(ev.ocupacion * 100)}%</span>
                    </td>
                    <td>{fmtBs(ev.recaudado)}</td>
                    <td>{fmtPts(ev.recargado)}</td>
                    <td>{fmtPts(ev.consumido)}</td>
                    <td>{fmtPts(ev.saldoRemanente)}</td>
                    <td>
                      {ev.pendientes > 0
                        ? <Insignia tono="warn" solida>{ev.pendientes}</Insignia>
                        : <Insignia tono="ok">0</Insignia>}
                    </td>
                  </tr>
                )}
              />
            </Panel>

            {/* --- ARQUEO DE CAJA (spec 5.2) --- */}
            <Panel
              span={12}
              icono={FaCashRegister}
              titulo="Arqueo de caja"
              acciones={data.cortesCaja.resumen.conDescuadre > 0 && (
                <Insignia tono="danger" solida>{data.cortesCaja.resumen.conDescuadre} con descuadre</Insignia>
              )}
            >
              <div className="qp-stats">
                <StatCard icon={<FaCashRegister />} valor={data.cortesCaja.resumen.abiertas} label="Cajas abiertas ahora" />
                <StatCard
                  icon={<FaExclamationTriangle />}
                  tono={data.cortesCaja.resumen.conDescuadre > 0 ? 'danger' : 'ok'}
                  valor={data.cortesCaja.resumen.conDescuadre}
                  label="Cierres con descuadre"
                />
                <StatCard icon={<FaCoins />} tono="warn" valor={fmtBs(data.cortesCaja.resumen.descuadreTotal)} label="Descuadre acumulado" />
              </div>
              <Tabla
                columnas={['Evento', 'Operador', 'Rol', 'Estado', 'Sistema', 'Esperado', 'Declarado', 'Diferencia']}
                datos={data.cortesCaja.cortes}
                vacio="Todavía no hay arqueos de caja."
                renderFila={(c) => (
                  <tr key={c.id} className={c.diferencia != null && c.diferencia !== 0 ? 'pi-adg-fila-descuadre' : ''}>
                    <td>{c.evento}</td>
                    <td>{c.operador}</td>
                    <td>{c.rol}</td>
                    <td>{c.estado === 'cerrada' ? <Insignia tono="neutro">Cerrada</Insignia> : <Insignia tono="ok" punto latido>Abierta</Insignia>}</td>
                    <td>{c.montoSistema == null ? '—' : fmtBs(c.montoSistema)}</td>
                    <td>{c.montoEsperado == null ? '—' : fmtBs(c.montoEsperado)}</td>
                    <td>{c.montoDeclarado == null ? '—' : fmtBs(c.montoDeclarado)}</td>
                    <td>
                      {c.diferencia == null ? '—' : (
                        <Insignia tono={c.diferencia === 0 ? 'ok' : 'danger'}>
                          {c.diferencia > 0 ? '+' : ''}{fmtBs(c.diferencia)}
                        </Insignia>
                      )}
                    </td>
                  </tr>
                )}
              />
            </Panel>
          </Tablero>
        </>
      )}
    </div>
  );
}

// Embudo (spec W3): barras horizontales decrecientes + % de conversión entre etapas.
function Embudo({ etapas }) {
  const max = Math.max(1, etapas[0]?.total ?? 0);
  return (
    <div className="pi-adg-embudo">
      {etapas.map((e, i) => {
        const prev = i > 0 ? etapas[i - 1].total : null;
        const conv = prev ? Math.round((e.total / prev) * 100) : null;
        return (
          <div className="pi-adg-embudo-fila" key={e.clave}>
            <span className="pi-adg-embudo-label">{e.label}</span>
            <div className="pi-adg-embudo-barra">
              <div
                className="pi-adg-embudo-relleno"
                style={{ width: `${Math.max(2, (e.total / max) * 100)}%` }}
              />
            </div>
            <span className="pi-adg-embudo-num">
              {e.total}
              {conv != null && <em className={conv < 60 ? 'baja' : ''}> · {conv}%</em>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Mini barras de dos tonos (a = cian abajo, b = coral arriba). Sin librería.
function MiniBarras({ datos, aKey, bKey }) {
  const max = Math.max(1, ...datos.map((d) => d[aKey] + d[bKey]));
  return (
    <div className="pi-adg-spark">
      {datos.map((d, i) => (
        <div className="pi-adg-spark-col" key={i} title={`${aKey}: ${Math.round(d[aKey])} · ${bKey}: ${Math.round(d[bKey])}`}>
          <div className="pi-adg-spark-b" style={{ height: `${(d[bKey] / max) * 100}%` }} />
          <div className="pi-adg-spark-a" style={{ height: `${(d[aKey] / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

// Tarjeta de "Operación en vivo" de un evento en curso (spec 1.4).
function OperacionVivo({ ev }) {
  const ingresos60 = ev.ingresosSalidasPorMinuto.reduce((s, m) => s + m.ingresos, 0);
  const salidas60 = ev.ingresosSalidasPorMinuto.reduce((s, m) => s + m.salidas, 0);
  return (
    <section className="pi-adg-seccion pi-adg-vivo">
      <h3 className="pi-adg-seccion-titulo">
        <FaCircle className="pi-adg-vivo-dot" aria-hidden="true" /> En vivo · {ev.nombre}
      </h3>

      <div className="qp-stats">
        <StatCard icon={<FaUsers />} tono="info" valor={ev.personasDentro} label="Personas dentro ahora" />
        <StatCard icon={<FaSignInAlt />} tono="ok" valor={ingresos60} label="Ingresos últimos 60 min" />
        <StatCard icon={<FaSignOutAlt />} tono="warn" valor={salidas60} label="Salidas últimos 60 min" />
      </div>

      <div className="pi-adg-vivo-cols">
        <div>
          <h4 className="pi-adg-vivo-sub"><FaSignInAlt aria-hidden="true" /> Ingresos / salidas por minuto (última hora)</h4>
          <MiniBarras datos={ev.ingresosSalidasPorMinuto} aKey="ingresos" bKey="salidas" />
        </div>
        <div>
          <h4 className="pi-adg-vivo-sub"><FaCoins aria-hidden="true" /> Recargas / consumos por hora del evento</h4>
          <MiniBarras datos={ev.recargasConsumosPorHora} aKey="recargas" bKey="consumos" />
        </div>
      </div>

      <div className="pi-adg-vivo-cols">
        <div>
          <h4 className="pi-adg-vivo-sub"><FaCashRegister aria-hidden="true" /> Cuadre por recargador (en vivo)</h4>
          <Tabla
            columnas={['Recargador', 'Recargado']}
            datos={ev.cuadreRecargadores}
            porPagina={0}
            vacio="Todavía no hay recargas."
            renderFila={(r) => (
              <tr key={r.nombre}>
                <td>{r.nombre}</td>
                <td>{fmtPts(r.total)}</td>
              </tr>
            )}
          />
        </div>
        <div>
          <h4 className="pi-adg-vivo-sub"><FaBan aria-hidden="true" /> Últimos QR anulados</h4>
          {ev.ultimosQrAnulados.length === 0 ? (
            <EstadoVacio compacto icono={FaCheckCircle} titulo="Ninguno" />
          ) : (
            <ul className="pi-adg-vivo-qr">
              {ev.ultimosQrAnulados.map((q, i) => (
                <li key={i}>
                  <code>{q.codigo}</code>
                  <span>{q.motivo || 'sin motivo'}</span>
                  <time>{q.hora ? new Date(q.hora).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : ''}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
