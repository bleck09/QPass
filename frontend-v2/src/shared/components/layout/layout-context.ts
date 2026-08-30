/* Contexto del layout (título de pantalla). Aparte de AppLayout.tsx para que
 * ese archivo exporte solo el componente (Fast Refresh). */

import { createContext, useContext } from 'react';

export interface LayoutCtx {
  setTitulo: (t: string) => void;
}

export const LayoutContext = createContext<LayoutCtx | null>(null);

export function useLayout(): LayoutCtx {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout debe usarse dentro de <AppLayout>');
  return ctx;
}
