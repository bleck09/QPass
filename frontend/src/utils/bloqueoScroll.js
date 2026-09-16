/*
  Bloqueo del scroll de la página mientras haya algún modal abierto.

  Cada modal guardaba y restauraba `body.style.overflow` por su cuenta. Con
  modales encadenados (ej. vincular manilla -> escáner -> resultado) uno se
  abre antes de que el otro termine de cerrarse, guarda "hidden" como valor
  "previo" y al cerrarse lo deja puesto: la página quedaba sin scroll.

  Acá hay un solo contador global: el scroll se bloquea con el primer modal
  y se libera recién cuando se cierra el último.

  Uso (dentro de un useEffect):
    const liberar = bloquearScroll();
    return liberar;
*/
let abiertos = 0;
let overflowOriginal = '';

export function bloquearScroll() {
  if (abiertos === 0) {
    overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  abiertos += 1;

  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    abiertos = Math.max(0, abiertos - 1);
    if (abiertos === 0) document.body.style.overflow = overflowOriginal;
  };
}

/*
  Red de seguridad: si en pantalla no queda ningún diálogo modal pero el scroll
  sigue bloqueado (un modal que se desmontó de forma rara, etc.), se libera.
  La llama el layout al cambiar de ruta.
*/
export function revisarBloqueoScroll() {
  if (document.querySelector('[aria-modal="true"]')) return;
  abiertos = 0;
  if (document.body.style.overflow === 'hidden') {
    document.body.style.overflow = overflowOriginal === 'hidden' ? '' : overflowOriginal;
  }
}
