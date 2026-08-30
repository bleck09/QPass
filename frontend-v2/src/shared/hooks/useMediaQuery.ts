import { useEffect, useState } from 'react';

/** `useMediaQuery('(min-width: 48rem)')` -> boolean reactivo. */
export function useMediaQuery(query: string): boolean {
  const [coincide, setCoincide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const alCambiar = (e: MediaQueryListEvent) => setCoincide(e.matches);
    setCoincide(mql.matches);
    mql.addEventListener('change', alCambiar);
    return () => mql.removeEventListener('change', alCambiar);
  }, [query]);

  return coincide;
}
