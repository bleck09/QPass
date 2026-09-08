import { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from 'recharts';
import Tabla from '../../components/Tabla.jsx';

const ejeTick = { fill: 'var(--text-secondary)', fontSize: 11 };
const tooltipStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
};
const fmtHora = (h) => `${String(h).padStart(2, '0')}:00`;

/**
 * E1 + E2 — aforo dentro del recinto por hora (curva acumulada) con el
 * cronograma de la landing superpuesto como líneas de referencia.
 * `aforoPorHora` = [{ hora, dentro }]; `cronograma` = [{ hora, actividad }].
 */
export default function GraficoAforo({ aforoPorHora = [], cronograma = [], aforoMaximo }) {
  const [modo, setModo] = useState('grafico');
  const hayDatos = aforoPorHora.some((p) => p.dentro > 0);

  if (!hayDatos) {
    return (
      <div className="pi-cld-grafico">
        <h4 className="pi-cld-grafico-titulo">Aforo dentro del recinto por hora</h4>
        <p className="pi-cld-nota">Todavía no hay movimientos de puerta registrados.</p>
      </div>
    );
  }

  // Solo mostramos el tramo de horas con actividad para que la curva no quede aplastada.
  const conActividad = aforoPorHora.filter((p) => p.dentro > 0);
  const desde = Math.max(0, conActividad[0].hora - 1);
  const hasta = Math.min(23, conActividad[conActividad.length - 1].hora + 1);
  const datos = aforoPorHora.filter((p) => p.hora >= desde && p.hora <= hasta);

  return (
    <div className="pi-cld-grafico">
      <div className="pi-cld-grafico-cab">
        <h4 className="pi-cld-grafico-titulo">Aforo dentro del recinto por hora</h4>
        <button
          type="button"
          className="pi-cld-grafico-toggle"
          onClick={() => setModo((m) => (m === 'grafico' ? 'tabla' : 'grafico'))}
        >
          {modo === 'grafico' ? 'Ver tabla' : 'Ver gráfico'}
        </button>
      </div>

      {modo === 'tabla' ? (
        <Tabla
          columnas={['Hora', { texto: 'Personas dentro', align: 'center' }]}
          datos={datos}
          porPagina={0}
          renderFila={(p) => (
            <tr key={p.hora}>
              <td>{fmtHora(p.hora)}</td>
              <td style={{ textAlign: 'center' }}>{p.dentro}</td>
            </tr>
          )}
        />
      ) : (
        <div className="pi-cld-grafico-body">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datos} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="hora" tickFormatter={fmtHora} tick={ejeTick} stroke="var(--border)" />
              <YAxis tick={ejeTick} stroke="var(--border)" width={44} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [v, 'Personas dentro']}
                labelFormatter={fmtHora}
              />
              {aforoMaximo > 0 && (
                <ReferenceLine
                  y={aforoMaximo}
                  stroke="var(--danger)"
                  strokeDasharray="6 4"
                  label={{ value: `Aforo ${aforoMaximo}`, position: 'insideTopRight', fill: 'var(--danger)', fontSize: 11 }}
                />
              )}
              {cronograma.map((c, i) => (
                <ReferenceLine
                  key={`${c.hora}-${i}`}
                  x={c.hora}
                  stroke="var(--text-muted)"
                  strokeDasharray="3 3"
                  label={{ value: c.actividad?.slice(0, 18) || c.horaTexto, position: 'top', fill: 'var(--text-muted)', fontSize: 10 }}
                />
              ))}
              <Area
                type="monotone"
                dataKey="dentro"
                stroke="var(--viz-serie-1)"
                strokeWidth={2}
                fill="var(--viz-serie-1)"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
