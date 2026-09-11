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
