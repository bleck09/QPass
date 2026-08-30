/* Campo de formulario para los paneles glass oscuros de auth (port de Login.css).
 * Label en mayúsculas + icono a la izquierda + adorno opcional a la derecha. */

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import styles from './authDark.module.css';

interface CampoAuthProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  iconoIzq?: ReactNode;
  adornoDer?: ReactNode;
  error?: string;
  opcional?: boolean;
}

export const CampoAuth = forwardRef<HTMLInputElement, CampoAuthProps>(
  function CampoAuth(
    { label, iconoIzq, adornoDer, error, opcional, id, className, ...resto },
    ref,
  ) {
    const autoId = useId();
    const campoId = id ?? autoId;
    return (
      <div className={cn(styles.grupo, className)}>
        <label htmlFor={campoId} className={styles.label}>
          {label}
          {opcional && <span className={styles.opcional}>(opcional)</span>}
        </label>
        <div className={styles.wrapper}>
          <input
            ref={ref}
            id={campoId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${campoId}-err` : undefined}
            className={cn(styles.control, adornoDer ? styles.conAdorno : undefined)}
            {...resto}
          />
          {iconoIzq && <span className={styles.iconoIzq}>{iconoIzq}</span>}
          {adornoDer}
        </div>
        {error && (
          <p id={`${campoId}-err`} className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
