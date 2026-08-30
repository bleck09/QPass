/* Navegación por rol. Rutas de v2, iconos y etiquetas al estilo del frontend
 * original (react-icons/fa). Máximo ~7 ítems por rol (Ley de Hick). */

import type { ReactNode } from 'react';
import {
  FaBoxOpen,
  FaCalendarAlt,
  FaCashRegister,
  FaChartPie,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaLink,
  FaStore,
  FaTicketAlt,
  FaUserCircle,
  FaUsers,
} from 'react-icons/fa';
import { ROLES, type Rol } from '@/shared/constants/roles';
import { RUTAS } from '@/shared/constants/rutas';

export interface ItemNav {
  titulo: string;
  ruta: string;
  icono: ReactNode;
  exacta?: boolean;
}

const NAV_POR_ROL: Record<Rol, ItemNav[]> = {
  [ROLES.ADMIN]: [
    { titulo: 'Dashboard General', ruta: RUTAS.ADMIN, icono: <FaChartPie />, exacta: true },
    { titulo: 'Gestión de Eventos', ruta: RUTAS.ADMIN_EVENTOS, icono: <FaCalendarAlt /> },
    { titulo: 'Solicitudes', ruta: RUTAS.ADMIN_SOLICITUDES, icono: <FaFileInvoiceDollar /> },
    { titulo: 'Compras', ruta: RUTAS.ADMIN_COMPRAS, icono: <FaTicketAlt /> },
    { titulo: 'Usuarios', ruta: RUTAS.ADMIN_USUARIOS, icono: <FaUsers /> },
    { titulo: 'Incidencias', ruta: RUTAS.ADMIN_INCIDENCIAS, icono: <FaExclamationTriangle /> },
    { titulo: 'Reportes de datos', ruta: RUTAS.ADMIN_REPORTES, icono: <FaFileInvoiceDollar /> },
  ],
  [ROLES.CLIENTE]: [
    { titulo: 'Mis eventos', ruta: RUTAS.CLIENTE, icono: <FaCalendarAlt />, exacta: true },
  ],
  [ROLES.RECARGADOR]: [
    { titulo: 'Mi Caja', ruta: RUTAS.RECARGADOR, icono: <FaCashRegister />, exacta: true },
  ],
  [ROLES.SUPERVISOR]: [
    { titulo: 'Control de acceso', ruta: RUTAS.SUPERVISOR, icono: <FaLink />, exacta: true },
  ],
  [ROLES.DEVOLUCION]: [
    { titulo: 'Devoluciones', ruta: RUTAS.DEVOLUCION, icono: <FaBoxOpen />, exacta: true },
  ],
  [ROLES.USUARIO_NORMAL]: [
    { titulo: 'Inicio', ruta: RUTAS.USUARIO, icono: <FaChartPie />, exacta: true },
  ],
  [ROLES.USUARIO_NEGOCIO]: [
    { titulo: 'Mi Negocio', ruta: RUTAS.NEGOCIO, icono: <FaStore />, exacta: true },
  ],
  [ROLES.AYUDANTE]: [
    { titulo: 'Vender / Cobrar', ruta: RUTAS.AYUDANTE, icono: <FaCashRegister />, exacta: true },
  ],
};

const ITEM_PERFIL: ItemNav = {
  titulo: 'Mi Perfil',
  ruta: RUTAS.PERFIL,
  icono: <FaUserCircle />,
};

export function navegacionDe(rol: Rol): ItemNav[] {
  return [...NAV_POR_ROL[rol], ITEM_PERFIL];
}
