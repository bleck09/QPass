import { useCallback } from 'react';
import { FaBell } from 'react-icons/fa';
import { useApi } from '../utils/useApi.js';
import api from '../api/index.js';
import './AvisosStockPanel.css';

/**
 * Panel de avisos de stock que los ayudantes le mandan al Usuario Negocio
 * (producto sin stock / por agotarse). Se muestra en Mi Negocio y en el
 * Dashboard de negocio. No renderiza nada si no hay avisos sin leer.
 *
 * @param {number} max  cuántos listar antes del "…y N más" (por defecto 8)
 */
export default function AvisosStockPanel({ max = 8 }) {
  const cargar = useCallback(() => api.avisosStock.listar(), []);
  const { data: avisos, recargar } = useApi(cargar, { inicial: [] });

  if (!avisos.length) return null;

  const marcarTodos = async () => {
    try {
      await api.avisosStock.marcarTodosVistos();
      await recargar();
    } catch { /* noop */ }
  };

  return (
    <div className="qp-avisos-stock">
      <div className="qp-avisos-stock__head">
        <span className="qp-avisos-stock__titulo">
          <FaBell aria-hidden="true" /> {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'} de stock de tus ayudantes
        </span>
        <button type="button" className="btn-secundario-sm" onClick={marcarTodos}>
          Marcar todo como visto
        </button>
      </div>
      <ul className="qp-avisos-stock__lista">
        {avisos.slice(0, max).map(a => (
          <li key={a.id}>
            <span className={`qp-avisos-stock__chip${a.tipo === 'sin_stock' ? ' qp-avisos-stock__chip--rojo' : ''}`}>
              {a.tipo === 'sin_stock' ? 'Sin stock' : `Quedan ${a.stockRestante ?? '?'}`}
            </span>
            <strong>{a.productoNombre}</strong>
            <span className="qp-avisos-stock__meta">
              {a.puestoNombre} · {a.eventoNombre} · avisó {a.ayudanteNombre}
            </span>
          </li>
        ))}
        {avisos.length > max && (
          <li className="qp-avisos-stock__meta">…y {avisos.length - max} más.</li>
        )}
      </ul>
    </div>
  );
}
