import { FaSearch, FaTimes } from 'react-icons/fa';
import Filtros from './Filtros.jsx';
import './Buscador.css';

/*
  Buscador + filtros REUTILIZABLE. Reemplaza los "X-buscador" / "X-filtros" / "X-tabs"
  copiados a mano en cada panel (Supervisor, Recargador, Devolución, Admin,
  Usuario Negocio, Ayudante…). El filtrado de la lista lo sigue haciendo la
  página; esto es solo el control.

  Uso mínimo:
    <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar…" />

  Con filtros (pastillas, con conteo opcional) y un botón de acción a la derecha:
    <Buscador
      valor={busqueda}
      onCambio={setBusqueda}
      placeholder="Buscar usuario…"
      filtros={[
        { valor: 'todos', texto: 'Todos', conteo: 11 },
        { valor: 'cliente', texto: 'Cliente', conteo: 1 },
      ]}
      filtroActivo={filtro}
      onFiltro={setFiltro}
      etiquetaFiltros="Filtrar por rol"
      acciones={<button className="…" onClick={…}>Nuevo</button>}
    />

  Props:
    valor          string           texto de búsqueda (controlado).
    onCambio       (texto) => void  nuevo texto (también con la X de limpiar).
    placeholder    string
    etiqueta       string           aria-label del input (default: placeholder).
    filtros        {valor, texto, conteo?}[]  pastillas de filtro (opcional).
    filtroActivo   string           valor del filtro seleccionado.
    onFiltro       (valor) => void
    etiquetaFiltros string          aria-label del grupo de pastillas.
    acciones       ReactNode        slot a la derecha (ej. botón "Nuevo …").
    autoFocus      bool
*/
export default function Buscador({
  valor,
  onCambio,
  placeholder = 'Buscar…',
  etiqueta,
  filtros,
  filtroActivo,
  onFiltro,
  etiquetaFiltros = 'Filtrar',
  acciones,
  autoFocus = false,
}) {
  return (
    <div className="qp-buscador">
      <div className="qp-buscador__box">
        <FaSearch className="qp-buscador__icon" aria-hidden="true" />
        <input
          type="search"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder={placeholder}
          aria-label={etiqueta || placeholder}
          autoFocus={autoFocus}
        />
        {valor ? (
          <button
            type="button"
            className="qp-buscador__clear"
            onClick={() => onCambio('')}
            aria-label="Limpiar búsqueda"
          >
            <FaTimes aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <Filtros
        opciones={filtros}
        activo={filtroActivo}
        onCambio={onFiltro}
        etiqueta={etiquetaFiltros}
      />

      {acciones ? <div className="qp-buscador__acciones">{acciones}</div> : null}
    </div>
  );
}
