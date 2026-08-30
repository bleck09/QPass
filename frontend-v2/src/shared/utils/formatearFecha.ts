/* Formateo de fechas. La fecha viaja como string ISO; se convierte a Date solo
 * aquí, al mostrar (Anexo B B7). */

const F_FECHA = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const F_FECHA_HORA = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : F_FECHA.format(d);
}

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : F_FECHA_HORA.format(d);
}
