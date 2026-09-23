import { CartesianGrid } from 'recharts';

/* Estilos/formatos compartidos entre los dashboards con gráficos (GraficosAdmin.jsx
 * = dashboard general, GraficosEvento.jsx = dashboard de un evento). En su propio
 * archivo (sin componentes) para no romper el Fast Refresh de los otros dos. */

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
