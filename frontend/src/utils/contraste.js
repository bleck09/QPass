// Contraste entre dos colores según WCAG 2.x (la fórmula que usan los
// validadores de accesibilidad). Se usa en el editor de la página del evento
// para avisar cuando el organizador elige colores que no se van a leer.

const hexARgb = (hex) => {
  const h = String(hex || '').replace('#', '').trim();
  const completo = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(completo)) return null;
  return [0, 2, 4].map((i) => parseInt(completo.slice(i, i + 2), 16));
};

const luminancia = ([r, g, b]) => {
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};

/** Relación de contraste (1 a 21), o null si algún color no es un hex válido. */
export function contraste(hexA, hexB) {
  const a = hexARgb(hexA);
  const b = hexARgb(hexB);
  if (!a || !b) return null;
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** true si es un color hex válido (#RGB o #RRGGBB). */
export const esHexValido = (hex) => hexARgb(hex) !== null;
