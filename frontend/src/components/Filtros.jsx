import './Filtros.css';

/**
 * Grupo de pastillas de filtro unificado del proyecto.
 * Se usa solo (listas sin buscador) o dentro de <Buscador> (que lo re-exporta
 * vía su prop `filtros`).
 *
 * @param {{ valor: string, texto: React.ReactNode, conteo?: number }[]} opciones
 * @param {string}   activo    valor seleccionado
 * @param {(valor) => void} onCambio
 * @param {string}   etiqueta  aria-label del grupo
 * @param {string}   className clases extra
 */
export default function Filtros({ opciones, activo, onCambio, etiqueta = 'Filtrar', className = '' }) {
  if (!opciones || opciones.length === 0) return null;

  return (
    <div className={`qp-filtros ${className}`.trim()} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          className={activo === o.valor ? 'is-on' : ''}
          aria-pressed={activo === o.valor}
          onClick={() => onCambio(o.valor)}
        >
          {o.texto}
          {o.conteo != null && <span className="qp-filtros__conteo">{o.conteo}</span>}
        </button>
      ))}
    </div>
  );
}
