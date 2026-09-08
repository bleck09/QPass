import { useCallback, useMemo, useState } from 'react';
import {
  FaArrowLeft, FaTicketAlt, FaCoins, FaHourglassHalf, FaCalendarDay,
  FaUsers, FaShoppingBag, FaStore, FaCheck, FaTimes, FaBullhorn, FaFilePdf, FaLock,
} from 'react-icons/fa';
import { exportarInformeCierre } from '../../utils/informeCierrePdf.js';
import GraficoAforo from './GraficosCliente.jsx';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import { filtrarEventos, FILTROS_ESTADO_EVENTO, estadoEvento } from '../../utils/eventos.js';
import StatCard from '../../components/StatCard.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import './ClienteDashboard.css';
import '../supervisor/GestionEntrega.css';

const fmtBs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const fmtPct = (frac) => `${(Number(frac || 0) * 100).toFixed(1)}%`;
const fmtHora = (h) => `${String(h).padStart(2, '0')}:00`;
const fmtFechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) : '—');

function textoDias(dias) {
  if (dias > 1) return `Faltan ${dias} días`;
  if (dias === 1) return 'Falta 1 día';
  if (dias === 0) return 'Es hoy';
  return 'Ya empezó';
}

const PASOS = [
  ['tickets', 'Categorías de ticket'],
  ['qr', 'Códigos QR generados'],
  ['landing', 'Página del evento'],
  ['mapa', 'Mapa del recinto'],
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
        <div className="pi-cld-header">
          <h1>Dashboard del evento</h1>
          <p>Elige uno de tus eventos.</p>
        </div>
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <p className="pi-entrega-sin-eventos">
            Todavía no tienes eventos. Cuando Admin apruebe una propuesta tuya, aparecerá acá.
          </p>
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
            <GrillaEventos eventos={eventosFiltrados} gridClassName="pi-entrega-eventos-grid">
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
      <div className="pi-cld-header">
        <button className="pi-entrega-btn-volver" onClick={volver}>
          <FaArrowLeft /> Cambiar de evento
        </button>
        <h1>
          {eventoSel.nombre}
          {data && <BadgeEstadoEvento evento={data.evento} className="pi-cld-badge" />}
        </h1>
        {data && esAntes && <p>{textoDias(data.evento.diasRestantes)} para el evento.</p>}
        {data && data.congeladoEn && (
          <p className="pi-cld-congelado">
            <FaLock aria-hidden="true" /> Cifras congeladas al cierre · {new Date(data.congeladoEn).toLocaleDateString('es-BO')}
          </p>
        )}
      </div>

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando || !data ? (
        <EstadoCarga filas={8} />
      ) : (
        <>
          {/* --- PREPARACIÓN (siempre) --- */}
          <section className="pi-cld-seccion">
            <h3 className="pi-cld-seccion-titulo">Preparación</h3>
            {!data.evento.publicado && (
              <p className="pi-cld-aviso">
                <FaBullhorn aria-hidden="true" /> El evento todavía no está publicado.
                {data.preparacion.listoParaPublicar
                  ? ' Ya está todo listo — Admin puede publicarlo.'
                  : ' Falta completar los pasos de abajo.'}
              </p>
            )}
            <ul className="pi-cld-checklist">
              {PASOS.map(([clave, label]) => (
                <li key={clave} className={data.preparacion[clave] ? 'ok' : 'falta'}>
                  {data.preparacion[clave] ? <FaCheck aria-hidden="true" /> : <FaTimes aria-hidden="true" />}
                  {label}
                </li>
              ))}
            </ul>
          </section>

          {/* --- ANTES DEL EVENTO: VENTA --- */}
          {esAntes && (
            <section className="pi-cld-seccion">
              <h3 className="pi-cld-seccion-titulo">Venta de entradas</h3>
              <div className="pi-cld-grid">
                <StatCard
                  icon={<FaTicketAlt />}
                  tono="total"
                  valor={`${data.venta.confirmadasTotal} / ${data.venta.cupoTotal || '—'}`}
                  label="Confirmadas / cupo"
                  extra={<span className="pi-cld-nota">{fmtPct(data.venta.ocupacion)} ocupación</span>}
                />
                <StatCard icon={<FaCoins />} tono="ok" valor={fmtBs(data.venta.recaudado)} label="Recaudado" />
                <StatCard
                  icon={<FaHourglassHalf />}
                  tono="warn"
                  valor={data.venta.reservadasPendientes}
                  label="Compras pendientes de aprobación"
                />
                <StatCard icon={<FaCalendarDay />} valor={textoDias(data.evento.diasRestantes)} label="Cuenta regresiva" />
              </div>

              <div className="pi-cld-bar" aria-hidden="true">
                <div
                  className="pi-cld-bar-fill"
                  style={{ width: `${Math.min(100, Math.round(data.venta.ocupacion * 100))}%` }}
                />
              </div>

              <Tabla
                columnas={['Categoría', { texto: 'Vendidas / Cupo', align: 'center' }, { texto: 'Disponibles', align: 'center' }, 'Precio', 'Ingreso generado']}
                datos={data.venta.porCategoria}
                vacio="Este evento todavía no tiene categorías de ticket."
                renderFila={(c) => (
                  <tr key={c.nombre}>
                    <td>{c.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{c.confirmadas} / {c.cupo}</td>
                    <td style={{ textAlign: 'center' }}>{c.disponibles}</td>
                    <td>{fmtBs(c.precio)}</td>
                    <td>{fmtBs(c.ingreso)}</td>
                  </tr>
                )}
              />

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
            </section>
          )}

          {/* --- DURANTE / DESPUÉS --- */}
          {!esAntes && (
            <section className="pi-cld-seccion">
              <div className="pi-cld-seccion-cab">
                <h3 className="pi-cld-seccion-titulo">{esCierre ? 'Informe de cierre' : 'La noche del evento'}</h3>
                {esCierre && (
                  <button
                    type="button"
                    className="pi-cld-btn-export"
                    onClick={() => exportarInformeCierre(eventoSel.nombre, data)}
                  >
                    <FaFilePdf aria-hidden="true" /> Exportar informe
                  </button>
                )}
              </div>
              <div className="pi-cld-grid">
                {!esCierre && (
                  <StatCard icon={<FaUsers />} tono="info" valor={data.operacion.personasDentro} label="Personas dentro ahora" />
                )}
                <StatCard
                  icon={<FaUsers />}
                  tono="total"
                  valor={`${data.operacion.asistieron} / ${data.venta.confirmadasTotal}`}
                  label="Asistieron / confirmadas"
                  extra={<span className="pi-cld-nota">{fmtPct(data.operacion.tasaAsistencia)} asistencia</span>}
                />
                <StatCard icon={<FaShoppingBag />} tono="ok" valor={fmtBs(data.operacion.consumoTotal)} label="Consumo total" />
                <StatCard icon={<FaShoppingBag />} valor={fmtBs(data.operacion.consumoPromedio)} label="Consumo promedio por asistente" />
                <StatCard icon={<FaCoins />} valor={fmtBs(data.venta.recaudado)} label="Recaudado por entradas" />
              </div>

              <GraficoAforo
                aforoPorHora={data.operacion.aforoPorHora}
                cronograma={data.operacion.cronograma}
                aforoMaximo={data.operacion.aforoMaximo}
              />

              {(data.operacion.horaPicoIngreso != null || data.operacion.horaPicoConsumo != null) && (
                <div className="pi-cld-chips">
                  {data.operacion.horaPicoIngreso != null && (
                    <span className="pi-cld-chip"><FaUsers aria-hidden="true" /> Hora pico de ingreso: {fmtHora(data.operacion.horaPicoIngreso)}</span>
                  )}
                  {data.operacion.horaPicoConsumo != null && (
                    <span className="pi-cld-chip"><FaShoppingBag aria-hidden="true" /> Hora pico de consumo: {fmtHora(data.operacion.horaPicoConsumo)}</span>
                  )}
                </div>
              )}

              <h4 className="pi-cld-subtitulo"><FaStore aria-hidden="true" /> Top puestos por ventas</h4>
              <Tabla
                columnas={['Puesto', { texto: 'Ventas', align: 'center' }, 'Ingresos']}
                datos={data.operacion.topPuestos}
                vacio="Todavía no hay ventas registradas."
                renderFila={(p) => (
                  <tr key={p.nombre}>
                    <td>{p.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{p.ventas}</td>
                    <td>{fmtBs(p.ingresos)}</td>
                  </tr>
                )}
              />

              {data.operacion.topProductos?.length > 0 && (
                <>
                  <h4 className="pi-cld-subtitulo"><FaShoppingBag aria-hidden="true" /> Productos más vendidos</h4>
                  <Tabla
                    columnas={['Producto', { texto: 'Unidades', align: 'center' }, 'Ingresos']}
                    datos={data.operacion.topProductos}
                    vacio="Sin ventas de productos."
                    renderFila={(p) => (
                      <tr key={p.nombre}>
                        <td>{p.nombre}</td>
                        <td style={{ textAlign: 'center' }}>{p.unidades}</td>
                        <td>{fmtBs(p.ingresos)}</td>
                      </tr>
                    )}
                  />
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
