import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import Tabla from '../../components/Tabla.jsx';

const fmtBs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const fmtDiaCorto = (d) => {
  const [, m, day] = String(d).split('-');
  return `${day}/${m}`;
};

// Estilos comunes (se resuelven contra los tokens del tema → modo oscuro automático).
const ejeTick = { fill: 'var(--text-secondary)', fontSize: 11 };
const tooltipStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
};
const grid = <CartesianGrid vertical={false} stroke="var(--border)" />;

/** Marco: título + toggle Gráfico/Tabla. `tabla` = { columnas, datos, renderFila }. */
function PanelGrafico({ titulo, vacio, tabla, children }) {
  const [modo, setModo] = useState('grafico');
  const sinDatos = !tabla.datos || tabla.datos.length === 0;
  return (
    <div className="pi-adg-grafico">
      <div className="pi-adg-grafico-cab">
        <h4>{titulo}</h4>
        {!sinDatos && (
          <button
            type="button"
            className="pi-adg-grafico-toggle"
            onClick={() => setModo((m) => (m === 'grafico' ? 'tabla' : 'grafico'))}
          >
            {modo === 'grafico' ? 'Ver tabla' : 'Ver gráfico'}
          </button>
        )}
      </div>
      {sinDatos ? (
        <p className="pi-adg-nota-rango">{vacio}</p>
      ) : modo === 'tabla' ? (
        <Tabla columnas={tabla.columnas} datos={tabla.datos} renderFila={tabla.renderFila} porPagina={0} />
      ) : (
        <div className="pi-adg-grafico-body">{children}</div>
      )}
    </div>
  );
}

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

// W2 — recaudación por evento (top 10)
export function GraficoPorEvento({ data }) {
  const filas = data ?? [];
  return (
    <PanelGrafico
      titulo="Recaudación por evento (top 10)"
      vacio="Sin recaudación en el periodo."
      tabla={{
        columnas: ['Evento', 'Recaudado'],
        datos: filas,
        renderFila: (f) => (
          <tr key={f.eventoId}>
            <td>{f.nombre}</td>
            <td>{fmtBs(f.recaudado)}</td>
          </tr>
        ),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          {grid}
          <XAxis type="number" tick={ejeTick} stroke="var(--border)" tickFormatter={(v) => `Bs ${v}`} />
          <YAxis type="category" dataKey="nombre" tick={ejeTick} stroke="var(--border)" width={120} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtBs(v), 'Recaudado']} />
          <Bar dataKey="recaudado" fill="var(--viz-serie-1)" radius={[0, 3, 3, 0]} />
        </BarChart>
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
