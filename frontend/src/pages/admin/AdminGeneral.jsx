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
import Tabla from '../../components/Tabla.jsx';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import SelectorRango from '../../components/SelectorRango.jsx';
import { rangoDe } from '../../utils/rangoFechas.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import Insignia from '../../components/Insignia.jsx';
import Boton from '../../components/Boton.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import {
  GraficoRecaudacionDiaria, GraficoPorEvento,
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

// Chip compacto "▲ 12.3%" para las comparaciones §1.2 #1 (el detalle va en el
// title). `variacion` null -> no hay base previa, no se muestra nada.
function ChipVariacion({ variacion, anteriorTexto, invertirColor = false }) {
  if (variacion == null) return null;
  const pct = variacion * 100;
  const plano = Math.abs(pct) < 0.05;
  const sube = pct >= 0;
  const bueno = invertirColor ? !sube : sube;
  return (
    <span title={`vs. periodo anterior${anteriorTexto ? ` — ${anteriorTexto}` : ''}`}>
      <Insignia tono={plano ? 'neutro' : bueno ? 'ok' : 'danger'}>
        {plano ? '=' : sube ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
      </Insignia>
    </span>
  );
}

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
          {/* --- BANDEJA DE TRABAJO (spec 1.1) --- */}
          <section className="pi-adg-seccion">
            <h3 className="pi-adg-seccion-titulo">Bandeja de trabajo</h3>
            <div className="qp-stats">
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
                  ir: () => navigate('/admin/eventos'),
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
                  <StatCard
                    key={clave}
                    icon={icono}
                    tono={tonoAntiguedad(caso.masAntiguo, caso.total)}
                    valor={caso.total}
                    label={label}
                    extra={
                      caso.total > 0 && caso.masAntiguo ? (
                        <Insignia tono={tonoAntiguedad(caso.masAntiguo, caso.total) === 'danger' ? 'danger' : 'warn'}>{antiguedad(caso.masAntiguo)}</Insignia>
                      ) : null
                    }
                    onClick={ir}
                  />
                );
              })}
            </div>
          </section>

          {/* --- ALERTAS (spec W7) --- */}
          <section className="pi-adg-seccion">
            <h3 className="pi-adg-seccion-titulo">
              Alertas {data.alertas.length > 0 && <Insignia tono="danger" solida>{data.alertas.length}</Insignia>}
            </h3>
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
          </section>

          {/* --- INDICADORES (spec 1.2) --- */}
          <section className="pi-adg-seccion">
            <div className="pi-adg-seccion-cab">
              <h3 className="pi-adg-seccion-titulo">Indicadores</h3>
              <SelectorRango valor={rango} onCambio={setRango} />
            </div>
            {data.kpis.rango && (
              <p className="pi-adg-nota-rango">
                Recaudado y tasa de rechazo del {fmtFecha(data.kpis.rango.desde)} al {fmtFecha(data.kpis.rango.hasta)}.
              </p>
            )}
            <div className="qp-stats">
              <StatCard
                icon={<FaCoins />}
                tono="ok"
                valor={fmtBs(data.kpis.recaudadoEntradas)}
                label="Recaudado por entradas"
                extra={
                  data.kpis.comparativa && (
                    <ChipVariacion
                      variacion={data.kpis.comparativa.recaudadoEntradas.variacion}
                      anteriorTexto={fmtBs(data.kpis.comparativa.recaudadoEntradas.anterior)}
                    />
                  )
                }
              />
              <StatCard
                icon={<FaLayerGroup />}
                tono="total"
                valor={data.kpis.eventos.total}
                label="Eventos en el sistema"
                extra={<Insignia tono="neutro">{data.kpis.eventos.publicados} pub · {data.kpis.eventos.borradores} borr</Insignia>}
              />
              <StatCard
                icon={<FaWallet />}
                tono="info"
                valor={fmtPts(data.kpis.saldoCashlessCirculacion)}
                label="Saldo cashless en circulación (pasivo, no es ganancia)"
              />
              <StatCard
                icon={<FaWallet />}
                tono={data.kpis.saldoCaducadoNoReclamado > 0 ? 'warn' : 'neutral'}
                valor={fmtPts(data.kpis.saldoCaducadoNoReclamado)}
                label="Saldo caducado sin reclamar (venció el plazo de retiro)"
              />
              <StatCard
                icon={<FaTimesCircle />}
                tono={
                  data.kpis.tasaRechazoComprobantes > 0.2
                    ? 'danger'
                    : data.kpis.tasaRechazoComprobantes > 0.1
                      ? 'warn'
                      : 'neutral'
                }
                valor={fmtPct(data.kpis.tasaRechazoComprobantes)}
                label="Rechazo de comprobantes"
                extra={
                  <span className="pi-adg-extra">
                    <Insignia tono="neutro">{data.kpis.comprobantes.confirmadas} ok · {data.kpis.comprobantes.rechazadas} rech</Insignia>
                    {data.kpis.comparativa && (
                      <ChipVariacion
                        variacion={
                          data.kpis.comparativa.tasaRechazoComprobantes.anterior === 0
                            ? null
                            : (data.kpis.comparativa.tasaRechazoComprobantes.actual -
                                data.kpis.comparativa.tasaRechazoComprobantes.anterior) /
                              data.kpis.comparativa.tasaRechazoComprobantes.anterior
                        }
                        anteriorTexto={`antes ${fmtPct(data.kpis.comparativa.tasaRechazoComprobantes.anterior)}`}
                        invertirColor
                      />
                    )}
                  </span>
                }
              />
              <StatCard
                icon={<FaCheckCircle />}
                valor={fmtDuracion(data.kpis.tiempoAprobacion?.medianaSegundos)}
                label="Tiempo mediano de aprobación de comprobante"
                extra={
                  data.kpis.tiempoAprobacion?.p90Segundos != null
                    ? <Insignia tono="neutro">p90: {fmtDuracion(data.kpis.tiempoAprobacion.p90Segundos)}</Insignia>
                    : null
                }
              />
            </div>
          </section>

          {/* --- ANÁLISIS HISTÓRICO (spec W1/W2/W4/W5) --- */}
          <section className="pi-adg-seccion">
            <h3 className="pi-adg-seccion-titulo">Análisis histórico</h3>
            <p className="pi-adg-nota-rango">Usa el rango de "Indicadores". Incidencias por recargador es sobre todo el histórico.</p>
            <div className="pi-adg-graficos-grid">
              <GraficoRecaudacionDiaria data={data.recaudDiaria} />
              <GraficoPorEvento data={data.porEvento} />
              <GraficoComprasDiarias data={data.comprasDiarias} />
              <GraficoIncidenciasRecargador data={data.incidRecargador} />
            </div>
          </section>

          {/* --- TODOS LOS EVENTOS (spec W6) --- */}
          <section className="pi-adg-seccion">
            <h3 className="pi-adg-seccion-titulo">Todos los eventos</h3>
            <Tabla
              card
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
          </section>

          {/* --- EMBUDO — CICLO DE VIDA (spec W3) --- */}
          <section className="pi-adg-seccion">
            <h3 className="pi-adg-seccion-titulo">Ciclo de vida de eventos</h3>
            <Embudo etapas={data.embudo.etapas} />
            {data.embudo.eventosDirectos > 0 && (
              <p className="pi-adg-nota-rango">
                {data.embudo.eventosDirectos} evento(s) creados directo por Admin no entran en el embudo.
              </p>
            )}
          </section>

          {/* --- ARQUEO DE CAJA (spec 5.2) --- */}
          <section className="pi-adg-seccion">
            <h3 className="pi-adg-seccion-titulo">
              Arqueo de caja
              {data.cortesCaja.resumen.conDescuadre > 0 && (
                <Insignia tono="danger" solida>{data.cortesCaja.resumen.conDescuadre}</Insignia>
              )}
            </h3>
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
              card
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
          </section>
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
