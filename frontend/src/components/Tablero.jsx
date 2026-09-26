import { useId, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie,
  XAxis, YAxis, Tooltip,
} from 'recharts';
import { FaChartArea, FaTable, FaChartBar, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Pestanas from './Pestanas.jsx';
import Tabla from './Tabla.jsx';
import { EstadoVacio } from './EstadosAsync.jsx';
import { useContador } from '../utils/useContador.js';
import { ejeTick, tooltipStyle, grid, vizCategorica, vizOtros, colorTono } from '../utils/graficos.jsx';
import './Tablero.css';

/*
  Piezas del TABLERO (dashboards de Admin general, por evento, negocio y
  organizador). Una sola forma de armar un dashboard:

    <Tablero>
      <TileKpi ... />  <TileKpi ... />            // fila de KPIs (se acomodan solas)
      <Panel span={8} titulo="…" acciones={…}>…</Panel>
      <Panel span={4} titulo="…">…</Panel>
    </Tablero>

  - Tablero: grilla de 12 columnas. Los TileKpi ocupan 3 (4 por fila) y los
    Panel lo que diga `span` (4, 5, 6, 7, 8 o 12). En tablet todo baja a 6/12
    y en móvil a una columna.
  - Solo tokens de color: claro/oscuro sin tocar este archivo.
*/

export function Tablero({ children, className = '' }) {
  return <div className={`qp-tablero ${className}`.trim()}>{children}</div>;
}

/*
  Panel (card) con cabecera: título + subtítulo a la izquierda, acciones a la
  derecha (selector de rango, "Ver todo"...).
  tabla: { columnas, datos, renderFila } -> agrega el botón "Ver tabla" (la
         alternativa accesible del gráfico, igual que PanelGrafico).
  vacio: texto si tabla.datos está vacío (se muestra en lugar del contenido).
*/
export function Panel({ span = 12, titulo, subtitulo, icono: Icono, acciones, tabla, vacio, className = '', children }) {
  const [modo, setModo] = useState('grafico');
  const sinDatos = tabla && (!tabla.datos || tabla.datos.length === 0);
  return (
    <section className={`qp-tablero-panel qp-span-${span} ${className}`.trim()}>
      {(titulo || acciones || tabla) && (
        <header className="qp-tablero-panel__cab">
          <div className="qp-tablero-panel__titulos">
            {titulo && (
              <h3 className="qp-tablero-panel__titulo">
                {Icono && <Icono className="qp-tablero-panel__icono" aria-hidden="true" />}
                {titulo}
              </h3>
            )}
            {subtitulo && <p className="qp-tablero-panel__sub">{subtitulo}</p>}
          </div>
          {(acciones || (tabla && !sinDatos)) && (
            <div className="qp-tablero-panel__acciones">
              {acciones}
              {tabla && !sinDatos && (
                <Pestanas
                  etiqueta={`Ver "${titulo}" como`}
                  activo={modo}
                  onCambio={setModo}
                  items={[
                    { id: 'grafico', etiqueta: 'Ver gráfico', icono: FaChartArea, soloIcono: true },
                    { id: 'tabla', etiqueta: 'Ver tabla', icono: FaTable, soloIcono: true },
                  ]}
                />
              )}
            </div>
          )}
        </header>
      )}
      {sinDatos ? (
        <EstadoVacio compacto icono={FaChartBar} titulo={vacio} />
      ) : tabla && modo === 'tabla' ? (
        <div className="qp-tablero-panel__tabla">
          <Tabla columnas={tabla.columnas} datos={tabla.datos} renderFila={tabla.renderFila} porPagina={0} />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// Chip "▲ 12.5% vs. periodo anterior". variacion = fracción (0.125) o null.
export function ChipVariacion({ variacion, texto = 'vs. periodo anterior', invertir = false, title }) {
  if (variacion == null || !Number.isFinite(variacion)) return null;
  const pct = variacion * 100;
  const plano = Math.abs(pct) < 0.05;
  const sube = pct > 0;
  const bueno = invertir ? !sube : sube;
  const tono = plano ? 'plano' : bueno ? 'bueno' : 'malo';
  return (
    <span className={`qp-variacion qp-variacion--${tono}`} title={title}>
      <span aria-hidden="true">{plano ? '=' : sube ? '↑' : '↓'}</span>
      <strong>{Math.abs(pct).toFixed(1)}%</strong>
      {texto && <span className="qp-variacion__txt">{texto}</span>}
    </span>
  );
}

/*
  KPI de la fila de arriba: etiqueta + ícono en círculo, número grande,
  variación y una mini curva (sparkline) con la tendencia.
    serie:    [{...}] puntos en orden; serieKey: campo numérico a dibujar.
    variacion/textoVariacion/invertir: ver ChipVariacion. nota: línea chica.
    onClick:  el tile se vuelve <button>.
*/
export function TileKpi({
  icon, tono = 'neutral', label, valor, nota, variacion, textoVariacion, invertir,
  serie, serieKey = 'valor', onClick, className = '',
}) {
  const Tag = onClick ? 'button' : 'div';
  const idGrad = useId().replace(/:/g, '');
  const animable = Number.isInteger(valor);
  const contado = useContador(animable ? valor : 0, animable, 900);
  const color = colorTono[tono] || colorTono.neutral;
  const haySerie = Array.isArray(serie) && serie.length > 1 && serie.some((p) => Number(p[serieKey]) > 0);
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`qp-kpi qp-kpi--${tono}${onClick ? ' qp-kpi--click' : ''} ${className}`.trim()}
    >
      <span className="qp-kpi__cab">
        <span className="qp-kpi__label">{label}</span>
        {icon && <span className={`qp-kpi__icono qp-kpi__icono--${tono}`} aria-hidden="true">{icon}</span>}
      </span>
      <span className="qp-kpi__valor">{animable ? contado.toLocaleString('es-BO') : valor}</span>
      <span className="qp-kpi__pie">
        <ChipVariacion variacion={variacion} texto={textoVariacion} invertir={invertir} />
        {nota && <span className="qp-kpi__nota">{nota}</span>}
      </span>
      {haySerie && (
        <span className="qp-kpi__spark" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone" dataKey={serieKey} stroke={color} strokeWidth={2}
                fill={`url(#${idGrad})`} dot={false} isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </span>
      )}
    </Tag>
  );
}

// Fila de KPIs dentro del Tablero (4 por fila en escritorio).
export function FilaKpis({ children }) {
  return <div className="qp-span-12 qp-kpis">{children}</div>;
}

/*
  Área con degradé (tendencia en el tiempo). series: [{ key, nombre, color }].
  Con una sola serie no hay leyenda (el título del panel la nombra).
*/
export function GraficoArea({ datos, xKey, series, fmtX, fmtY, fmtValor, alto = 260 }) {
  const base = useId().replace(/:/g, '');
  return (
    <div className="qp-tablero-panel__grafico" style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${base}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {grid}
          <XAxis dataKey={xKey} tickFormatter={fmtX} tick={ejeTick} stroke="var(--border)" tickLine={false} />
          <YAxis tick={ejeTick} stroke="var(--border)" width={56} tickFormatter={fmtY} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={fmtX}
            formatter={(v, n) => [fmtValor ? fmtValor(v) : v, n]}
            cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }}
          />
          {series.map((s, i) => (
            <Area
              key={s.key} type="monotone" dataKey={s.key} name={s.nombre}
              stroke={s.color} strokeWidth={2} fill={`url(#${base}-${i})`}
              activeDot={{ r: 5, stroke: 'var(--bg-surface)', strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      {series.length > 1 && (
        <ul className="qp-leyenda-linea">
          {series.map((s) => (
            <li key={s.key}><span className="qp-punto" style={{ background: s.color }} />{s.nombre}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/*
  Barras verticales con la barra MÁS ALTA resaltada (color lleno) y el resto
  en el mismo color más suave; al pasar el mouse se resalta la barra señalada.
*/
export function BarrasDestacadas({ datos, xKey, yKey, nombre, fmtX, fmtValor, color = 'var(--viz-serie-1)', alto = 260 }) {
  const [activa, setActiva] = useState(null);
  const max = Math.max(...datos.map((d) => Number(d[yKey]) || 0));
  const idxMax = datos.findIndex((d) => Number(d[yKey]) === max);
  const resaltada = activa ?? idxMax;
  return (
    <div className="qp-tablero-panel__grafico" style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} onMouseLeave={() => setActiva(null)}>
          {grid}
          <XAxis dataKey={xKey} tickFormatter={fmtX} tick={ejeTick} stroke="var(--border)" tickLine={false} />
          <YAxis tick={ejeTick} stroke="var(--border)" width={56} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={fmtX}
            formatter={(v) => [fmtValor ? fmtValor(v) : v, nombre]}
            cursor={{ fill: 'var(--bg-hover)' }}
          />
          <Bar dataKey={yKey} name={nombre} radius={[4, 4, 0, 0]} maxBarSize={36} onMouseEnter={(_, i) => setActiva(i)}>
            {datos.map((d, i) => (
              <Cell key={d[xKey]} fill={color} fillOpacity={i === resaltada ? 1 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/*
  Dona con total al centro + leyenda con valor y %. datos: [{ nombre, valor }]
  (se ordena de mayor a menor; del 6.º en adelante se agrupa en "Otros").
*/
export function DonaLeyenda({ datos, fmt = (v) => v, centroLabel = 'Total', centroValor }) {
  const orden = [...datos].filter((d) => Number(d.valor) > 0).sort((a, b) => b.valor - a.valor);
  const top = orden.slice(0, 5).map((d, i) => ({ ...d, color: vizCategorica[i] }));
  const resto = orden.slice(5).reduce((s, d) => s + Number(d.valor), 0);
  const filas = resto > 0 ? [...top, { nombre: 'Otros', valor: resto, color: vizOtros }] : top;
  const total = filas.reduce((s, d) => s + Number(d.valor), 0);
  if (total === 0) return <EstadoVacio compacto icono={FaChartBar} titulo="Todavía no hay datos." />;
  return (
    <div className="qp-dona">
      <div className="qp-dona__grafico">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filas} dataKey="valor" nameKey="nombre" innerRadius="68%" outerRadius="100%"
              paddingAngle={filas.length > 1 ? 2 : 0} stroke="var(--bg-surface)" strokeWidth={2}
              startAngle={90} endAngle={-270}
            >
              {filas.map((f) => <Cell key={f.nombre} fill={f.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [fmt(v), n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="qp-dona__centro">
          <strong>{centroValor ?? fmt(total)}</strong>
          <span>{centroLabel}</span>
        </div>
      </div>
      <ul className="qp-dona__leyenda">
        {filas.map((f) => (
          <li key={f.nombre}>
            <span className="qp-punto" style={{ background: f.color }} aria-hidden="true" />
            <span className="qp-dona__nombre" title={f.nombre}>{f.nombre}</span>
            <span className="qp-dona__valor">{fmt(f.valor)}</span>
            <span className="qp-dona__pct">{((f.valor / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/*
  Lista tipo "ranking" (filas con avatar, título, subtítulo y valor a la
  derecha). items: [{ id, titulo, sub, valor, valorSub, icono, onClick, accion }].
  ranking: muestra la posición (1, 2, 3 con medalla). limite: muestra N y un
  botón "Ver todos" que despliega el resto.
*/
export function ListaRanking({ items, ranking = false, limite = 5, vacio = 'Todavía no hay datos.' }) {
  const [todos, setTodos] = useState(false);
  if (!items.length) return <EstadoVacio compacto icono={FaChartBar} titulo={vacio} />;
  const visibles = todos || !limite ? items : items.slice(0, limite);
  return (
    <>
      <ol className="qp-ranking">
        {visibles.map((it, i) => {
          const Tag = it.onClick ? 'button' : 'div';
          return (
            <li key={it.id ?? it.titulo}>
              <Tag type={it.onClick ? 'button' : undefined} onClick={it.onClick} className={`qp-ranking__fila${it.onClick ? ' qp-ranking__fila--click' : ''}`}>
                <span className={`qp-ranking__avatar${ranking && i < 3 ? ` qp-ranking__avatar--${i + 1}` : ''}`} aria-hidden="true">
                  {ranking ? i + 1 : it.icono ?? String(it.titulo || '?').trim().charAt(0).toUpperCase()}
                </span>
                <span className="qp-ranking__txt">
                  <span className="qp-ranking__titulo">{it.titulo}</span>
                  {it.sub && <span className="qp-ranking__sub">{it.sub}</span>}
                </span>
                <span className="qp-ranking__val">
                  <strong>{it.valor}</strong>
                  {it.valorSub && <span>{it.valorSub}</span>}
                </span>
              </Tag>
              {it.accion && <span className="qp-ranking__accion">{it.accion}</span>}
            </li>
          );
        })}
      </ol>
      {limite > 0 && items.length > limite && (
        <button type="button" className="qp-ranking__mas" onClick={() => setTodos((t) => !t)} aria-expanded={todos}>
          {todos ? <><FaChevronUp aria-hidden="true" /> Ver menos</> : <><FaChevronDown aria-hidden="true" /> Ver todos ({items.length})</>}
        </button>
      )}
    </>
  );
}

/*
  Barra de progreso hacia una meta (ícono + etiqueta + "valor / meta" + %).
  pct: 0-100. tono: color de la barra y del ícono.
*/
export function BarraMeta({ icon, tono = 'total', label, detalle, pct }) {
  const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return (
    <div className="qp-meta">
      {icon && <span className={`qp-kpi__icono qp-kpi__icono--${tono}`} aria-hidden="true">{icon}</span>}
      <div className="qp-meta__cuerpo">
        <div className="qp-meta__cab">
          <span className="qp-meta__label">{label}</span>
          {detalle && <span className="qp-meta__detalle">{detalle}</span>}
        </div>
        <div className="qp-meta__fila">
          <div
            className="qp-meta__barra" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}
            aria-label={typeof label === 'string' ? label : undefined}
          >
            <div className={`qp-meta__relleno qp-meta__relleno--${tono}`} style={{ width: `${p}%` }} />
          </div>
          <strong className="qp-meta__pct">{p}%</strong>
        </div>
      </div>
    </div>
  );
}
