import styles from './Spinner.module.css';

interface SpinnerProps {
  /** Tamaño en px. */
  tamano?: number;
  /** Texto para lectores de pantalla. */
  etiqueta?: string;
}

export function Spinner({ tamano = 24, etiqueta = 'Cargando' }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: tamano, height: tamano }}
      role="status"
      aria-label={etiqueta}
    />
  );
}
