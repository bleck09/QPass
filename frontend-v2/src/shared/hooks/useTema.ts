/* Tema claro/oscuro/sistema. Persiste en localStorage y aplica data-theme
 * en <html>. El flash inicial ya lo evita el script inline de index.html. */

import { useCallback, useEffect, useState } from 'react';
import { storage, type Tema } from '@/lib/storage';

function aplicar(tema: Tema) {
  const root = document.documentElement;
  if (tema === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = tema;
  }
}

export function useTema() {
  const [tema, setTemaState] = useState<Tema>(() => storage.leerTema());

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  const setTema = useCallback((nuevo: Tema) => {
    storage.guardarTema(nuevo);
    setTemaState(nuevo);
  }, []);

  const alternar = useCallback(() => {
    setTema(tema === 'dark' ? 'light' : 'dark');
  }, [tema, setTema]);

  return { tema, setTema, alternar };
}
