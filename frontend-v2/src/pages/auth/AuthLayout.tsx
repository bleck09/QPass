import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { config } from '@/lib/config';
import { cn } from '@/shared/utils/cn';
import { RUTAS } from '@/shared/constants/rutas';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  titulo: string;
  subtitulo: string;
  ancho?: boolean;
  /** Contenido extra debajo de la card (ej. acordeón de credenciales). */
  extra?: ReactNode;
  children: ReactNode;
}

export function AuthLayout({
  titulo,
  subtitulo,
  ancho,
  extra,
  children,
}: AuthLayoutProps) {
  return (
    <div className={styles.pagina}>
      <div className={cn(styles.glow, styles.glowTL)} aria-hidden="true" />
      <div className={cn(styles.glow, styles.glowBR)} aria-hidden="true" />

      <div className={styles.topBar}>
        <Link to={RUTAS.INICIO} className={styles.volver}>
          <MdArrowBack size={20} /> Volver al inicio
        </Link>
      </div>

      <div className={styles.contenido}>
        <div className={cn(styles.card, ancho && styles.ancho)}>
          <div className={styles.marca}>
            <img src="/favicon.svg" alt="" />
            {config.appNombre}
          </div>
          <h1 className={styles.titulo}>{titulo}</h1>
          <p className={styles.subtitulo}>{subtitulo}</p>
          {children}
        </div>
        {extra}
      </div>
    </div>
  );
}
