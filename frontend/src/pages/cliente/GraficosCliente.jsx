import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from 'recharts';
import PanelGrafico from '../../components/PanelGrafico.jsx';
import { ejeTick, tooltipStyle } from '../../utils/graficos.jsx';

const fmtHora = (h) => `${String(h).padStart(2, '0')}:00`;

/**
 * E1 + E2 — aforo dentro del recinto por hora (curva acumulada) con el
 * cronograma de la landing superpuesto como líneas de referencia.
 * `aforoPorHora` = [{ hora, dentro }]; `cronograma` = [{ hora, actividad }].
 */
export default function GraficoAforo({ aforoPorHora = [], cronograma = [], aforoMaximo }) {
  const hayDatos = aforoPorHora.some((p) => p.dentro > 0);

  // Solo el tramo de horas con actividad, para que la curva no quede aplastada.
  const conActividad = aforoPorHora.filter((p) => p.dentro > 0);
  const datos = hayDatos
    ? aforoPorHora.filter((p) => p.hora >= Math.max(0, conActividad[0].hora - 1)
      && p.hora <= Math.min(23, conActividad[conActividad.length - 1].hora + 1))
    : [];

  return (
    <PanelGrafico
      titulo="Aforo dentro del recinto por hora"
      vacio="Todavía no hay movimientos de puerta registrados"
      tabla={{
        columnas: ['Hora', { texto: 'Personas dentro', align: 'center' }],
        datos,
        renderFila: (p) => (
          <tr key={p.hora}>
            <td>{fmtHora(p.hora)}</td>
            <td className="td-centro">{p.dentro}</td>
          </tr>
        ),
      }}
    >
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
    </PanelGrafico>
  );
}
