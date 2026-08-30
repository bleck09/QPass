/* Alerta en línea — Manual 8.8. Icono + color + texto (nunca solo color). */

import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import styles from './Alert.module.css';

type TipoAlerta = 'info' | 'exito' | 'aviso' | 'error';

const ICONO: Record<TipoAlerta, string> = {
  info: 'ℹ',
  exito: '✓',
  aviso: '⚠',
  error: '✕',
};

interface AlertProps {
  tipo?: TipoAlerta;
  titulo?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({ tipo = 'info', titulo, children, className }: AlertProps) {
  return (
    <div
      className={cn(styles.alerta, styles[tipo], className)}
      role={tipo === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.icono} aria-hidden="true">
        {ICONO[tipo]}
      </span>
      <div className={styles.contenido}>
        {titulo && <p className={styles.titulo}>{titulo}</p>}
        <div className={styles.texto}>{children}</div>
      </div>
    </div>
  );
}
