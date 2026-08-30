/* Tipos genéricos del dominio, compartidos por varias features (Anexo B B7). */

/** Los montos viajan como string o number desde Prisma Decimal. */
export type Decimalish = string | number;

export interface RespuestaPaginada<T> {
  datos: T[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
