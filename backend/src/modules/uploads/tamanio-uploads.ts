import { Dirent, readdirSync, statSync } from 'fs';
import { join } from 'path';

/* ----------------------------------------------------------------------------
 * Tope total del volumen de /uploads — sin esto, un uso normal a lo largo de
 * meses (o alguien subiendo basura a propósito) podría llenar el disco del
 * servidor sin ningún freno. 10 GB con imágenes de hasta 8 MB (ver MAX_BYTES en
 * uploads.controller.ts) alcanza para miles de fotos/comprobantes.
 * -------------------------------------------------------------------------- */
export const LIMITE_TOTAL_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

// Suma recursiva del tamaño de todo lo que hay en el volumen (todas las carpetas:
// perfiles, comprobantes, eventos...). Se recalcula en cada subida — con archivos
// de pocos MB como mucho, es una vuelta rápida incluso con miles de ellos.
export const tamanioDirectorio = (dir: string): number => {
  let entradas: Dirent[];
  try {
    entradas = readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0; // todavía no existe (primera subida de la app) -> 0 bytes usados
  }

  let total = 0;
  for (const entrada of entradas) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      total += tamanioDirectorio(ruta);
    } else if (entrada.isFile()) {
      try {
        total += statSync(ruta).size;
      } catch {
        // se pudo haber borrado justo en el medio del conteo — se ignora
      }
    }
  }
  return total;
};
