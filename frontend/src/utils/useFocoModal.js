import { useEffect } from 'react';

/*
  Gestión de foco para diálogos modales — Manual 8.6 y WCAG 2.4.3 / 2.1.2.
  NO es lógica de datos (Anexo B): es puro comportamiento de UI accesible.

  Hace tres cosas que un modal necesita y que React no da por defecto:
    1. Al abrir, lleva el foco del teclado DENTRO del modal (al primer control).
    2. Atrapa el Tab: al llegar al último control vuelve al primero y viceversa,
       para que el teclado no se "escape" a la página de fondo que está inerte.
    3. Al cerrar, devuelve el foco al elemento que abrió el modal (el botón que
       lo disparó), para no perder al usuario que navega sin mouse.

  Uso:
    const modalRef = useRef(null);
    useFocoModal(modalRef, estaAbierto);
    ...
    <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}> ... </div>
*/
const SELECTOR_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocoModal(ref, activo = true) {
  useEffect(() => {
    const modal = ref.current;
    if (!activo || !modal) return;

    // Elemento que tenía el foco antes de abrir: se lo devolvemos al cerrar.
    const elementoPrevio = document.activeElement;

    const focusables = () => Array.from(modal.querySelectorAll(SELECTOR_FOCUSABLE));

    // Foco inicial: primer control del modal; si no hay, el contenedor (tabIndex -1).
    const iniciales = focusables();
    (iniciales[0] || modal).focus();

    const alPulsarTab = (e) => {
      if (e.key !== 'Tab') return;
      const lista = focusables();
      if (lista.length === 0) {
        e.preventDefault();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    modal.addEventListener('keydown', alPulsarTab);
    return () => {
      modal.removeEventListener('keydown', alPulsarTab);
      // Solo devolvemos el foco si el elemento sigue existiendo y es enfocable.
      if (elementoPrevio && typeof elementoPrevio.focus === 'function') {
        elementoPrevio.focus();
      }
    };
  }, [ref, activo]);
}
