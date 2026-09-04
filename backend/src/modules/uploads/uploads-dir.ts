import { resolve } from 'path';

/* ----------------------------------------------------------------------------
 * Carpeta raíz donde se guardan todos los archivos subidos (fotos, comprobantes,
 * logos...). En producción es un volumen de Docker montado en UPLOADS_DIR (ver
 * docker-compose.yml); en desarrollo local, una carpeta "uploads" junto al
 * proyecto (gitignoreada).
 *
 * Se lee de process.env directo, NO de ConfigService/zod: esta función también
 * se usa dentro del "destination" de multer en uploads.controller.ts, que se
 * arma a nivel de decorador (al importarse el archivo) — antes de que Nest
 * termine de instanciar el ConfigModule — así que no puede depender de DI.
 * -------------------------------------------------------------------------- */
export const directorioUploads = (): string =>
  resolve(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
