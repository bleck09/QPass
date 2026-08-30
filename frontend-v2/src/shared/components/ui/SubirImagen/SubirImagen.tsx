/* ============================================================================
 * SubirImagen — elige un archivo de imagen y lo entrega como data URL (base64).
 * El backend guarda la cadena tal cual. Redimensiona a máx. 1024px de lado
 * para no mandar imágenes enormes en el body.
 * ========================================================================= */

import { useId, useRef, useState } from 'react';
import { Button } from '../Button';
import styles from './SubirImagen.module.css';

interface SubirImagenProps {
  label: string;
  valor?: string | null;
  onChange: (dataUrl: string | null) => void;
  hint?: string;
}

const MAX_LADO = 1024;

async function aDataUrlRedimensionada(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function SubirImagen({ label, valor, onChange, hint }: SubirImagenProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const alElegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      onChange(await aDataUrlRedimensionada(file));
    } catch {
      setError('No pudimos procesar esa imagen. Prueba con otra.');
    }
  };

  return (
    <div className={styles.campo}>
      <span className={styles.label} id={`${id}-label`}>
        {label}
      </span>

      <div className={styles.fila}>
        <div className={styles.preview} aria-hidden={!valor}>
          {valor ? <img src={valor} alt="Vista previa" /> : <span>Sin imagen</span>}
        </div>

        <div className={styles.acciones}>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-labelledby={`${id}-label`}
            onChange={alElegir}
          />
          <Button
            variante="secundario"
            tamano="sm"
            onClick={() => inputRef.current?.click()}
          >
            {valor ? 'Cambiar' : 'Elegir imagen'}
          </Button>
          {valor && (
            <Button
              variante="terciario"
              tamano="sm"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              Quitar
            </Button>
          )}
        </div>
      </div>

      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
