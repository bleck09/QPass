import { FaMagic, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { contraste } from '../utils/contraste.js';
import { PALETAS_LANDING } from '../constants/landingEvento.js';
import { AvisoFijo } from './Avisos.jsx';
import './EditorColores.css';

/*
  Editor de los 5 colores de la página de un evento: paletas listas + cada
  color a mano (cuadro + código hex) + chequeo de contraste. Único para Admin
  (Configurar página) y para el organizador (formulario de su propuesta).

    <EditorColores valores={config} onCambio={(parcial) => setConfig((c) => ({ ...c, ...parcial }))} idBase="cfg" />

  valores: objeto con colorFondo, colorTextoTitulo, colorTextoP, colorPrimario, colorBoton.
  onCambio(parcial): recibe solo las claves que cambiaron (una, o las 5 de una paleta).
  idBase: prefijo de los id de los inputs (para que no choquen en la página).
*/

const CLAVES_COLOR = ['colorPrimario', 'colorBoton', 'colorFondo', 'colorTextoTitulo', 'colorTextoP'];

const CAMPOS = [
  { clave: 'colorFondo', etiqueta: 'Fondo de la página' },
  { clave: 'colorTextoTitulo', etiqueta: 'Títulos' },
  { clave: 'colorTextoP', etiqueta: 'Textos generales' },
  { clave: 'colorPrimario', etiqueta: 'Acento (íconos, detalles)' },
  { clave: 'colorBoton', etiqueta: 'Botón principal' },
];

const mismaPaleta = (valores, paleta) =>
  CLAVES_COLOR.every((k) => String(valores[k]).toUpperCase() === paleta[k].toUpperCase());

// Selector de color: un cuadrado grande clickeable (el <input type="color">
// nativo va invisible encima) + un campo para tipear/pegar el código hex.
function CampoColor({ id, etiqueta, valor, onCambio }) {
  return (
    <div className="qp-colores__campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="qp-colores__picker">
        <span className="qp-colores__muestra" style={{ backgroundColor: valor }}>
          <input id={id} type="color" value={valor} onChange={(e) => onCambio(e.target.value)} />
        </span>
        <input
          type="text"
          className="qp-colores__hex"
          value={valor.toUpperCase()}
          onChange={(e) => onCambio(e.target.value)}
          maxLength={7}
          aria-label={`${etiqueta} (código hex)`}
        />
      </div>
    </div>
  );
}

export default function EditorColores({ valores, onCambio, idBase = 'color' }) {
  // Contraste de lo que se va a leer (WCAG: 4.5:1 para texto normal).
  const chequeos = [
    { etiqueta: 'Títulos sobre el fondo', valor: contraste(valores.colorTextoTitulo, valores.colorFondo) },
    { etiqueta: 'Textos sobre el fondo', valor: contraste(valores.colorTextoP, valores.colorFondo) },
    { etiqueta: 'Texto del botón', valor: contraste(valores.colorFondo, valores.colorBoton) },
  ];
  const problemas = chequeos.filter((c) => c.valor != null && c.valor < 4.5).length;

  return (
    <div className="qp-colores">
      <p className="texto-ayuda qp-colores__ayuda"><FaMagic aria-hidden="true" /> Elegí una paleta lista o ajustá cada color a mano.</p>
      <div className="qp-colores__paletas">
        {PALETAS_LANDING.map((p) => {
          const activa = mismaPaleta(valores, p);
          return (
            <button
              key={p.nombre}
              type="button"
              className={`qp-colores__paleta${activa ? ' activa' : ''}`}
              onClick={() => onCambio(Object.fromEntries(CLAVES_COLOR.map((k) => [k, p[k]])))}
              aria-pressed={activa}
            >
              <span className="qp-colores__paleta-muestra" style={{ background: p.colorFondo }} aria-hidden="true">
                <i style={{ background: p.colorTextoTitulo }} />
                <i style={{ background: p.colorPrimario }} />
                <i style={{ background: p.colorBoton }} />
              </span>
              {p.nombre}
            </button>
          );
        })}
      </div>

      <div className="qp-colores__grilla">
        {CAMPOS.map(({ clave, etiqueta }) => (
          <CampoColor
            key={clave}
            id={`${idBase}-${clave}`}
            etiqueta={etiqueta}
            valor={valores[clave]}
            onCambio={(v) => onCambio({ [clave]: v })}
          />
        ))}
      </div>

      <ul className="qp-colores__contraste" aria-label="Legibilidad de los colores">
        {chequeos.map(({ etiqueta, valor }) => {
          const ok = valor == null || valor >= 4.5;
          return (
            <li key={etiqueta} className={ok ? 'ok' : 'mal'}>
              {ok ? <FaCheckCircle aria-hidden="true" /> : <FaExclamationTriangle aria-hidden="true" />}
              <span>{etiqueta}</span>
              <b>{valor ? `${valor.toFixed(1)}:1` : '—'}</b>
              <em>{ok ? 'Se lee bien' : 'Poco contraste'}</em>
            </li>
          );
        })}
      </ul>
      {problemas > 0 && (
        <AvisoFijo tono="aviso">
          Algunos textos pueden costar leerse. Probá un fondo más oscuro o textos más claros
          (mínimo recomendado 4.5:1).
        </AvisoFijo>
      )}
    </div>
  );
}
