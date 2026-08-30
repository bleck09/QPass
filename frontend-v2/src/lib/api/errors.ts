/* ============================================================================
 * src/lib/api/errors.ts
 * Convierte cualquier fallo (red, timeout, error de NestJS) en un ÚNICO
 * formato: ApiError. El resto del proyecto nunca ve un AxiosError.
 *
 * El backend de este repo devuelve los errores como { error: "mensaje" }
 * (ver excepcion-http.filter.ts del backend). Por eso se lee `cuerpo.error`.
 * ========================================================================= */

import { AxiosError } from 'axios';

export interface ApiError {
  /** Código HTTP, o 0 si el fallo fue de red / timeout. */
  status: number;
  /** Mensaje listo para mostrar al usuario, en español. */
  mensaje: string;
}

const MENSAJES_POR_STATUS: Record<number, string> = {
  0: 'No pudimos conectar con el servidor. Revisa tu conexión.',
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos lo que buscabas.',
  409: 'Esta operación entra en conflicto con datos existentes.',
  422: 'Revisa los campos marcados.',
  500: 'Ocurrió un error en el servidor. Intenta de nuevo en unos minutos.',
};

export function normalizarError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const cuerpo = error.response?.data as { error?: string; message?: string } | undefined;
    return {
      status,
      mensaje:
        cuerpo?.error ??
        cuerpo?.message ??
        MENSAJES_POR_STATUS[status] ??
        'Ocurrió un error inesperado.',
    };
  }
  return { status: 0, mensaje: 'Ocurrió un error inesperado.' };
}

/** Type guard para usar en los componentes: `if (esApiError(error))`. */
export function esApiError(valor: unknown): valor is ApiError {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'status' in valor &&
    'mensaje' in valor
  );
}
