import { useEffect } from 'react';

// Utilidad de UI (no es la capa de datos del Anexo B): pone el <title> de la
// pestaña por pantalla. Manual 11.2 / 17: "Títulos de página únicos y descriptivos".
const BASE = 'QPass';

export function useTituloPagina(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${BASE}` : BASE;
    return () => {
      document.title = BASE;
    };
  }, [titulo]);
}
