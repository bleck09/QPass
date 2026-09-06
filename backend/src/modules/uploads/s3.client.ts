import { S3Client } from '@aws-sdk/client-s3';

/* ----------------------------------------------------------------------------
 * Cliente S3 para el almacenamiento de imágenes. Antes las imágenes eran
 * archivos en un volumen montado en el propio backend; ahora viven en un
 * contenedor aparte (MinIO en producción — ver docker-compose.yml — o cualquier
 * S3 compatible). El backend queda sin estado: un redeploy no toca las fotos.
 *
 * Se lee de process.env directo, NO de ConfigService: igual que uploads-dir.ts
 * antes, este módulo lo usa el "storage" de multer en uploads.controller.ts, que
 * se arma a nivel de decorador (al importarse el archivo) — antes de que Nest
 * instancie el ConfigModule — así que no puede depender de DI. Las variables ya
 * se validan al arrancar en config/env.validation.ts.
 * -------------------------------------------------------------------------- */

export const BUCKET_UPLOADS = process.env.S3_BUCKET || 'qpass-uploads';

let cliente: S3Client | null = null;

export const clienteS3 = (): S3Client => {
  if (!cliente) {
    cliente = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      // MinIO / S3 autohospedado: endpoint propio + path-style obligatorio
      // (no soporta el "bucket.host" de virtual-hosted que usa AWS).
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    });
  }
  return cliente;
};

// De "/uploads/perfiles/xxx.jpg" (lo que guarda la BD y pide el navegador) al
// key real del objeto: "perfiles/xxx.jpg". Sin barra inicial, sin el prefijo
// "/uploads". decodeURIComponent por si el nombre trajera algo escapado.
export const keyDesdeRuta = (rutaPath: string): string =>
  decodeURIComponent(rutaPath.replace(/^\/+/, ''));
