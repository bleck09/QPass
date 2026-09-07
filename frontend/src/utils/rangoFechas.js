// Presets de rango de fechas para los selectores de dashboard. Los límites se
// calculan en horario local del navegador (que para el usuario es Bolivia) y se
// mandan como ISO al backend.

export const PRESETS_RANGO = [
  { clave: 'hoy', label: 'Hoy', dias: 0 },
  { clave: '7d', label: '7 días', dias: 7 },
  { clave: '30d', label: '30 días', dias: 30 },
  { clave: 'todo', label: 'Todo', dias: null },
];

/** Traduce un preset a { desde, hasta } ISO (o {} para "todo"). */
export function rangoDe(preset) {
  if (preset === 'todo') return {};
  const p = PRESETS_RANGO.find((x) => x.clave === preset) ?? PRESETS_RANGO[2];
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  if (p.dias > 0) desde.setDate(desde.getDate() - p.dias);
  const hasta = new Date();
  hasta.setHours(23, 59, 59, 999);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}
