/* ============================================================================
 * Estados obligatorios de toda lista/sección con datos dinámicos (Manual 8.9):
 * cargando (skeleton), vacío, error (con reintentar), sin resultados.
 * ========================================================================= */

import type { ReactNode } from 'react';
import { Button } from '@/shared/components/ui';
import { MENSAJES } from '@/shared/constants/mensajes';
import styles from './Estados.module.css';

/** Skeleton: bloques con la forma aproximada del contenido real. */
export function EstadoCargando({ filas = 4 }: { filas?: number }) {
  return (
    <div className={styles.skeletonLista} aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className={styles.skeletonFila} />
      ))}
    </div>
  );
}

interface EstadoVacioProps {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  icono?: ReactNode;
}

export function EstadoVacio({ titulo, descripcion, accion, icono }: EstadoVacioProps) {
  return (
    <div className={styles.centro}>
      {icono && (
        <div className={styles.icono} aria-hidden="true">
          {icono}
        </div>
      )}
      <p className={styles.titulo}>{titulo}</p>
      {descripcion && <p className={styles.descripcion}>{descripcion}</p>}
      {accion && <div className={styles.accion}>{accion}</div>}
    </div>
  );
}

interface EstadoErrorProps {
  mensaje?: string;
  onReintentar?: () => void;
}

export function EstadoError({ mensaje, onReintentar }: EstadoErrorProps) {
  return (
    <div className={styles.centro} role="alert">
      <div className={styles.icono} aria-hidden="true">
        ⚠
      </div>
      <p className={styles.titulo}>{mensaje ?? MENSAJES.ERROR_CARGA}</p>
      {onReintentar && (
        <div className={styles.accion}>
          <Button variante="secundario" onClick={onReintentar}>
            {MENSAJES.REINTENTAR}
          </Button>
        </div>
      )}
    </div>
  );
}
