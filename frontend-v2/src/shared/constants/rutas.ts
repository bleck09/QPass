/* Todas las rutas del frontend como constantes (Anexo B B2). Ningún <Link>
 * ni navigate() escribe un path a mano. */

import { ROLES, type Rol } from './roles';

export const RUTAS = {
  // Públicas
  INICIO: '/',
  LANDING_EVENTO: (id: string) => `/evento/${id}`,
  LOGIN: '/login',
  REGISTRO: '/registro',
  RECUPERAR: '/recuperar',

  // Privadas (con layout)
  PERFIL: '/perfil',

  ADMIN: '/admin',
  ADMIN_EVENTOS: '/admin/eventos',
  ADMIN_EVENTO_DETALLE: (id: string) => `/admin/eventos/${id}`,
  ADMIN_SOLICITUDES: '/admin/solicitudes',
  ADMIN_COMPRAS: '/admin/compras',
  ADMIN_USUARIOS: '/admin/usuarios',
  ADMIN_INCIDENCIAS: '/admin/incidencias',
  ADMIN_REPORTES: '/admin/reportes',

  CLIENTE: '/cliente',
  RECARGADOR: '/recargador',
  SUPERVISOR: '/supervisor',
  DEVOLUCION: '/devolucion',
  USUARIO: '/usuario',
  NEGOCIO: '/negocio',
  AYUDANTE: '/ayudante',
} as const;

/** A dónde va cada rol después de iniciar sesión. */
export const RUTA_INICIO_POR_ROL: Record<Rol, string> = {
  [ROLES.ADMIN]: RUTAS.ADMIN,
  [ROLES.CLIENTE]: RUTAS.CLIENTE,
  [ROLES.RECARGADOR]: RUTAS.RECARGADOR,
  [ROLES.SUPERVISOR]: RUTAS.SUPERVISOR,
  [ROLES.DEVOLUCION]: RUTAS.DEVOLUCION,
  [ROLES.USUARIO_NORMAL]: RUTAS.USUARIO,
  [ROLES.USUARIO_NEGOCIO]: RUTAS.NEGOCIO,
  [ROLES.AYUDANTE]: RUTAS.AYUDANTE,
};
