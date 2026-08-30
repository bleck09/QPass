/* ============================================================================
 * Field / Input / Textarea / Select — Manual 8.3.
 * Todo input lleva <label> visible arriba, asociada por id. El placeholder NO
 * es la etiqueta. Error debajo, con icono. Foco visible siempre.
 * ========================================================================= */

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/shared/utils/cn';
import styles from './Field.module.css';

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
  opcional?: boolean;
  className?: string;
}

function Envoltura({
  id,
  label,
  hint,
  error,
  opcional,
  className,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn(styles.campo, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {opcional && <span className={styles.opcional}>(opcional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* --- Input --- */
type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, opcional, className, id, ...resto },
  ref,
) {
  const autoId = useId();
  const campoId = id ?? autoId;
  return (
    <Envoltura
      id={campoId}
      label={label}
      hint={hint}
      error={error}
      opcional={opcional}
      className={className}
    >
      <input
        ref={ref}
        id={campoId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${campoId}-error` : hint ? `${campoId}-hint` : undefined
        }
        className={cn(styles.control, error && styles.invalido)}
        {...resto}
      />
    </Envoltura>
  );
});

/* --- Textarea --- */
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, opcional, className, id, ...resto }, ref) {
    const autoId = useId();
    const campoId = id ?? autoId;
    return (
      <Envoltura
        id={campoId}
        label={label}
        hint={hint}
        error={error}
        opcional={opcional}
        className={className}
      >
        <textarea
          ref={ref}
          id={campoId}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${campoId}-error` : hint ? `${campoId}-hint` : undefined
          }
          className={cn(styles.control, styles.textarea, error && styles.invalido)}
          {...resto}
        />
      </Envoltura>
    );
  },
);

/* --- Select --- */
type SelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, opcional, className, id, children, ...resto },
  ref,
) {
  const autoId = useId();
  const campoId = id ?? autoId;
  return (
    <Envoltura
      id={campoId}
      label={label}
      hint={hint}
      error={error}
      opcional={opcional}
      className={className}
    >
      <select
        ref={ref}
        id={campoId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${campoId}-error` : hint ? `${campoId}-hint` : undefined
        }
        className={cn(styles.control, error && styles.invalido)}
        {...resto}
      >
        {children}
      </select>
    </Envoltura>
  );
});
