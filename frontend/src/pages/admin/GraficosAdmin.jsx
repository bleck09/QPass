import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import PanelGrafico from '../../components/PanelGrafico.jsx';
import { fmtBs, ejeTick, tooltipStyle, grid } from '../../utils/graficos.jsx';

const fmtDiaCorto = (d) => {
  const [, m, day] = String(d).split('-');
  return `${day}/${m}`;
};

// W1 — recaudación por entradas por día (+ comparación con el periodo anterior)
export function GraficoRecaudacionDiaria({ data }) {
  const puntos = data?.puntos ?? [];
  const hayPrev = puntos.some((p) => p.montoPrev != null);
  return (
    <PanelGrafico
      titulo="Recaudación por entradas / día"
      vacio="Sin compras confirmadas en el periodo."
      tabla={{
        columnas: hayPrev ? ['Día', 'Recaudado', 'Periodo anterior'] : ['Día', 'Recaudado'],
        datos: puntos,
        renderFila: (p) => (
          <tr key={p.dia}>
            <td>{p.dia}</td>
            <td>{fmtBs(p.monto)}</td>
            {hayPrev && <td>{fmtBs(p.montoPrev)}</td>}
          </tr>
        ),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={puntos} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          {grid}
          <XAxis dataKey="dia" tickFormatter={fmtDiaCorto} tick={ejeTick} stroke="var(--border)" />
          <YAxis tick={ejeTick} stroke="var(--border)" width={70} tickFormatter={(v) => `Bs ${v}`} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v, name) => [fmtBs(v), name]}
            labelFormatter={(l) => l}
          />
          {hayPrev && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {hayPrev && (
            <Line
              type="monotone"
              dataKey="montoPrev"
              name="Periodo anterior"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
            />
          )}
          <Line type="monotone" dataKey="monto" name="Recaudado" stroke="var(--viz-serie-1)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </PanelGrafico>
  );
}

// W4 — estado de compras por día (barras apiladas, colores de estado)
export function GraficoComprasDiarias({ data }) {
  const puntos = data?.puntos ?? [];
  const total = puntos.reduce((s, p) => s + p.pendiente + p.confirmado + p.rechazado, 0);
  return (
    <PanelGrafico
      titulo="Compras por día"
      vacio="Sin compras en el periodo."
      tabla={{
        columnas: ['Día', 'Pendiente', 'Confirmado', 'Rechazado'],
        datos: total > 0 ? puntos : [],
        renderFila: (p) => (
          <tr key={p.dia}>
            <td>{p.dia}</td>
            <td>{p.pendiente}</td>
            <td>{p.confirmado}</td>
            <td>{p.rechazado}</td>
          </tr>
        ),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={puntos} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          {grid}
          <XAxis dataKey="dia" tickFormatter={fmtDiaCorto} tick={ejeTick} stroke="var(--border)" />
          <YAxis tick={ejeTick} stroke="var(--border)" allowDecimals={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="pendiente" stackId="a" fill="var(--warn)" name="Pendiente" />
          <Bar dataKey="confirmado" stackId="a" fill="var(--ok)" name="Confirmado" />
          <Bar dataKey="rechazado" stackId="a" fill="var(--danger)" name="Rechazado" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </PanelGrafico>
  );
}

// W5 — incidencias de recarga por recargador (barras agrupadas)
export function GraficoIncidenciasRecargador({ data }) {
  const filas = data ?? [];
  return (
    <PanelGrafico
      titulo="Incidencias de recarga por recargador"
      vacio="Sin incidencias registradas."
      tabla={{
        columnas: ['Recargador', 'Pendientes', 'Resueltas', 'Corregido a mano'],
        datos: filas,
        renderFila: (f) => (
          <tr key={f.recargadorId}>
            <td>{f.nombre}</td>
            <td>{f.pendientes}</td>
            <td>{f.resueltas}</td>
            <td>{fmtBs(f.ajusteTotal)}</td>
          </tr>
        ),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          {grid}
          <XAxis dataKey="nombre" tick={ejeTick} stroke="var(--border)" interval={0} />
          <YAxis tick={ejeTick} stroke="var(--border)" allowDecimals={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="pendientes" fill="var(--viz-serie-1)" name="Pendientes" radius={[3, 3, 0, 0]} />
          <Bar dataKey="resueltas" fill="var(--viz-serie-2)" name="Resueltas" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </PanelGrafico>
  );
}
