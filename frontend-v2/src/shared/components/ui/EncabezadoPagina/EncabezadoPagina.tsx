/* Encabezado de una pantalla interna: descripción + acción primaria a la
 * derecha (Manual 4.4: una sola acción primaria por pantalla). El <h1> lo pone
 * el Header del layout; aquí va texto de apoyo y el CTA. */

import type { ReactNode } from 'react';
import styles from './EncabezadoPagina.module.css';

interface EncabezadoPaginaProps {
  descripcion?: string;
  accion?: ReactNode;
}

export function EncabezadoPagina({ descripcion, accion }: EncabezadoPaginaProps) {
  return (
    <div className={styles.encabezado}>
      {descripcion && <p className={styles.descripcion}>{descripcion}</p>}
      {accion && <div className={styles.accion}>{accion}</div>}
    </div>
  );
}
