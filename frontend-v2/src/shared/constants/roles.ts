/* Roles — valores IDÉNTICOS al enum `Rol` de Prisma (backend). No traducir. */

export const ROLES = {
  ADMIN: 'Admin',
  CLIENTE: 'Cliente',
  RECARGADOR: 'Recargador',
  SUPERVISOR: 'Supervisor',
  DEVOLUCION: 'Devolucion',
  USUARIO_NORMAL: 'UsuarioNormal',
  USUARIO_NEGOCIO: 'UsuarioNegocio',
  AYUDANTE: 'Ayudante',
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const TODOS_LOS_ROLES = Object.values(ROLES) as Rol[];

/** Etiqueta legible por rol (para menús, badges). */
export const ROL_LABEL: Record<Rol, string> = {
  Admin: 'Administrador',
  Cliente: 'Cliente / Organizador',
  Recargador: 'Recargador',
  Supervisor: 'Supervisor',
  Devolucion: 'Devoluciones',
  UsuarioNormal: 'Usuario',
  UsuarioNegocio: 'Negocio',
  Ayudante: 'Ayudante',
};
