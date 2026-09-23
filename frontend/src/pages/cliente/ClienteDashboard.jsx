import { useCallback, useMemo, useState } from 'react';
import {
  FaArrowLeft, FaCalendarTimes, FaTicketAlt, FaCoins, FaHourglassHalf, FaCalendarDay,
  FaUsers, FaShoppingBag, FaStore, FaBullhorn, FaFilePdf, FaLock, FaChartPie,
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
          </div>
        )}
      />

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
          </section>

          {/* --- ANTES DEL EVENTO: VENTA --- */}
          {esAntes && (
            <section className="pi-cld-seccion">
              <h3 className="pi-cld-seccion-titulo">Venta de entradas</h3>
              <div className="qp-stats">
                <StatCard
                  icon={<FaTicketAlt />}
                  tono="total"
                  valor={`${data.venta.confirmadasTotal} / ${data.venta.cupoTotal || '—'}`}
                  label="Confirmadas / cupo"
                  extra={<Insignia tono="info">{fmtPct(data.venta.ocupacion)} ocupación</Insignia>}
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
                    <td className="td-centro">{c.confirmadas} / {c.cupo}</td>
                    <td className="td-centro">{c.disponibles}</td>
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
                  <Boton variante="secundario" icono={FaFilePdf} onClick={() => exportarInformeCierre(eventoSel.nombre, data)}>
                    Exportar informe
                  </Boton>
                )}
              </div>
              <div className="qp-stats">
                {!esCierre && (
                  <StatCard icon={<FaUsers />} tono="info" valor={data.operacion.personasDentro} label="Personas dentro ahora" />
                )}
                <StatCard
                  icon={<FaUsers />}
                  tono="total"
                  valor={`${data.operacion.asistieron} / ${data.venta.confirmadasTotal}`}
                  label="Asistieron / confirmadas"
                  extra={<Insignia tono="ok">{fmtPct(data.operacion.tasaAsistencia)} asistencia</Insignia>}
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
                    <Insignia tono="info" icono={FaUsers}>Hora pico de ingreso: {fmtHora(data.operacion.horaPicoIngreso)}</Insignia>
                  )}
                  {data.operacion.horaPicoConsumo != null && (
                    <Insignia tono="info" icono={FaShoppingBag}>Hora pico de consumo: {fmtHora(data.operacion.horaPicoConsumo)}</Insignia>
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
                    <td className="td-centro">{p.ventas}</td>
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
                        <td className="td-centro">{p.unidades}</td>
                        <td>{fmtBs(p.ingresos)}</td>
                      </tr>
                    )}
                  />
                </>
              )}
            </section>
          )}

          {/* Cambios de manilla del evento: entregas, reemplazos y duplicados. */}
          <section className="pi-cld-seccion">
            <HistorialManillas eventoId={eventoSel.id} />
          </section>
        </>
      )}
    </div>
  );
}
