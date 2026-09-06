import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { BUCKET_UPLOADS, clienteS3 } from './s3.client';

/* ----------------------------------------------------------------------------
 * Tope total del almacenamiento de /uploads — sin esto, un uso normal a lo largo
 * de meses (o alguien subiendo basura a propósito) podría llenar el disco sin
 * ningún freno. 10 GB con imágenes de hasta 8 MB (ver MAX_BYTES en
 * uploads.controller.ts) alcanza para miles de fotos/comprobantes.
 * -------------------------------------------------------------------------- */
export const LIMITE_TOTAL_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

// Suma el tamaño de todos los objetos del bucket. Se recalcula en cada subida —
// con archivos de pocos MB, ListObjectsV2 pagina de a 1000 y son un puñado de
// llamadas incluso con miles de objetos (igual que la vuelta recursiva al disco
// que hacía antes).
export const tamanioBucket = async (): Promise<number> => {
  let total = 0;
  let token: string | undefined;

  do {
    const respuesta = await clienteS3().send(
      new ListObjectsV2Command({
        Bucket: BUCKET_UPLOADS,
        ContinuationToken: token,
      }),
    );
    for (const objeto of respuesta.Contents ?? []) {
      total += objeto.Size ?? 0;
    }
    token = respuesta.IsTruncated ? respuesta.NextContinuationToken : undefined;
  } while (token);

  return total;
};
