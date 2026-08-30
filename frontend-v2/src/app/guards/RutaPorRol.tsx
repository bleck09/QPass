/* Restringe una rama de rutas a ciertos roles. Rol no permitido -> su inicio. */

import { Navigate, Outlet } from 'react-router-dom';
import { useSesion } from '@/features/auth';
import { RUTA_INICIO_POR_ROL } from '@/shared/constants/rutas';
import type { Rol } from '@/shared/constants/roles';

interface RutaPorRolProps {
  roles: Rol[];
}

export function RutaPorRol({ roles }: RutaPorRolProps) {
  const { usuario } = useSesion();

  if (!usuario) return null; // RutaPrivada ya redirigió; este render es transitorio
  if (!roles.includes(usuario.rol)) {
    return <Navigate to={RUTA_INICIO_POR_ROL[usuario.rol]} replace />;
  }
  return <Outlet />;
}
