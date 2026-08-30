import type { ReactNode } from 'react';
import { config } from '@/lib/config';
import { cn } from '@/shared/utils/cn';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  titulo: string;
  subtitulo: string;
  ancho?: boolean;
  children: ReactNode;
}

export function AuthLayout({ titulo, subtitulo, ancho, children }: AuthLayoutProps) {
  return (
    <div className={styles.pagina}>
      <div className={cn(styles.card, ancho && styles.ancho)}>
        <div className={styles.marca}>
          <img src="/favicon.svg" alt="" />
          {config.appNombre}
        </div>
        <h1 className={styles.titulo}>{titulo}</h1>
        <p className={styles.subtitulo}>{subtitulo}</p>
        {children}
      </div>
    </div>
  );
}
