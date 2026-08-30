/* ============================================================================
 * src/lib/storage.ts
 * Wrapper de localStorage. Único lugar que conoce las claves de persistencia.
 * Todo envuelto en try/catch: en modo incógnito o con storage bloqueado,
 * localStorage lanza al acceder.
 * ========================================================================= */

import type { Rol } from '@/shared/constants/roles';

const CLAVE_SESION = 'qpass_sesion';
const CLAVE_TEMA = 'qpass_tema';

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  foto: string | null;
}

export interface Sesion {
  token: string;
  usuario: UsuarioSesion;
}

export type Tema = 'light' | 'dark' | 'system';

function leer<T>(clave: string): T | null {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* storage no disponible: se ignora, la app sigue funcionando en memoria */
  }
}

function borrar(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* noop */
  }
}

export const storage = {
  leerSesion: () => leer<Sesion>(CLAVE_SESION),
  guardarSesion: (sesion: Sesion) => escribir(CLAVE_SESION, sesion),
  limpiarSesion: () => borrar(CLAVE_SESION),

  obtenerToken: (): string | null => leer<Sesion>(CLAVE_SESION)?.token ?? null,

  // El tema se guarda como string plano (no JSON) porque el script inline de
  // index.html lo lee con getItem directo para evitar el flash de tema.
  leerTema: (): Tema => {
    try {
      const t = localStorage.getItem(CLAVE_TEMA);
      return t === 'light' || t === 'dark' ? t : 'system';
    } catch {
      return 'system';
    }
  },
  guardarTema: (tema: Tema) => {
    try {
      if (tema === 'system') localStorage.removeItem(CLAVE_TEMA);
      else localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      /* noop */
    }
  },
};
