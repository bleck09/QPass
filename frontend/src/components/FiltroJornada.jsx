import { useEffect, useRef, useState } from 'react';
import { FaChevronDown, FaSearch, FaCheck } from 'react-icons/fa';
import Filtros from './Filtros.jsx';
import './FiltroJornada.css';

// Hasta 5 jornadas -> pastillas (como el resto de filtros del proyecto).
// Más de 5 -> combobox con buscador adentro, para que no se llene la barra.
const MAX_PILDORAS = 5;

/**
 * @param {{ valor:string, texto:React.ReactNode, conteo?:number }[]} opciones
 *        Igual que `opcionesJornada(...)`: primera opción es {valor:'todas'}.
 * @param {string}          activo
 * @param {(valor)=>void}   onCambio
 * @param {string}          etiqueta  aria-label
 */
export default function FiltroJornada({ opciones = [], activo, onCambio, etiqueta = 'Filtrar por jornada' }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [abierto]);

  if (!opciones || opciones.length === 0) return null;

  const jornadas = opciones.filter((o) => o.valor !== 'todas');

  // Pocas jornadas: pastillas de siempre.
  if (jornadas.length <= MAX_PILDORAS) {
    return <Filtros opciones={opciones} activo={activo} onCambio={onCambio} etiqueta={etiqueta} />;
  }

  const opcionActiva = opciones.find((o) => o.valor === activo);
  const textoActivo = !activo || activo === 'todas' || !opcionActiva
    ? 'Todas las jornadas'
    : opcionActiva.texto;

  const t = q.trim().toLowerCase();
  const filtradas = t ? jornadas.filter((o) => String(o.texto).toLowerCase().includes(t)) : jornadas;

  const elegir = (valor) => {
    onCambio(valor);
    setAbierto(false);
    setQ('');
  };

  return (
    <div className="qp-filtro-jornada" ref={ref}>
      <button
        type="button"
        className={`qp-filtro-jornada__btn${activo && activo !== 'todas' ? ' is-on' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={etiqueta}
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="qp-filtro-jornada__val">{textoActivo}</span>
        <FaChevronDown aria-hidden="true" />
      </button>

      {abierto && (
        <div className="qp-filtro-jornada__pop">
          <div className="qp-filtro-jornada__buscar">
            <FaSearch aria-hidden="true" />
            <input
              type="search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar jornada…"
              aria-label="Buscar jornada"
            />
          </div>
          <ul className="qp-filtro-jornada__lista" role="listbox" aria-label={etiqueta}>
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!activo || activo === 'todas'}
                className={!activo || activo === 'todas' ? 'is-on' : ''}
                onClick={() => elegir('todas')}
              >
                <span className="qp-filtro-jornada__check">{(!activo || activo === 'todas') && <FaCheck aria-hidden="true" />}</span>
                <span className="qp-filtro-jornada__txt">Todas las jornadas</span>
              </button>
            </li>
            {filtradas.map((o) => (
              <li key={o.valor}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activo === o.valor}
                  className={activo === o.valor ? 'is-on' : ''}
                  onClick={() => elegir(o.valor)}
                >
                  <span className="qp-filtro-jornada__check">{activo === o.valor && <FaCheck aria-hidden="true" />}</span>
                  <span className="qp-filtro-jornada__txt">{o.texto}</span>
                  {o.conteo != null && <span className="qp-filtro-jornada__conteo">{o.conteo}</span>}
                </button>
              </li>
            ))}
            {filtradas.length === 0 && (
              <li className="qp-filtro-jornada__vacio">Ninguna jornada coincide</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
