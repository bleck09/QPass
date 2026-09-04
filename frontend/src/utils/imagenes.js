import { uploads } from '../api/index.js';

/* ============================================================================
 * Subida de imágenes: antes cada formulario codificaba la imagen en base64 con
 * FileReader y la mandaba entera dentro del body del propio formulario. Ahora
 * se sube el archivo real a /uploads (ver uploads.controller.ts en el backend,
 * que la guarda en el volumen y sirve /uploads/<carpeta>/<archivo> como estático)
 * y el formulario solo guarda esa URL — igual que cualquier otro campo de texto.
 * ========================================================================= */

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — mismo límite que el backend (uploads.controller.ts)

// Sube el archivo elegido en un <input type="file">. Devuelve la URL a guardar en el form.
export const subirImagenDeInput = async (file, carpeta) => {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  if (file.size > MAX_BYTES) throw new Error('La imagen no debe superar los 8 MB.');
  const { url } = await uploads.subir(file, carpeta);
  return url;
};

// Sube una foto tomada con CapturarFoto (llega como data URL de canvas.toDataURL),
// convirtiéndola a archivo real antes de mandarla.
export const subirFotoCapturada = async (dataUrl, carpeta, nombreArchivo = 'captura.jpg') => {
  const blob = await (await fetch(dataUrl)).blob();
  const archivo = new File([blob], nombreArchivo, { type: blob.type || 'image/jpeg' });
  const { url } = await uploads.subir(archivo, carpeta);
  return url;
};
