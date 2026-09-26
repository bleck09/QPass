import { useCallback, useMemo, useState } from 'react';
import {
  FaArrowLeft, FaCalendarTimes, FaTicketAlt, FaCoins, FaHourglassHalf, FaCalendarDay,
  FaUsers, FaShoppingBag, FaStore, FaBullhorn, FaFilePdf, FaLock, FaChartPie, FaChartLine,
  FaReceipt, FaSignInAlt, FaSignOutAlt, FaUndo, FaWallet, FaClock, FaUserFriends,
  FaCashRegister, FaUserShield,
} from 'react-icons/fa';
import { exportarInformeCierre } from '../../utils/informeCierrePdf.js';
import GraficoAforo from './GraficosCliente.jsx';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import { filtrarEventos, FILTROS_ESTADO_EVENTO, estadoEvento } from '../../utils/eventos.js';
import {
  Tablero, FilaKpis, TileKpi, Panel, DonaLeyenda, ListaRanking, BarraMeta, GraficoArea,
} from '../../components/Tablero.jsx';
import Buscador from '../../components/Buscador.jsx';
import HistorialManillas from '../../components/HistorialManillas.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import './ClienteDashboard.css';
import Boton from '../../components/Boton.jsx';
import Insignia from '../../components/Insignia.jsx';
import Pasos from '../../components/Pasos.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import { AvisoFijo } from '../../components/Avisos.jsx';

const fmtBs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
// Saldo cashless dentro del evento (recargas / consumos): puntos, no Bs.
const fmtPts = (n) => `${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })} pts`;
// "2026-11-01" -> "1 nov"
const fmtDia = (dia) => new Date(`${dia}T12:00:00`).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
const fmtPct = (frac) => `${(Number(frac || 0) * 100).toFixed(1)}%`;
const fmtHora = (h) => `${String(h).padStart(2, '0')}:00`;
const fmtFechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) : '—');

function textoDias(dias) {
  if (dias > 1) return `Faltan ${dias} días`;
  if (dias === 1) return 'Falta 1 día';
  if (dias === 0) return 'Es hoy';
  return 'Ya empezó';
}

// Preparación del evento (el mapa NO es requisito para publicar: es opcional).
const PASOS = [
  { id: 'tickets', titulo: 'Categorías de ticket' },
  { id: 'qr', titulo: 'Códigos QR generados' },
  { id: 'landing', titulo: 'Página del evento' },
  { id: 'mapa', titulo: 'Mapa del recinto', opcional: true },
];

export default function ClienteDashboard() {
  useTituloPagina('Dashboard del evento');

  const [eventoSel, setEventoSel] = useState(null);
  const eventoId = eventoSel?.id || '';

  const cargarEventos = useCallback(() => api.dashboard.clienteEventos(), []);
  const {
    data: eventos,
    cargando: cargandoEventos,
    error: errorEventos,
    recargar: recargarEventos,
  } = useApi(cargarEventos, { inicial: [] });

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busqueda, filtro),
    [eventos, busqueda, filtro],
  );

  const cargarDash = useCallback(
    () => api.dashboard.clienteEvento(eventoId),
    [eventoId],
  );
  const { data, cargando, error, recargar } = useApi(cargarDash, { inicial: null, activo: !!eventoId });

  const volver = () => setEventoSel(null);

  // ---------- SELECTOR ----------
  if (!eventoSel) {
    return (
      <div className="pi-cld-container">
        <EncabezadoPagina titulo="Dashboard del evento" subtitulo="Elegí uno de tus eventos." icono={FaChartPie} />
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <EstadoVacio
            icono={FaCalendarTimes}
            titulo="Todavía no tenés eventos"
            mensaje="Cuando Admin apruebe una propuesta tuya, aparece acá."
          />
        ) : (
          <>
            <Buscador
              valor={busqueda}
              onCambio={setBusqueda}
              placeholder="Buscar evento por nombre o lugar…"
              etiqueta="Buscar evento"
              filtros={FILTROS_ESTADO_EVENTO}
              filtroActivo={filtro}
              onFiltro={setFiltro}
              etiquetaFiltros="Filtrar eventos por estado"
            />
            <GrillaEventos eventos={eventosFiltrados}>
              {(ev) => (
                <EventoCard key={ev.id} evento={ev} onClick={() => setEventoSel(ev)} cta="Ver panel" />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  const est = data ? estadoEvento(data.evento) : null;
  const esAntes = est === 'proximo';
  const esCierre = est === 'finalizado' || est === 'archivado';

  return (
    <div className="pi-cld-container">
      <div className="qp-nav">
        <Boton variante="fantasma" tamano="sm" icono={FaArrowLeft} onClick={volver}>Cambiar de evento</Boton>
      </div>
      <EncabezadoPagina
        titulo={eventoSel.nombre}
        icono={FaChartPie}
        subtitulo={data && esAntes ? `${textoDias(data.evento.diasRestantes)} para el evento.` : 'Cómo va tu evento, en números.'}
        acciones={data && (
          <div className="btn-acciones">
            <BadgeEstadoEvento evento={data.evento} />
            {data.congeladoEn && (
              <Insignia tono="neutro" icono={FaLock}>
                Cifras congeladas al cierre · {new Date(data.congeladoEn).toLocaleDateString('es-BO')}
              </Insignia>
            )}
            {esCierre && (
              <Boton variante="secundario" icono={FaFilePdf} onClick={() => exportarInformeCierre(eventoSel.nombre, data)}>
                Exportar informe
              </Boton>
            )}
          </div>
        )}
      />

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando || !data ? (
        <EstadoCarga filas={8} />
      ) : (
        <>
          <Tablero>
            {/* --- PREPARACIÓN: solo mientras falte algo o no esté publicado --- */}
            {(!data.evento.publicado || !data.preparacion.listoParaPublicar) && (
              <Panel span={12} icono={FaBullhorn} titulo="Preparación">
                {!data.evento.publicado && (
                  <AvisoFijo
                    tono={data.preparacion.listoParaPublicar ? 'exito' : 'aviso'}
                    icono={FaBullhorn}
                    titulo="El evento todavía no está publicado"
                  >
                    {data.preparacion.listoParaPublicar
                      ? 'Ya está todo listo: Admin puede publicarlo.'
                      : 'Falta completar los pasos marcados en ámbar.'}
                  </AvisoFijo>
                )}
                <Pasos
                  variante="compacto"
                  etiqueta="Preparación del evento"
                  actual={-1}
                  pasos={PASOS.map((p) => ({
                    ...p,
                    estado: data.preparacion[p.id] ? 'listo' : p.opcional ? 'opcional' : 'falta',
                  }))}
                />
              </Panel>
            )}

            {/* ================= VENTA DE ENTRADAS ================= */}
            <div className="qp-span-12 qp-tablero__cab">
              <div>
                <h3>Venta de entradas</h3>
                <p>Lo que se vendió en la página del evento (Bs pagados al comprar).</p>
              </div>
            </div>
            <FilaKpis>
              <TileKpi
                icon={<FaCoins />} tono="ok" label="Recaudado"
                valor={fmtBs(data.venta.recaudado)}
                serie={data.venta.ventasPorDia} serieKey="monto"
              />
              <TileKpi
                icon={<FaTicketAlt />} tono="total" label="Entradas vendidas"
                valor={`${data.venta.confirmadasTotal} / ${data.venta.cupoTotal || '—'}`}
                nota={`${fmtPct(data.venta.ocupacion)} del cupo`}
                serie={data.venta.ventasPorDia} serieKey="entradas"
              />
              <TileKpi
                icon={<FaHourglassHalf />} tono={data.venta.compras.pendientes ? 'warn' : 'neutral'}
                label="Compras por aprobar" valor={data.venta.compras.pendientes}
                nota={data.venta.compras.rechazadas ? `${data.venta.compras.rechazadas} rechazadas` : 'ninguna rechazada'}
              />
              {esAntes ? (
                <TileKpi icon={<FaCalendarDay />} label="Cuenta regresiva" valor={textoDias(data.evento.diasRestantes)} />
              ) : (
                <TileKpi
                  icon={<FaUsers />} tono="info" label="Asistencia"
                  valor={fmtPct(data.operacion.tasaAsistencia)}
                  nota={`${data.operacion.asistieron} de ${data.venta.confirmadasTotal} vinieron`}
                />
              )}
            </FilaKpis>

            <Panel
              span={8}
              icono={FaChartLine}
              titulo="Entradas vendidas por día"
              subtitulo={data.venta.proyeccion ? `Ritmo actual: ${Math.round(data.venta.proyeccion.ritmoDiario)} entradas por día` : undefined}
              vacio="Todavía no hay compras confirmadas."
              tabla={{
                columnas: ['Día', { texto: 'Entradas', align: 'center' }, 'Recaudado'],
                datos: data.venta.ventasPorDia.filter((d) => d.entradas > 0),
                renderFila: (d) => (
                  <tr key={d.dia}>
                    <td>{fmtDia(d.dia)}</td>
                    <td className="td-centro">{d.entradas}</td>
                    <td>{fmtBs(d.monto)}</td>
                  </tr>
                ),
              }}
            >
              <GraficoArea
                datos={data.venta.ventasPorDia}
                xKey="dia"
                fmtX={fmtDia}
                fmtValor={(v) => `${v} entradas`}
                series={[{ key: 'entradas', nombre: 'Entradas', color: 'var(--viz-serie-1)' }]}
              />
            </Panel>

            <Panel span={4} icono={FaCoins} titulo="Ingresos por categoría">
              <DonaLeyenda
                datos={data.venta.porCategoria.map((c) => ({ nombre: c.nombre, valor: c.ingreso }))}
                fmt={fmtBs}
                centroLabel="recaudado"
              />
            </Panel>

            <Panel
              span={8}
              icono={FaTicketAlt}
              titulo="Ocupación por categoría"
              subtitulo="Vendidas sobre el cupo de cada categoría."
              vacio="Este evento todavía no tiene categorías de ticket."
              tabla={{
                columnas: ['Categoría', { texto: 'Vendidas / Cupo', align: 'center' }, { texto: 'Disponibles', align: 'center' }, 'Precio', 'Ingreso generado'],
                datos: data.venta.porCategoria,
                renderFila: (c) => (
                  <tr key={c.nombre}>
                    <td>{c.nombre}</td>
                    <td className="td-centro">{c.confirmadas} / {c.cupo}</td>
                    <td className="td-centro">{c.disponibles}</td>
                    <td>{fmtBs(c.precio)}</td>
                    <td>{fmtBs(c.ingreso)}</td>
                  </tr>
                ),
              }}
            >
              <div className="qp-metas">
                <BarraMeta
                  icon={<FaUsers />} tono="total" label="Todo el evento"
                  detalle={`${data.venta.confirmadasTotal} / ${data.venta.cupoTotal || '—'}`}
                  pct={data.venta.ocupacion * 100}
                />
                {data.venta.porCategoria.map((c) => (
                  <BarraMeta
                    key={c.nombre}
                    icon={<FaTicketAlt />}
                    tono={c.disponibles === 0 ? 'ok' : 'info'}
                    label={c.nombre}
                    detalle={`${c.confirmadas} / ${c.cupo} · ${fmtBs(c.precio)} c/u`}
                    pct={c.cupo > 0 ? (c.confirmadas / c.cupo) * 100 : 0}
                  />
                ))}
              </div>
              {data.venta.proyeccion && (
                <p className="pi-cld-proyeccion">
                  {data.venta.proyeccion.seAgotaAntes ? (
                    <>
                      A este ritmo (<strong>{Math.round(data.venta.proyeccion.ritmoDiario)}</strong> entradas/día)
                      las localidades se <strong>agotan alrededor del {fmtFechaCorta(data.venta.proyeccion.agotaEn)}</strong>,
                      antes del evento.
                    </>
                  ) : (
                    <>
                      A este ritmo (<strong>{Math.round(data.venta.proyeccion.ritmoDiario)}</strong> entradas/día)
                      <strong> no se llega a agotar</strong> antes del evento.
                    </>
                  )}
                </p>
              )}
            </Panel>

            <Panel span={4} icono={FaReceipt} titulo="Compras de entradas">
              <DonaLeyenda
                datos={[
                  { nombre: 'Confirmadas', valor: data.venta.compras.confirmadas },
                  { nombre: 'Por aprobar', valor: data.venta.compras.pendientes },
                  { nombre: 'Rechazadas', valor: data.venta.compras.rechazadas },
                ]}
                centroLabel="compras"
              />
            </Panel>

            {/* ================= EL EVENTO (desde que empieza) ================= */}
            {!esAntes && (
              <>
                <div className="qp-span-12 qp-tablero__cab">
                  <div>
                    <h3>{esCierre ? 'Cómo fue el evento' : 'El evento ahora'}</h3>
                    <p>Ingresos por la puerta y gente dentro del recinto.</p>
                  </div>
                </div>
                <FilaKpis>
                  {!esCierre && (
                    <TileKpi
                      icon={<FaUsers />} tono="info" label="Personas dentro ahora"
                      valor={data.operacion.personasDentro}
                      serie={data.operacion.aforoPorHora} serieKey="dentro"
                    />
                  )}
                  <TileKpi
                    icon={<FaSignInAlt />} tono="total" label="Asistieron"
                    valor={data.operacion.asistieron}
                    nota={`de ${data.venta.confirmadasTotal} entradas`}
                    serie={esCierre ? data.operacion.aforoPorHora : undefined} serieKey="dentro"
                  />
                  <TileKpi icon={<FaHourglassHalf />} tono="warn" label="No vinieron / faltan" valor={data.entradas.faltan} />
                  <TileKpi icon={<FaSignOutAlt />} label="Ya salieron" valor={data.entradas.salieron} />
                </FilaKpis>

                <Panel span={8}>
                  <GraficoAforo
                    aforoPorHora={data.operacion.aforoPorHora}
                    cronograma={data.operacion.cronograma}
                    aforoMaximo={data.operacion.aforoMaximo}
                  />
                </Panel>

                <Panel span={4} icono={FaTicketAlt} titulo="Entradas al evento">
                  <div className="qp-tablero-panel__hero">
                    <strong>{data.entradas.emitidas}</strong>
                    <span>entradas vendidas</span>
                  </div>
                  <BarraMeta
                    tono="ok" label="Ya ingresaron"
                    detalle={`${data.operacion.asistieron} / ${data.entradas.emitidas}`}
                    pct={data.operacion.tasaAsistencia * 100}
                  />
                  <DonaLeyenda
                    datos={[
                      { nombre: 'Están dentro', valor: data.entradas.dentro },
                      { nombre: 'Ya salieron', valor: data.entradas.salieron },
                      { nombre: esCierre ? 'No vinieron' : 'Faltan', valor: data.entradas.faltan },
                    ]}
                    centroLabel="entradas"
                  />
                  {(data.operacion.horaPicoIngreso != null || data.operacion.horaPicoConsumo != null) && (
                    <div className="pi-cld-chips">
                      {data.operacion.horaPicoIngreso != null && (
                        <Insignia tono="info" icono={FaUsers}>Pico de ingreso: {fmtHora(data.operacion.horaPicoIngreso)}</Insignia>
                      )}
                      {data.operacion.horaPicoConsumo != null && (
                        <Insignia tono="info" icono={FaShoppingBag}>Pico de consumo: {fmtHora(data.operacion.horaPicoConsumo)}</Insignia>
                      )}
                    </div>
                  )}
                </Panel>
              </>
            )}

            {/* ================= DINERO CASHLESS (pts) ================= */}
            {(!esAntes || data.finanzas.recargado > 0) && (
              <>
                <div className="qp-span-12 qp-tablero__cab">
                  <div>
                    <h3>Consumo dentro del evento</h3>
                    <p>Saldo cashless (pts): lo que la gente recargó y gastó en los puestos. Es aparte de la venta de entradas.</p>
                  </div>
                </div>
                <FilaKpis>
                  <TileKpi
                    icon={<FaCoins />} tono="ok" label="Total recargado" valor={fmtPts(data.finanzas.recargado)}
                    serie={data.finanzas.actividadPorHora} serieKey="recargas"
                  />
                  <TileKpi
                    icon={<FaShoppingBag />} tono="info" label="Consumido en puestos" valor={fmtPts(data.finanzas.consumido)}
                    nota={`${fmtPts(data.operacion.consumoPromedio)} por asistente`}
                    serie={data.finanzas.actividadPorHora} serieKey="consumos"
                  />
                  <TileKpi icon={<FaUndo />} tono="warn" label="Devuelto" valor={fmtPts(data.finanzas.devuelto)} />
                  <TileKpi
                    icon={<FaWallet />} tono="total" label="Saldo en circulación" valor={fmtPts(data.finanzas.saldoCirculacion)}
                    nota="recargado − consumido − devuelto"
                  />
                </FilaKpis>

                <Panel
                  span={8}
                  icono={FaClock}
                  titulo="Recargas vs. consumos por hora"
                  vacio="Todavía no hay recargas ni consumos."
                  tabla={{
                    columnas: ['Hora', 'Recargado', 'Consumido'],
                    datos: data.finanzas.actividadPorHora,
                    renderFila: (p) => (
                      <tr key={p.hora}>
                        <td>{fmtHora(p.hora)}</td>
                        <td>{fmtPts(p.recargas)}</td>
                        <td>{fmtPts(p.consumos)}</td>
                      </tr>
                    ),
                  }}
                >
                  <GraficoArea
                    datos={data.finanzas.actividadPorHora}
                    xKey="hora"
                    fmtX={fmtHora}
                    fmtValor={fmtPts}
                    series={[
                      { key: 'recargas', nombre: 'Recargado', color: 'var(--viz-serie-1)' },
                      { key: 'consumos', nombre: 'Consumido', color: 'var(--viz-serie-2)' },
                    ]}
                  />
                </Panel>

                <Panel span={4} icono={FaStore} titulo="Ventas de los puestos">
                  <div className="qp-tablero-panel__hero">
                    <strong>{fmtPts(data.ventasPuestos.total)}</strong>
                    <span>vendido</span>
                  </div>
                  <dl className="pi-cld-cifras">
                    <div><dt>Ventas</dt><dd>{data.ventasPuestos.ventas.toLocaleString('es-BO')}</dd></div>
                    <div><dt>Unidades</dt><dd>{data.ventasPuestos.unidades.toLocaleString('es-BO')}</dd></div>
                    <div><dt>Ticket promedio</dt><dd>{fmtPts(data.ventasPuestos.ticketPromedio)}</dd></div>
                    <div><dt>Puestos</dt><dd>{data.equipo.puestos}</dd></div>
                  </dl>
                </Panel>

                <Panel span={6} icono={FaStore} titulo="Top puestos por ventas">
                  <ListaRanking
                    ranking
                    vacio="Todavía no hay ventas registradas."
                    items={data.operacion.topPuestos.map((p) => ({
                      id: p.nombre,
                      titulo: p.nombre,
                      sub: `${p.ventas} ventas`,
                      valor: fmtPts(p.ingresos),
                    }))}
                  />
                </Panel>

                <Panel span={6} icono={FaShoppingBag} titulo="Productos más vendidos">
                  <ListaRanking
                    ranking
                    vacio="Sin ventas de productos."
                    items={(data.operacion.topProductos ?? []).map((p) => ({
                      id: p.nombre,
                      titulo: p.nombre,
                      sub: `${p.unidades} unidades`,
                      valor: fmtPts(p.ingresos),
                    }))}
                  />
                </Panel>
              </>
            )}

            {/* ================= EQUIPO (solo cantidades) ================= */}
            <Panel span={12} icono={FaUserFriends} titulo="Equipo del evento" subtitulo="Cuántas personas trabajan en tu evento, por rol.">
              <ul className="pi-cld-equipo">
                {[
                  { clave: 'puestos', etiqueta: 'Puestos', icono: FaStore },
                  { clave: 'negocios', etiqueta: 'Negocios', icono: FaStore },
                  { clave: 'ayudantes', etiqueta: 'Ayudantes', icono: FaUserFriends },
                  { clave: 'recargadores', etiqueta: 'Recargadores', icono: FaCashRegister },
                  { clave: 'supervisores', etiqueta: 'Supervisores', icono: FaUserShield },
                  { clave: 'devoluciones', etiqueta: 'Devolución', icono: FaUndo },
                ].map(({ clave, etiqueta, icono: Icono }) => (
                  <li key={clave}>
                    <Icono aria-hidden="true" />
                    <strong>{data.equipo[clave]}</strong>
                    <span>{etiqueta}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* Cambios de manilla del evento: entregas, reemplazos y duplicados. */}
            <Panel span={12}>
              <HistorialManillas eventoId={eventoSel.id} />
            </Panel>
          </Tablero>
        </>
      )}
    </div>
  );
}
