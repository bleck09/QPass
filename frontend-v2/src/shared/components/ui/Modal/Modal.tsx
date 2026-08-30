/* ============================================================================
 * Modal — Manual 8.6. Usa <dialog> nativo: foco atrapado, ESC cierra y el foco
 * vuelve al disparador, todo sin librería. Se cierra también con clic en el
 * fondo. El body no scrollea mientras está abierto.
 * ========================================================================= */

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '../Button';
import styles from './Modal.module.css';

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  /** Botones de acción (pie del modal). Primario a la derecha.
   * `null` = sin pie (el contenido trae sus propios botones). */
  acciones?: ReactNode | null;
  /** Si hay datos sin guardar, el clic fuera pide confirmación (Manual 8.6). */
  bloquearCierreFuera?: boolean;
}

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  acciones,
  bloquearCierreFuera = false,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const tituloId = useId();

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (abierto && !dlg.open) {
      dlg.showModal();
      document.body.style.overflow = 'hidden';
    } else if (!abierto && dlg.open) {
      dlg.close();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [abierto]);

  const handleClicFondo = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (bloquearCierreFuera) return;
    if (e.target === ref.current) onCerrar();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={handleClicFondo}
      aria-labelledby={tituloId}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id={tituloId} className={styles.titulo}>
            {titulo}
          </h2>
          <button
            type="button"
            className={styles.cerrar}
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className={styles.cuerpo}>{children}</div>

        {acciones !== null && (
          <footer className={styles.pie}>
            {acciones ?? (
              <Button variante="secundario" onClick={onCerrar}>
                Cerrar
              </Button>
            )}
          </footer>
        )}
      </div>
    </dialog>
  );
}
