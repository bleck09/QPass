/* Navegación por rol. Máximo 7 ítems (Manual 3.2 / Ley de Hick). */

import type { ReactNode } from 'react';
import { ROLES, type Rol } from '@/shared/constants/roles';
import { RUTAS } from '@/shared/constants/rutas';
import {
  IconoAlerta,
  IconoBilletera,
  IconoDevolucion,
  IconoDocumento,
  IconoEntrada,
  IconoEvento,
  IconoPanel,
  IconoTicket,
  IconoTienda,
  IconoUsuario,
  IconoUsuarios,
} from '@/shared/components/ui/iconos';

export interface ItemNav {
  label: string;
  ruta: string;
  icono: ReactNode;
  /** Coincidencia exacta de ruta (para el ítem "inicio" de cada rol). */
  exacta?: boolean;
}

const NAV_POR_ROL: Record<Rol, ItemNav[]> = {
  [ROLES.ADMIN]: [
    { label: 'Panel', ruta: RUTAS.ADMIN, icono: <IconoPanel />, exacta: true },
    { label: 'Eventos', ruta: RUTAS.ADMIN_EVENTOS, icono: <IconoEvento /> },
    { label: 'Solicitudes', ruta: RUTAS.ADMIN_SOLICITUDES, icono: <IconoDocumento /> },
    { label: 'Compras', ruta: RUTAS.ADMIN_COMPRAS, icono: <IconoTicket /> },
    { label: 'Usuarios', ruta: RUTAS.ADMIN_USUARIOS, icono: <IconoUsuarios /> },
    { label: 'Incidencias', ruta: RUTAS.ADMIN_INCIDENCIAS, icono: <IconoAlerta /> },
  ],
  [ROLES.CLIENTE]: [
    { label: 'Mis eventos', ruta: RUTAS.CLIENTE, icono: <IconoEvento />, exacta: true },
  ],
  [ROLES.RECARGADOR]: [
    { label: 'Recargar', ruta: RUTAS.RECARGADOR, icono: <IconoBilletera />, exacta: true },
  ],
  [ROLES.SUPERVISOR]: [
    { label: 'Control de acceso', ruta: RUTAS.SUPERVISOR, icono: <IconoEntrada />, exacta: true },
  ],
  [ROLES.DEVOLUCION]: [
    { label: 'Devoluciones', ruta: RUTAS.DEVOLUCION, icono: <IconoDevolucion />, exacta: true },
  ],
  [ROLES.USUARIO_NORMAL]: [
    { label: 'Inicio', ruta: RUTAS.USUARIO, icono: <IconoPanel />, exacta: true },
  ],
  [ROLES.USUARIO_NEGOCIO]: [
    { label: 'Mi negocio', ruta: RUTAS.NEGOCIO, icono: <IconoTienda />, exacta: true },
  ],
  [ROLES.AYUDANTE]: [
    { label: 'Cobrar', ruta: RUTAS.AYUDANTE, icono: <IconoTienda />, exacta: true },
  ],
};

const ITEM_PERFIL: ItemNav = {
  label: 'Mi perfil',
  ruta: RUTAS.PERFIL,
  icono: <IconoUsuario />,
};

export function navegacionDe(rol: Rol): ItemNav[] {
  return [...NAV_POR_ROL[rol], ITEM_PERFIL];
}
