// Efectos que siguen al puntero: escriben la posición del mouse como
// variables CSS (--mx / --my, en %) sobre el elemento, y el CSS dibuja con
// eso una luz o un brillo. Se escribe directo en el DOM: re-renderizar React
// en cada movimiento del mouse sería caro y no aporta nada.
//
//   <div {...seguirPuntero('.tarjeta')}>  ->  cada .tarjeta recibe --mx/--my
//   <header {...seguirPuntero()}>         ->  el propio contenedor
//
// Con dedo (touch) no hace nada: no hay "hover" que seguir.

const sinMovimiento = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function seguirPuntero(selector = null) {
  const objetivo = (e) => (selector ? e.target.closest?.(selector) : e.currentTarget);

  return {
    onPointerMove: (e) => {
      if (e.pointerType === 'touch' || sinMovimiento()) return;
      const el = objetivo(e);
      if (!el || !e.currentTarget.contains(el)) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    },
  };
}
