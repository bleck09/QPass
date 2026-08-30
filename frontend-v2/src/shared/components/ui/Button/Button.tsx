/* ============================================================================
 * Button — jerarquía de 4 variantes (Manual 8.1, Anexo A A8).
 * El texto es siempre un VERBO. En carga: se deshabilita, muestra spinner y
 * conserva el ancho (no mueve el layout).
 * ========================================================================= */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import styles from './Button.module.css';

type Variante =
  | 'primario'
  | 'secundario'
  | 'terciario'
  | 'destructivo'
  | 'compra';
type Tamano = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  anchoCompleto?: boolean;
  cargando?: boolean;
  /** Icono a la izquierda del texto. Decorativo: no necesita label. */
  iconoIzq?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variante = 'primario',
    tamano = 'md',
    anchoCompleto = false,
    cargando = false,
    iconoIzq,
    disabled,
    children,
    className,
    type = 'button',
    ...resto
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled ?? cargando}
      aria-busy={cargando || undefined}
      className={cn(
        styles.base,
        styles[variante],
        tamano !== 'md' && styles[tamano],
        anchoCompleto && styles.anchoCompleto,
        cargando && styles.cargando,
        className,
      )}
      {...resto}
    >
      {cargando ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        iconoIzq && (
          <span aria-hidden="true" style={{ display: 'inline-flex' }}>
            {iconoIzq}
          </span>
        )
      )}
      {children}
    </button>
  );
});
