import { useEffect, useState } from 'react';

/** Devuelve `valor` con un retraso de `ms` desde el último cambio. */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);

  return debounced;
}
