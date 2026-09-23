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
