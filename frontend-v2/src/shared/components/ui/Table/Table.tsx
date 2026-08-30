/* ============================================================================
 * Table — Manual 8.7. <table> semántico con <th scope>. El contenedor
 * scrollea en X con indicador; nunca scroll horizontal en el body de la página.
 * Números a la derecha con tabular-nums.
 * ========================================================================= */

import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';
import styles from './Table.module.css';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.tabla}>{children}</table>
    </div>
  );
}

export function Th({
  numerico,
  className,
  children,
  ...resto
}: ThHTMLAttributes<HTMLTableCellElement> & { numerico?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(styles.th, numerico && styles.numerico, className)}
      {...resto}
    >
      {children}
    </th>
  );
}

export function Td({
  numerico,
  className,
  children,
  ...resto
}: TdHTMLAttributes<HTMLTableCellElement> & { numerico?: boolean }) {
  return (
    <td className={cn(styles.td, numerico && styles.numerico, className)} {...resto}>
      {children}
    </td>
  );
}
