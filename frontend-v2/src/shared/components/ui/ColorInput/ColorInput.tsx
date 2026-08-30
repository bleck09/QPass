/* Selector de color: swatch nativo + campo hex sincronizado. Pensado para
 * integrarse con react-hook-form via `value`/`onChange`. */

import { forwardRef, useId } from 'react';
import styles from './ColorInput.module.css';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}

export const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  function ColorInput({ label, value, onChange, error }, _ref) {
    const id = useId();
    return (
      <div className={styles.campo}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <div className={styles.fila}>
          <input
            type="color"
            className={styles.swatch}
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label}: selector`}
          />
          <input
            id={id}
            type="text"
            className={styles.hex}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            aria-invalid={error ? true : undefined}
          />
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
