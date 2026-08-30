/** Une clases CSS, ignorando falsy. `cn(styles.base, activo && styles.activo)`. */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ');
}
