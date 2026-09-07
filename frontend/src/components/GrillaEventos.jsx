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
  gridClassName = 'pi-entrega-eventos-grid',
}) {
  const { paginaActual, setPagina, totalPaginas, slice, total } = usePaginacion(eventos, porPagina);

  if (total === 0) {
    return <p className="qp-grilla-eventos qp-grilla-eventos__vacio">{vacio}</p>;
  }

  return (
    <div className="qp-grilla-eventos">
      <div className={gridClassName}>
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
