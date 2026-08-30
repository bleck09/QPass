/* ============================================================================
 * SesionContext — estado de sesión del usuario (token + datos), único en la app.
 * Se inicializa desde localStorage y se sincroniza al iniciar/cerrar sesión.
 * ========================================================================= */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storage, type Sesion } from '@/lib/storage';
import type { UsuarioAutenticado } from '../types/auth.types';

interface SesionContextValor {
  usuario: UsuarioAutenticado | null;
  estaAutenticado: boolean;
  iniciarSesion: (sesion: Sesion) => void;
  cerrarSesion: () => void;
  /** Actualiza campos del usuario en sesión (ej. tras editar el perfil). */
  actualizarUsuario: (parcial: Partial<UsuarioAutenticado>) => void;
}

const SesionContext = createContext<SesionContextValor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => storage.leerSesion());

  const iniciarSesion = useCallback((nueva: Sesion) => {
    storage.guardarSesion(nueva);
    setSesion(nueva);
  }, []);

  const cerrarSesion = useCallback(() => {
    storage.limpiarSesion();
    setSesion(null);
  }, []);

  const actualizarUsuario = useCallback(
    (parcial: Partial<UsuarioAutenticado>) => {
      setSesion((prev) => {
        if (!prev) return prev;
        const siguiente: Sesion = {
          ...prev,
          usuario: { ...prev.usuario, ...parcial },
        };
        storage.guardarSesion(siguiente);
        return siguiente;
      });
    },
    [],
  );

  const valor = useMemo<SesionContextValor>(
    () => ({
      usuario: sesion?.usuario ?? null,
      estaAutenticado: Boolean(sesion?.token),
      iniciarSesion,
      cerrarSesion,
      actualizarUsuario,
    }),
    [sesion, iniciarSesion, cerrarSesion, actualizarUsuario],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): SesionContextValor {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}
