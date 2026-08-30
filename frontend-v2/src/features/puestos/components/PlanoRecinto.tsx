/* ============================================================================
 * PlanoRecinto — lienzo visual del recinto. En modo diseño, cada elemento se
 * mueve y se redimensiona: arrastrando con el puntero, o —alternativa de un
 * solo toque exigida por WCAG 2.2 (2.5.7)— con el teclado:
 *   · Flechas         → mover 10 px
 *   · Shift + flechas → redimensionar 10 px
 * Fuera de modo diseño el plano es de solo lectura.
 * ========================================================================= */

import { useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';
import type { Puesto } from '../puestos';
import styles from './PlanoRecinto.module.css';

/** Tamaño lógico del lienzo. Las coordenadas se guardan en este espacio. */
const LIENZO_ANCHO = 960;
const LIENZO_ALTO = 600;
const PASO_TECLADO = 10;
const TAMANO_MIN = 50;

interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

interface Props {
  puestos: Puesto[];
  /** true en el Diseñador (arrastrar/redimensionar). false = solo lectura. */
  modoDiseno: boolean;
  /** Solo en modo diseño. */
  onMover?: (id: string, x: number, y: number) => void;
  onRedimensionar?: (id: string, ancho: number, alto: number) => void;
  onEditar?: (puesto: Puesto) => void;
  /** Solo lectura: clic en un elemento (p. ej. abrir su ficha en la landing). */
  onSeleccionar?: (puesto: Puesto) => void;
}

const clamp = (valor: number, min: number, max: number) =>
  Math.min(max, Math.max(min, valor));

export function PlanoRecinto({
  puestos,
  modoDiseno,
  onMover,
  onRedimensionar,
  onEditar,
  onSeleccionar,
}: Props) {
  const lienzoRef = useRef<HTMLDivElement>(null);
  // Posición "en vivo" mientras se arrastra; al soltar se confirma al servidor.
  const [borrador, setBorrador] = useState<{ id: string; rect: Rect } | null>(null);
  const gesto = useRef<
    | { tipo: 'mover' | 'redimensionar'; id: string; inicioX: number; inicioY: number; rect: Rect }
    | null
  >(null);
  // Distingue un arrastre real de un clic simple (que abre la edición).
  const huboArrastre = useRef(false);

  const rectDe = (p: Puesto): Rect =>
    borrador?.id === p.id
      ? borrador.rect
      : { x: p.x, y: p.y, ancho: p.ancho, alto: p.alto };

  /** Factor entre el lienzo lógico y su tamaño renderizado (puede escalar). */
  const escala = () => {
    const nodo = lienzoRef.current;
    return nodo ? nodo.getBoundingClientRect().width / LIENZO_ANCHO : 1;
  };

  const iniciarGesto = (
    e: React.PointerEvent,
    tipo: 'mover' | 'redimensionar',
    p: Puesto,
  ) => {
    if (!modoDiseno) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    huboArrastre.current = false;
    gesto.current = {
      tipo,
      id: p.id,
      inicioX: e.clientX,
      inicioY: e.clientY,
      rect: rectDe(p),
    };
    setBorrador({ id: p.id, rect: rectDe(p) });
  };

  const alMover = (e: React.PointerEvent) => {
    const g = gesto.current;
    if (!g) return;
    const factor = escala() || 1;
    const dx = (e.clientX - g.inicioX) / factor;
    const dy = (e.clientY - g.inicioY) / factor;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) huboArrastre.current = true;

    if (g.tipo === 'mover') {
      setBorrador({
        id: g.id,
        rect: {
          ...g.rect,
          x: clamp(g.rect.x + dx, 0, LIENZO_ANCHO - g.rect.ancho),
          y: clamp(g.rect.y + dy, 0, LIENZO_ALTO - g.rect.alto),
        },
      });
    } else {
      setBorrador({
        id: g.id,
        rect: {
          ...g.rect,
          ancho: clamp(g.rect.ancho + dx, TAMANO_MIN, LIENZO_ANCHO - g.rect.x),
          alto: clamp(g.rect.alto + dy, TAMANO_MIN, LIENZO_ALTO - g.rect.y),
        },
      });
    }
  };

  const alSoltar = () => {
    const g = gesto.current;
    const b = borrador;
    gesto.current = null;
    setBorrador(null);
    // Sin arrastre real fue un clic: no se toca el servidor (lo maneja onClick).
    if (!g || !b || !huboArrastre.current) return;
    if (g.tipo === 'mover') onMover?.(g.id, Math.round(b.rect.x), Math.round(b.rect.y));
    else onRedimensionar?.(g.id, Math.round(b.rect.ancho), Math.round(b.rect.alto));
  };

  const alTeclado = (e: React.KeyboardEvent, p: Puesto) => {
    const dir: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const paso = dir[e.key];
    if (!paso) return;
    e.preventDefault();
    const r = rectDe(p);
    if (e.shiftKey) {
      onRedimensionar?.(
        p.id,
        clamp(r.ancho + paso[0] * PASO_TECLADO, TAMANO_MIN, LIENZO_ANCHO - r.x),
        clamp(r.alto + paso[1] * PASO_TECLADO, TAMANO_MIN, LIENZO_ALTO - r.y),
      );
    } else {
      onMover?.(
        p.id,
        clamp(r.x + paso[0] * PASO_TECLADO, 0, LIENZO_ANCHO - r.ancho),
        clamp(r.y + paso[1] * PASO_TECLADO, 0, LIENZO_ALTO - r.alto),
      );
    }
  };

  const visibles = puestos.filter((p) => p.estadoActivo);

  return (
    <div className={styles.marco}>
      <div
        ref={lienzoRef}
        className={cn(styles.lienzo, modoDiseno && styles.lienzoActivo)}
        style={{ aspectRatio: `${LIENZO_ANCHO} / ${LIENZO_ALTO}` }}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerLeave={alSoltar}
      >
        {visibles.map((p) => {
          const r = rectDe(p);
          const estilo = {
            left: `${(r.x / LIENZO_ANCHO) * 100}%`,
            top: `${(r.y / LIENZO_ALTO) * 100}%`,
            width: `${(r.ancho / LIENZO_ANCHO) * 100}%`,
            height: `${(r.alto / LIENZO_ALTO) * 100}%`,
          };
          const contenido = (
            <>
              {p.logo ? (
                <span
                  className={styles.fondoImg}
                  style={{ backgroundImage: `url(${p.logo})` }}
                  aria-hidden="true"
                />
              ) : null}
              <span className={styles.etiqueta}>
                <strong>{p.nombre}</strong>
                {p.categoria && <span className={styles.categoria}>{p.categoria}</span>}
              </span>
            </>
          );

          if (!modoDiseno) {
            if (onSeleccionar) {
              return (
                <button
                  key={p.id}
                  type="button"
                  className={cn(styles.caja, styles.cajaEnlace)}
                  style={estilo}
                  aria-label={`Ver ${p.nombre}`}
                  onClick={() => onSeleccionar(p)}
                >
                  {contenido}
                </button>
              );
            }
            return (
              <div key={p.id} className={styles.caja} style={estilo}>
                {contenido}
              </div>
            );
          }

          return (
            <button
              key={p.id}
              type="button"
              className={cn(styles.caja, styles.cajaDiseno)}
              style={estilo}
              aria-label={`${p.nombre}. Flechas para mover, Shift y flechas para redimensionar, Enter para editar`}
              onPointerDown={(e) => iniciarGesto(e, 'mover', p)}
              onKeyDown={(e) => alTeclado(e, p)}
              onClick={() => {
                // Un clic sin arrastre previo abre la edición.
                if (huboArrastre.current) huboArrastre.current = false;
                else onEditar?.(p);
              }}
            >
              {contenido}
              <span
                className={styles.tirador}
                aria-hidden="true"
                onPointerDown={(e) => iniciarGesto(e, 'redimensionar', p)}
              />
            </button>
          );
        })}
      </div>

      {modoDiseno && (
        <p className={styles.leyenda}>
          Arrastra un elemento para moverlo o tira de su esquina para
          redimensionarlo. Con el teclado: <kbd>←↑↓→</kbd> mueven,{' '}
          <kbd>Shift</kbd> + flechas redimensionan, <kbd>Enter</kbd> abre la edición.
        </p>
      )}
    </div>
  );
}
