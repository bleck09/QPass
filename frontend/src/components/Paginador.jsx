import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './Paginador.css';

/**
 * Controles de paginación « / » usados por <Tabla> y por las grillas.
 * No renderiza nada si hay una sola página.
 *
 * @param {number}   pagina        índice de página actual (0-based)
 * @param {number}   totalPaginas
 * @param {Function} onCambio      (nuevaPagina:number) => void
 * @param {number}   total         total de elementos (para el texto "· N …")
 * @param {string}   unidad        etiqueta del total (por defecto "registros")
 */
export default function Paginador({ pagina, totalPaginas, onCambio, total, unidad = 'registros' }) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="qp-paginador">
      <button
        type="button"
        className="qp-paginador__btn"
        onClick={() => onCambio(Math.max(0, pagina - 1))}
        disabled={pagina === 0}
        aria-label="Página anterior"
      >
        <FaChevronLeft aria-hidden="true" />
      </button>
      <span className="qp-paginador__info">
        Página {pagina + 1} de {totalPaginas}
        {total != null && <span className="qp-paginador__total"> · {total} {unidad}</span>}
      </span>
      <button
        type="button"
        className="qp-paginador__btn"
        onClick={() => onCambio(Math.min(totalPaginas - 1, pagina + 1))}
        disabled={pagina === totalPaginas - 1}
        aria-label="Página siguiente"
      >
        <FaChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
