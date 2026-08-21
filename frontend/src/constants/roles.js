// Coincide 1:1 con el enum `Rol` de backend/prisma/schema.prisma.
export const ROLES = {
  ADMIN: 'Admin',
  CLIENTE: 'Cliente',
  RECARGADOR: 'Recargador',
  SUPERVISOR: 'Supervisor',
  DEVOLUCION: 'Devolucion',
  USUARIO_NORMAL: 'UsuarioNormal',
  USUARIO_NEGOCIO: 'UsuarioNegocio',
  AYUDANTE: 'Ayudante',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.CLIENTE]: 'Cliente',
  [ROLES.RECARGADOR]: 'Recargador',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.DEVOLUCION]: 'Devolución',
  [ROLES.USUARIO_NORMAL]: 'Usuario Normal',
  [ROLES.USUARIO_NEGOCIO]: 'Usuario Negocio',
  [ROLES.AYUDANTE]: 'Ayudante',
};

export const ROLE_HOME_PATH = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.CLIENTE]: '/Cliente',
  [ROLES.RECARGADOR]: '/recargador',
  [ROLES.SUPERVISOR]: '/supervisor',
  [ROLES.DEVOLUCION]: '/devolucion',
  [ROLES.USUARIO_NORMAL]: '/usuarionormal',
  [ROLES.USUARIO_NEGOCIO]: '/usuarionegocio',
  [ROLES.AYUDANTE]: '/ayudante',
};
