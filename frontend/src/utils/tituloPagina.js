import { useEffect } from 'react';

// Utilidad de UI (no es la capa de datos del Anexo B): pone el <title> de la
// pestaña por pantalla. Manual 11.2 / 17: "Títulos de página únicos y descriptivos".
const BASE = 'QPass';

// `activo` permite que un componente que se usa embebido dentro de otra pantalla
// (ej. las pestañas del detalle de evento) no pise el <title> del contenedor.
export function useTituloPagina(titulo, activo = true) {
  useEffect(() => {
    if (!activo) return undefined;
    document.title = titulo ? `${titulo} · ${BASE}` : BASE;
    return () => {
      document.title = BASE;
    };
  }, [titulo, activo]);
}
