/* ============================================================================
 * src/lib/api/client.ts
 * Instancia ÚNICA de axios. Aquí vive todo lo transversal: URL base, token de
 * sesión, timeout y manejo global de errores. Ningún otro archivo crea su
 * propia instancia de axios (Anexo B B5).
 * ========================================================================= */

import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { config } from '@/lib/config';
import { storage } from '@/lib/storage';
import { normalizarError } from './errors';

/** Si el backend no responde en 15s, se aborta. */
const TIMEOUT_MS = 15_000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/* --- INTERCEPTOR DE PETICIÓN ----------------------------------------------
 * Adjunta el token de sesión a cada llamada. Así ningún servicio se acuerda
 * de mandar el header. OJO: este orden importa (Anexo B B11). */
apiClient.interceptors.request.use((cfg) => {
  const token = storage.obtenerToken();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

/* --- INTERCEPTOR DE RESPUESTA -------------------------------------------
 * 1. Si la sesión expiró (401), cierra sesión y manda al login.
 * 2. Traduce cualquier error a ApiError (formato único del proyecto). */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !esRutaAuth(error)) {
      storage.limpiarSesion();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(normalizarError(error));
  },
);

/** El 401 de /auth/login es "credenciales inválidas", no "sesión expirada":
 * ese no debe redirigir ni limpiar nada. */
function esRutaAuth(error: AxiosError): boolean {
  return (error.config?.url ?? '').startsWith('/auth/');
}
