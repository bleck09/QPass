/* Protege rutas que exigen sesión. Sin sesión -> /login (recordando a dónde iba). */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSesion } from '@/features/auth';
import { RUTAS } from '@/shared/constants/rutas';

export function RutaPrivada() {
  const { estaAutenticado } = useSesion();
  const location = useLocation();

  if (!estaAutenticado) {
    return <Navigate to={RUTAS.LOGIN} replace state={{ desde: location.pathname }} />;
  }
  return <Outlet />;
}
