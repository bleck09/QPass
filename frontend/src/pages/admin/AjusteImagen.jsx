import { useRef, useState } from 'react';
import { FaCrosshairs, FaSearchPlus, FaAdjust, FaTint, FaUndo } from 'react-icons/fa';
import {
  normalizarAjusteImagen, esAjusteDefecto, RANGOS_AJUSTE_IMAGEN, AJUSTE_IMAGEN_DEFECTO,
} from '../../constants/landingEvento.js';
import './AjusteImagen.css';

// Encuadres rápidos: dónde queda el punto de interés en la foto.
const ENCUADRES = [
  { etiqueta: 'Arriba', x: 50, y: 20 },
  { etiqueta: 'Centro', x: 50, y: 50 },
  { etiqueta: 'Abajo', x: 50, y: 80 },
];

const CONTROLES = [
  { clave: 'zoom', etiqueta: 'Zoom', icono: FaSearchPlus, ayuda: 'Acerca la foto hacia el punto marcado.' },
  { clave: 'oscurecer', etiqueta: 'Oscurecer', icono: FaAdjust, ayuda: 'Ayuda a leer el texto sobre fotos claras.' },
  { clave: 'desenfoque', etiqueta: 'Desenfoque', icono: FaTint, ayuda: 'Suaviza fotos con mucho detalle.' },
];

/**
 * Ajuste de la imagen del encabezado: punto focal (qué parte de la foto
 * queda a la vista cuando se recorta), zoom, oscurecido y desenfoque.
 * El resultado se ve en vivo en la vista previa del editor.
 *
 * El punto focal se marca tocando o arrastrando sobre la foto, o con las
 * flechas del teclado cuando el marcador tiene foco.
 */
export default function AjusteImagen({ imagen, ajuste, onChange }) {
  const a = normalizarAjusteImagen(ajuste);
  const fotoRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  const cambiar = (parcial) => onChange({ ...a, ...parcial });

  const moverA = (e) => {
    const r = fotoRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
    const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)));
    cambiar({ x, y });
  };

  const teclado = (e) => {
    const paso = e.shiftKey ? 10 : 2;
    const delta = {
      ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso],
    }[e.key];
    if (!delta) return;
    e.preventDefault();
    cambiar({
      x: Math.min(100, Math.max(0, a.x + delta[0])),
      y: Math.min(100, Math.max(0, a.y + delta[1])),
    });
  };

  return (
    <div className="pi-ajimg">
      <div className="pi-ajimg-cab">
        <strong><FaCrosshairs aria-hidden="true" /> Ajustar la imagen</strong>
        {!esAjusteDefecto(a) && (
          <button type="button" className="pi-ajimg-reset" onClick={() => onChange(null)}>
            <FaUndo aria-hidden="true" /> Restablecer
          </button>
        )}
      </div>

      <p className="pi-ajimg-ayuda">
        Tocá o arrastrá sobre la foto para marcar la parte que tiene que quedar a la vista
        (por ejemplo, el escenario o el artista).
      </p>

      <div
        ref={fotoRef}
        className={`pi-ajimg-foto${arrastrando ? ' arrastrando' : ''}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setArrastrando(true);
          moverA(e);
        }}
        onPointerMove={(e) => { if (arrastrando) moverA(e); }}
        onPointerUp={() => setArrastrando(false)}
        onPointerCancel={() => setArrastrando(false)}
      >
        <img src={imagen} alt="" width="480" height="270" draggable="false" />
        {/* Guías de tercios: ayudan a ubicar el punto como en una cámara. */}
        <span className="pi-ajimg-tercios" aria-hidden="true" />
        <span
          className="pi-ajimg-marca"
          style={{ left: `${a.x}%`, top: `${a.y}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Punto focal de la imagen"
          aria-valuetext={`${a.x}% horizontal, ${a.y}% vertical`}
          aria-valuenow={a.x}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={teclado}
        />
      </div>

      <div className="pi-ajimg-encuadres" role="group" aria-label="Encuadres rápidos">
        {ENCUADRES.map((en) => (
          <button
            key={en.etiqueta}
            type="button"
            className={a.x === en.x && a.y === en.y ? 'activo' : ''}
            onClick={() => cambiar({ x: en.x, y: en.y })}
          >
            {en.etiqueta}
          </button>
        ))}
        <span className="pi-ajimg-coord">{a.x}% · {a.y}%</span>
      </div>

      <div className="pi-ajimg-controles">
        {CONTROLES.map(({ clave, etiqueta, icono: Icono, ayuda }) => {
          const { min, max, paso, unidad } = RANGOS_AJUSTE_IMAGEN[clave];
          const id = `ajimg-${clave}`;
          return (
            <div key={clave} className="pi-ajimg-control">
              <label htmlFor={id}>
                <Icono aria-hidden="true" /> {etiqueta}
                <b>{a[clave]}{unidad}</b>
              </label>
              <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={paso}
                value={a[clave]}
                onChange={(e) => cambiar({ [clave]: Number(e.target.value) })}
                onDoubleClick={() => cambiar({ [clave]: AJUSTE_IMAGEN_DEFECTO[clave] })}
                style={{ '--lleno': `${((a[clave] - min) / (max - min)) * 100}%` }}
              />
              <small>{ayuda}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
