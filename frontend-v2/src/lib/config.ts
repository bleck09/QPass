/* Lectura centralizada de variables de entorno (Anexo B B10).
 * Ningún otro archivo usa import.meta.env directamente. */

export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  appNombre: import.meta.env.VITE_APP_NOMBRE ?? 'QPass',
  debug: import.meta.env.VITE_DEBUG === 'true',
} as const;
