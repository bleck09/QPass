import { useEffect, useRef, useState } from 'react';
import Paginador from './Paginador.jsx';
import { usePaginacion } from '../utils/usePaginacion.js';
import './GrillaEventos.css';

/**
 * Grilla de tarjetas de evento con paginación (Manual: "una card, un componente").
 * Envuelve el grid + <Paginador> + estado vacío. Cada vista aporta el render de
 * la tarjeta como render-prop.
 *
 * @param {any[]}    eventos    lista ya filtrada por el buscador/filtros de la vista
 * @param {(evento) => React.ReactNode} children  render-prop: devuelve un <EventoCard key=…>
 * @param {number}   porPagina  tarjetas por página (por defecto 9); el paginador se oculta si sobra
 * @param {React.ReactNode} vacio  mensaje cuando la lista filtrada queda vacía
 * @param {string}   gridClassName  clase del contenedor grid (una por vista, ya existente)
 */
export default function GrillaEventos({
  eventos,
  children,
  porPagina = 9,
  vacio = 'Ningún evento coincide con la búsqueda.',
  gridClassName = 'qp-grilla-eventos__grid',
}) {
  // Las columnas dependen del ancho (auto-fill): con 9 por página y 4
  // columnas quedaba una última fila con una sola tarjeta. Se mide la grilla y
  // se redondea `porPagina` a filas completas (9 → 8 con 4 columnas).
  const refGrid = useRef(null);
  const [columnas, setColumnas] = useState(1);
  useEffect(() => {
    const nodo = refGrid.current;
    if (!nodo || typeof ResizeObserver === 'undefined') return;
    const medir = () => {
      const n = getComputedStyle(nodo).gridTemplateColumns.split(' ').filter(Boolean).length;
      setColumnas(Math.max(1, n));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(nodo);
    return () => obs.disconnect();
  });
  const porPaginaFilas = porPagina > 0
    ? Math.max(columnas, Math.round(porPagina / columnas) * columnas)
    : porPagina;

  const { paginaActual, setPagina, totalPaginas, slice, total } = usePaginacion(eventos, porPaginaFilas);

  if (total === 0) {
    return <p className="qp-grilla-eventos qp-grilla-eventos__vacio">{vacio}</p>;
  }

  return (
    <div className="qp-grilla-eventos">
      <div ref={refGrid} className={gridClassName}>
        {slice.map((ev) => children(ev))}
      </div>
      <Paginador
        pagina={paginaActual}
        totalPaginas={totalPaginas}
        onCambio={setPagina}
        total={total}
        unidad="eventos"
      />
    </div>
  );
}
