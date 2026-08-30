/* ============================================================================
 * Set de iconos propio — una sola familia (Manual 8.11): trazo 1.75, 20px,
 * currentColor. Decorativos por defecto (aria-hidden); pasá `titulo` para
 * darles nombre accesible cuando van solos.
 * ========================================================================= */

import type { SVGProps } from 'react';

interface IconoProps extends SVGProps<SVGSVGElement> {
  titulo?: string;
}

function Base({ titulo, children, ...resto }: IconoProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
      {...resto}
    >
      {children}
    </svg>
  );
}

export const IconoPanel = (p: IconoProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </Base>
);

export const IconoEvento = (p: IconoProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 10h18M8 2v4M16 2v4" />
  </Base>
);

export const IconoTicket = (p: IconoProps) => (
  <Base {...p}>
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
    <path d="M13 7v10" strokeDasharray="1 2" />
  </Base>
);

export const IconoQr = (p: IconoProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3M21 21v.01M17 21h.01M21 17h.01" />
  </Base>
);

export const IconoBilletera = (p: IconoProps) => (
  <Base {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M16 12h.01M3 9h18" />
  </Base>
);

export const IconoUsuarios = (p: IconoProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5M16 15c2 .3 4 2 4 5" />
  </Base>
);

export const IconoUsuario = (p: IconoProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 21c0-4 3-6 7-6s7 2 7 6" />
  </Base>
);

export const IconoTienda = (p: IconoProps) => (
  <Base {...p}>
    <path d="M4 9 5 4h14l1 5M4 9h16M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M9 20v-6h6v6" />
  </Base>
);

export const IconoAlerta = (p: IconoProps) => (
  <Base {...p}>
    <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </Base>
);

export const IconoDocumento = (p: IconoProps) => (
  <Base {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Base>
);

export const IconoEntrada = (p: IconoProps) => (
  <Base {...p}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
  </Base>
);

export const IconoSalir = (p: IconoProps) => (
  <Base {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Base>
);

export const IconoSol = (p: IconoProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const IconoLuna = (p: IconoProps) => (
  <Base {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Base>
);

export const IconoMenu = (p: IconoProps) => (
  <Base {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Base>
);

export const IconoDevolucion = (p: IconoProps) => (
  <Base {...p}>
    <path d="M3 7v6h6M3 13a9 9 0 1 0 3-7" />
  </Base>
);
