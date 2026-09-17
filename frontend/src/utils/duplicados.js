// Manillas duplicadas (ver CasoDuplicado / AlertaManilla en schema.prisma).

// ContextoAlertaManilla del backend -> texto para seguridad.
export const CONTEXTO_ALERTA = {
  control_acceso: 'Control de acceso',
  entrega: 'Entrega de manillas',
  recarga: 'Punto de recarga',
  venta: 'Punto de venta',
  devolucion: 'Devoluciones',
};

// "Punto de venta «Bar Central» · escaneó Ana (Ayudante)"
export const ubicacionAlerta = (a) => {
  if (!a) return 'Todavía no se volvió a escanear';
  const lugar = CONTEXTO_ALERTA[a.contexto] || a.contexto;
  const puesto = a.puestoNombre ? ` «${a.puestoNombre}»` : '';
  return `${lugar}${puesto} · escaneó ${a.operadorNombre} (${a.operadorRol})`;
};

export const esManillaFalsa = (err) => err?.codigo === 'MANILLA_FALSA';

// Roles que ven "Personas por encontrar" y reciben las alertas.
export const ROLES_SEGURIDAD = ['Admin', 'Supervisor', 'Cliente'];
// Roles que pueden marcar una manilla como recuperada.
export const ROLES_RECUPERAN = ['Admin', 'Supervisor'];
