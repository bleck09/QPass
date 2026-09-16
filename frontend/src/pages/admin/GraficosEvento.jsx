import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { PanelGrafico } from './GraficosAdmin.jsx';
import { ejeTick, tooltipStyle, grid, fmtBs } from './graficosEstilos.jsx';

/* Gráficos del dashboard de UN evento (Admin.jsx, vista general). Reutilizan el
 * mismo marco (PanelGrafico) y los mismos tokens que GraficosAdmin.jsx (el
 * dashboard global) para que todo el panel de Admin se vea con un solo estilo.
 *
 * Dos monedas distintas en QPass — nunca se mezclan en un mismo gráfico:
 *   - "pts" = saldo cashless dentro del evento (recargas / consumos).
 *   - "Bs"  = dinero real pagado al comprar la entrada.
 */

const fmtPts = (n) => `${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })} pts`;

// W-evento-1 — recargas vs. consumos por hora del evento (Manual §17: "barras
// apiladas por hora"; acá van agrupadas, no apiladas, porque son dos flujos de
// signo contrario — sumarlos en una sola barra no tendría un total real).
export function GraficoActividadPorHora({ puntos }) {
  return (
    <PanelGrafico
      titulo="Recargas vs. consumos por hora"
      vacio="Todavía no hay recargas ni consumos registrados en este evento."
      tabla={{
        columnas: ['Hora', 'Recargado', 'Consumido'],
        datos: puntos,
        renderFila: (p) => (
          <tr key={p.hora}>
            <td>{p.hora}</td>
            <td>{fmtPts(p.recargas)}</td>
            <td>{fmtPts(p.consumos)}</td>
          </tr>
        ),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={puntos} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          {grid}
          <XAxis dataKey="hora" tick={ejeTick} stroke="var(--border)" />
          <YAxis tick={ejeTick} stroke="var(--border)" width={50} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} pts`, n]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="recargas" fill="var(--ok)" name="Recargado" radius={[3, 3, 0, 0]} />
          <Bar dataKey="consumos" fill="var(--viz-serie-1)" name="Consumido" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </PanelGrafico>
  );
}

// W-evento-2 — ingresos por categoría de entrada (Manual §5: nombres largos ->
// barras horizontales ordenadas de mayor a menor). Es plata REAL (Bs, lo que se
// pagó al comprar), no puntos — por eso es su propio gráfico, nunca junto al de arriba.
export function GraficoIngresosPorCategoria({ filas }) {
  return (
    <PanelGrafico
      titulo="Ingresos por categoría de entrada"
      vacio="Todavía no hay entradas vendidas en este evento."
      tabla={{
        columnas: ['Categoría', 'Entradas vendidas', 'Ingresos'],
        datos: filas,
        renderFila: (f) => (
          <tr key={f.nombre}>
            <td>{f.nombre}</td>
            <td>{f.entradas}</td>
            <td>{fmtBs(f.ingresos)}</td>
          </tr>
        ),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          {grid}
          <XAxis type="number" tick={ejeTick} stroke="var(--border)" tickFormatter={(v) => `Bs ${v}`} />
          <YAxis type="category" dataKey="nombre" tick={ejeTick} stroke="var(--border)" width={110} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtBs(v), 'Ingresos']} />
          <Bar dataKey="ingresos" fill="var(--viz-serie-1)" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </PanelGrafico>
  );
}

// Ranking de negocios por ventas (pts). Barras horizontales de mayor a menor:
// el primero es "el que más vende".
export function GraficoVentasPorNegocio({ filas }) {
  const alto = Math.max(260, filas.length * 36);
  return (
    <PanelGrafico
      titulo="Ventas por negocio"
      vacio="Todavía no hay ventas de negocios en este evento."
      tabla={{
        columnas: ['Negocio', 'Ventas', 'Total'],
        datos: filas,
        renderFila: (f) => (
          <tr key={f.nombre}>
            <td>{f.nombre}</td>
            <td>{f.ventas}</td>
            <td>{fmtPts(f.total)}</td>
          </tr>
        ),
      }}
    >
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <ResponsiveContainer width="100%" height={alto}>
          <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            {grid}
            <XAxis type="number" tick={ejeTick} stroke="var(--border)" allowDecimals={false} />
            <YAxis type="category" dataKey="nombre" tick={ejeTick} stroke="var(--border)" width={110} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtPts(v), 'Vendido']} />
            <Bar dataKey="total" fill="var(--viz-serie-2)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelGrafico>
  );
}

// Productos más vendidos del evento (unidades). Top 10 en el gráfico; la vista
// tabla muestra todos, con el negocio que lo vende y lo recaudado.
export function GraficoProductosMasVendidos({ filas }) {
  const top = filas.slice(0, 10);
  return (
    <PanelGrafico
      titulo="Productos más vendidos (unidades)"
      vacio="Todavía no se vendieron productos en este evento."
      tabla={{
        columnas: ['Producto', 'Negocio', 'Unidades', 'Total'],
        datos: filas,
        renderFila: (p) => (
          <tr key={p.nombre}>
            <td>{p.nombre}</td>
            <td>{p.negocios}</td>
            <td>{p.unidades}</td>
            <td>{fmtPts(p.ingresos)}</td>
          </tr>
        ),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          {grid}
          <XAxis type="number" tick={ejeTick} stroke="var(--border)" allowDecimals={false} />
          <YAxis type="category" dataKey="nombre" tick={ejeTick} stroke="var(--border)" width={110} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v, _n, item) => [`${v} u. · ${fmtPts(item.payload.ingresos)}`, item.payload.negocios]}
          />
          <Bar dataKey="unidades" fill="var(--viz-serie-1)" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </PanelGrafico>
  );
}
