/* ============================================================================
 * Contexto de sesión (objeto + tipo + hook). Vive aparte de SesionContext.tsx
 * para que ese archivo exporte solo el componente (Fast Refresh).
 * ========================================================================= */

import { createContext, useContext } from 'react';
import type { Sesion } from '@/lib/storage';
import type { UsuarioAutenticado } from '../types/auth.types';

export interface SesionContextValor {
  usuario: UsuarioAutenticado | null;
  estaAutenticado: boolean;
  iniciarSesion: (sesion: Sesion) => void;
  cerrarSesion: () => void;
  /** Actualiza campos del usuario en sesión (ej. tras editar el perfil). */
  actualizarUsuario: (parcial: Partial<UsuarioAutenticado>) => void;
}

export const SesionContext = createContext<SesionContextValor | null>(null);

export function useSesion(): SesionContextValor {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}
