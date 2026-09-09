import { FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Migas.css';

/**
 * Ruta de migas (breadcrumb) unificada, con el mismo look que el panel de Admin.
 * Cada item: { texto, to?, onClick? }. El último (o el que trae `actual: true`)
 * se pinta como actual y no es clickeable.
 *
 * @param {{texto: string, to?: string, onClick?: Function, actual?: boolean}[]} items
 */
export default function Migas({ items = [] }) {
  const navigate = useNavigate();
  return (
    <nav className="pi-migas" aria-label="Ubicación">
      {items.map((m, i) => {
        const esActual = m.actual || i === items.length - 1;
        const accion = m.onClick || (m.to ? () => navigate(m.to) : null);
        return (
          <span className="pi-migas-item" key={i}>
            {i > 0 && <FaChevronRight className="pi-migas-sep" aria-hidden="true" />}
            {accion && !esActual ? (
              <button type="button" className="pi-migas-crumb" onClick={accion}>{m.texto}</button>
            ) : (
              <span
                className={`pi-migas-crumb${esActual ? ' is-current' : ''}`}
                aria-current={esActual ? 'page' : undefined}
              >
                {m.texto}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
