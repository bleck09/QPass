import Paginador from './Paginador.jsx';
import { usePaginacion } from '../utils/usePaginacion.js';
import './Tabla.css';

/**
 * Tabla unificada del proyecto (Manual: "una tabla, un componente").
 * Marco + cabecera + borde + hover + estado vacío + paginación, todo con
 * tokens. Cada página solo aporta el contenido de sus filas.
 *
 * @param {(string | { texto, align?: 'left'|'right'|'center', srOnly?: boolean })[]} columnas
 *        Cabeceras. String suelto = título simple.
 * @param {any[]}    datos       Filas ya filtradas/ordenadas por la página.
 * @param {(item, indiceReal) => React.ReactNode} renderFila  Debe devolver un <tr key=…>.
 * @param {number}   porPagina   Filas por página. 0 = sin paginar. Por defecto 10.
 * @param {React.ReactNode} vacio  Mensaje cuando no hay datos.
 * @param {string}   className   Clases extra para el contenedor.
 * @param {string}   claseTabla  Clases extra para el <table> (compat. con estilos de página).
 * @param {React.ReactNode} pie   Fila(s) extra al final del <tbody> (ej. totales). Solo si hay datos.
 * @param {boolean}  card        Envuelve la tabla en una superficie (borde + sombra). Por
 *                               defecto va "plana": úsalo solo si el contenedor padre no es ya una card.
 */
export default function Tabla({
  columnas,
  datos,
  renderFila,
  porPagina = 10,
  vacio = 'No hay datos para mostrar.',
  className = '',
  claseTabla = '',
  pie = null,
  card = false,
}) {
  const cols = columnas.map((c) => (typeof c === 'string' ? { texto: c } : c));
  const { paginaActual, setPagina, totalPaginas, paginado, slice, total } = usePaginacion(datos, porPagina);
  const desde = paginaActual * porPagina;

  return (
    <div className={`qp-tabla-wrap ${card ? 'qp-tabla-wrap--card' : ''} ${className}`.trim()}>
      <div className="qp-tabla-scroll">
        <table className={`qp-tabla ${claseTabla}`.trim()}>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i} scope="col" style={c.align ? { textAlign: c.align } : undefined}>
                  {c.srOnly ? <span className="sr-only">{c.texto}</span> : c.texto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {total === 0 ? (
              <tr>
                <td colSpan={cols.length} className="qp-tabla__vacio">{vacio}</td>
              </tr>
            ) : (
              <>
                {slice.map((item, i) => renderFila(item, paginado ? desde + i : i))}
                {pie}
              </>
            )}
          </tbody>
        </table>
      </div>

      <Paginador
        pagina={paginaActual}
        totalPaginas={totalPaginas}
        onCambio={setPagina}
        total={total}
      />
    </div>
  );
}
