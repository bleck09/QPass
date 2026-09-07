import { PRESETS_RANGO } from '../utils/rangoFechas.js';
import './SelectorRango.css';

export default function SelectorRango({ valor, onCambio, incluirTodo = true }) {
  const opciones = incluirTodo
    ? PRESETS_RANGO
    : PRESETS_RANGO.filter((p) => p.clave !== 'todo');
  return (
    <div className="qp-rango" role="group" aria-label="Rango de fechas">
      {opciones.map((p) => (
        <button
          key={p.clave}
          type="button"
          className={`qp-rango-chip ${valor === p.clave ? 'activo' : ''}`}
          aria-pressed={valor === p.clave}
          onClick={() => onCambio(p.clave)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
