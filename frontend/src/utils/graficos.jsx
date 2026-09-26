import { CartesianGrid } from 'recharts';

/* Estilos/formatos de gráficos (recharts) ÚNICOS para todos los dashboards:
 * general y por evento (Admin) y el del organizador (Cliente). Antes Cliente
 * tenía su propia copia. Sin componentes: no rompe el Fast Refresh. */

export const fmtBs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;

// Se resuelven contra los tokens del tema -> modo oscuro automático.
export const ejeTick = { fill: 'var(--text-secondary)', fontSize: 11 };
export const tooltipStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
};
export const grid = <CartesianGrid vertical={false} stroke="var(--border)" />;

// Paleta categórica de donas/rankings: orden FIJO (el color sigue a la
// entidad, nunca al ranking). Más de 5 -> se agrupan en "Otros" (gris).
export const vizCategorica = [
  'var(--viz-serie-1)', 'var(--viz-serie-2)', 'var(--viz-serie-3)',
  'var(--viz-serie-4)', 'var(--viz-serie-5)',
];
export const vizOtros = 'var(--text-muted)';

// Color de la línea/área de un KPI según su tono (mismo mapeo que StatCard).
export const colorTono = {
  neutral: 'var(--viz-serie-1)',
  total: 'var(--indigo-profundo)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--accent)',
};

// Variación relativa actual vs. anterior (null si no hay base).
export const variacionDe = (actual, anterior) =>
  anterior == null || Number(anterior) === 0 ? null : (Number(actual) - Number(anterior)) / Number(anterior);
