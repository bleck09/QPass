import { useMemo, useState } from 'react';
import {
  FaStore, FaPlus, FaWallet, FaUndoAlt, FaTrashAlt, FaChevronDown, FaCalculator,
} from 'react-icons/fa';
import './EventoPuestos.css';
import Boton from '../../../components/Boton.jsx';
import Filtros from '../../../components/Filtros.jsx';
import SelectorCantidad from '../../../components/SelectorCantidad.jsx';

const PRODUCTOS_VISIBLES = 4;
const bs = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const productosActivos = (puesto) => (puesto.productos || []).filter((p) => p.activo !== false);

/**
 * "Qué vas a encontrar adentro": los puestos del evento con su menú y precios,
 * más una calculadora de saldo. Antes el menú solo se veía tocando las cajas
 * del mapa; acá se recorre como una carta y el asistente llega sabiendo
 * cuánto cargar en su manilla.
 *
 * La calculadora es solo una ayuda local: no reserva ni compra nada.
 */
export default function EventoPuestos({ puestos, diasParaRetiro }) {
  const conMenu = useMemo(() => puestos.filter((p) => productosActivos(p).length > 0), [puestos]);
  const categorias = useMemo(
    () => [...new Set(conMenu.map((p) => p.categoria).filter(Boolean))],
    [conMenu],
  );

  const [categoria, setCategoria] = useState(null);
  const [expandidos, setExpandidos] = useState(() => new Set());
  const [cantidades, setCantidades] = useState({});
  const [verDetalle, setVerDetalle] = useState(false);

  const visibles = categoria ? conMenu.filter((p) => p.categoria === categoria) : conMenu;

  // Índice clave -> {producto, puesto} para armar el presupuesto.
  const indice = useMemo(() => {
    const m = new Map();
    conMenu.forEach((pu) => productosActivos(pu).forEach((pr) => m.set(`${pu.id}:${pr.id}`, { pr, pu })));
    return m;
  }, [conMenu]);

  const items = Object.entries(cantidades)
    .filter(([clave, n]) => n > 0 && indice.has(clave))
    .map(([clave, n]) => ({ clave, n, ...indice.get(clave) }));
  const total = items.reduce((s, it) => s + Number(it.pr.precio) * it.n, 0);
  const unidades = items.reduce((s, it) => s + it.n, 0);

  const cambiar = (clave, delta) =>
    setCantidades((c) => ({ ...c, [clave]: Math.max(0, (c[clave] || 0) + delta) }));

  const alternar = (id) => setExpandidos((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  if (conMenu.length === 0) return null;

  return (
    <div>
      {categorias.length > 1 && (
        <Filtros
          className="ev-menu__filtros"
          etiqueta="Filtrar puestos por categoría"
          opciones={[{ valor: '', texto: 'Todos' }, ...categorias.map((c) => ({ valor: c, texto: c }))]}
          activo={categoria ?? ''}
          onCambio={(v) => setCategoria(v || null)}
        />
      )}

      <div className="ev-menu__layout">
        <ul className="ev-menu__puestos">
          {visibles.map((pu) => {
            const productos = productosActivos(pu);
            const abierto = expandidos.has(pu.id);
            const mostrados = abierto ? productos : productos.slice(0, PRODUCTOS_VISIBLES);
            const precios = productos.map((p) => Number(p.precio));
            return (
              <li key={pu.id} className="ev-menu__puesto">
                <div className="ev-menu__puesto-cab">
                  {pu.logo
                    ? <img src={pu.logo} alt="" width="56" height="56" loading="lazy" className="ev-menu__logo" />
                    : <span className="ev-menu__logo ev-menu__logo--vacio" aria-hidden="true"><FaStore /></span>}
                  <span className="ev-menu__puesto-txt">
                    <h3>{pu.nombre}</h3>
                    <span className="ev-menu__meta">
                      {pu.categoria && <em>{pu.categoria}</em>}
                      <span>Bs {bs.format(Math.min(...precios))} – {bs.format(Math.max(...precios))}</span>
                    </span>
                  </span>
                </div>
                {pu.descripcion && <p className="ev-menu__desc">{pu.descripcion}</p>}

                <ul className="ev-menu__productos">
                  {mostrados.map((pr) => {
                    const clave = `${pu.id}:${pr.id}`;
                    const n = cantidades[clave] || 0;
                    const agotado = pr.stock === 0;
                    return (
                      <li key={pr.id} className={`ev-menu__producto${agotado ? ' es-agotado' : ''}${n > 0 ? ' es-elegido' : ''}`}>
                        {pr.imagen && <img src={pr.imagen} alt="" width="40" height="40" loading="lazy" />}
                        <span className="ev-menu__prod-nombre">
                          {pr.nombre}
                          {agotado && <small>Agotado</small>}
                        </span>
                        <b className="ev-menu__precio">Bs {bs.format(Number(pr.precio))}</b>
                        {!agotado && (
                          <SelectorCantidad
                            tamano="sm"
                            ocultarEnCero
                            valor={n}
                            nombre={pr.nombre}
                            onMenos={() => cambiar(clave, -1)}
                            onMas={() => cambiar(clave, 1)}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>

                {productos.length > PRODUCTOS_VISIBLES && (
                  <button
                    type="button"
                    className="ev-menu__mas"
                    aria-expanded={abierto}
                    onClick={() => alternar(pu.id)}
                  >
                    {abierto ? 'Ver menos' : `Ver los ${productos.length} productos`}
                    <FaChevronDown aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <aside className={`ev-menu__presupuesto${unidades > 0 ? ' tiene-items' : ''}`} aria-labelledby="ev-presupuesto-titulo">
          <h3 id="ev-presupuesto-titulo"><FaCalculator aria-hidden="true" /> Tu presupuesto</h3>

          {unidades === 0 ? (
            <p className="ev-menu__vacio">
              Tocá <FaPlus aria-hidden="true" /> en los productos que pensás consumir y te
              decimos cuánto saldo cargar en tu manilla.
            </p>
          ) : (
            <>
              <button
                type="button"
                className="ev-menu__detalle-toggle"
                aria-expanded={verDetalle}
                onClick={() => setVerDetalle((v) => !v)}
              >
                {unidades} {unidades === 1 ? 'producto' : 'productos'}
                <FaChevronDown aria-hidden="true" />
              </button>
              <ul className={`ev-menu__items${verDetalle ? ' esta-abierto' : ''}`}>
                {items.map(({ clave, n, pr, pu }) => (
                  <li key={clave}>
                    <span>{n} × {pr.nombre}<small>{pu.nombre}</small></span>
                    <b>Bs {bs.format(Number(pr.precio) * n)}</b>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="ev-menu__total">
            <span>Total estimado</span>
            <strong key={total} className="ev-menu__total-num">Bs {bs.format(total)}</strong>
          </div>

          {unidades > 0 && (
            <>
              <p className="ev-menu__sugerencia">
                <FaWallet aria-hidden="true" />
                <span>Cargá <b>Bs {bs.format(total)}</b> en los puntos de recarga del evento y pagá todo con tu manilla.</span>
              </p>
              <Boton variante="fantasma" tamano="sm" icono={FaTrashAlt} className="ev-menu__vaciar" onClick={() => setCantidades({})}>
                Vaciar presupuesto
              </Boton>
            </>
          )}

          <p className="ev-menu__nota">
            <FaUndoAlt aria-hidden="true" />
            <span>
              Lo que no gastes te lo devolvemos: tenés hasta {diasParaRetiro} días
              después del evento para retirar tu saldo.
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}
