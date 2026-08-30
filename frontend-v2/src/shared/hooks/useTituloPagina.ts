import { useEffect } from 'react';
import { useLayout } from '@/shared/components/layout';
import { config } from '@/lib/config';

/** Fija el título del Header del layout y el <title> del documento. */
export function useTituloPagina(titulo: string) {
  const { setTitulo } = useLayout();
  useEffect(() => {
    setTitulo(titulo);
    document.title = `${titulo} · ${config.appNombre}`;
  }, [titulo, setTitulo]);
}
