/* ============================================================================
 * src/app/router.tsx — todas las rutas de la app.
 * Públicas -> auth. Privadas -> RutaPrivada > AppLayout > RutaPorRol > página.
 * Las páginas de rol son placeholders (EnConstruccionPage) hasta que se
 * construya su feature.
 * ========================================================================= */

import { createBrowserRouter } from 'react-router-dom';
import { ROLES } from '@/shared/constants/roles';
import { RUTAS } from '@/shared/constants/rutas';
import { AppLayout } from '@/shared/components/layout';
import { RutaPrivada } from './guards/RutaPrivada';
import { RutaPorRol } from './guards/RutaPorRol';

import { PaginaPrincipalPage } from '@/pages/publico/PaginaPrincipalPage';
import { LandingEventoPage } from '@/pages/publico/LandingEventoPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegistroPage } from '@/pages/auth/RegistroPage';
import { RecuperarPage } from '@/pages/auth/RecuperarPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminPanelPage } from '@/pages/admin/AdminPanelPage';
import { AdminEventosPage } from '@/pages/admin/AdminEventosPage';
import { AdminEventoDetallePage } from '@/pages/admin/AdminEventoDetallePage';
import { AdminReportesPage } from '@/pages/admin/AdminReportesPage';
import { AdminUsuariosPage } from '@/pages/admin/AdminUsuariosPage';
import { AdminSolicitudesPage } from '@/pages/admin/AdminSolicitudesPage';
import { AdminComprasPage } from '@/pages/admin/AdminComprasPage';
import { AdminIncidenciasPage } from '@/pages/admin/AdminIncidenciasPage';
import { ClienteEventosPage } from '@/pages/cliente/ClienteEventosPage';
import { UsuarioInicioPage } from '@/pages/usuario/UsuarioInicioPage';
import { SupervisorPage } from '@/pages/supervisor/SupervisorPage';
import { RecargadorPage } from '@/pages/recargador/RecargadorPage';
import { DevolucionPage } from '@/pages/devolucion/DevolucionPage';
import { NegocioPage } from '@/pages/negocio/NegocioPage';
import { AyudantePage } from '@/pages/ayudante/AyudantePage';
import { PerfilPage } from '@/pages/perfil/PerfilPage';

export const router = createBrowserRouter([
  { path: RUTAS.INICIO, element: <PaginaPrincipalPage /> },
  { path: '/evento/:id', element: <LandingEventoPage /> },
  { path: RUTAS.LOGIN, element: <LoginPage /> },
  { path: RUTAS.REGISTRO, element: <RegistroPage /> },
  { path: RUTAS.RECUPERAR, element: <RecuperarPage /> },

  {
    element: <RutaPrivada />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: RUTAS.PERFIL, element: <PerfilPage /> },

          {
            element: <RutaPorRol roles={[ROLES.ADMIN]} />,
            children: [
              { path: RUTAS.ADMIN, element: <AdminPanelPage /> },
              { path: RUTAS.ADMIN_EVENTOS, element: <AdminEventosPage /> },
              { path: '/admin/eventos/:id', element: <AdminEventoDetallePage /> },
              { path: RUTAS.ADMIN_SOLICITUDES, element: <AdminSolicitudesPage /> },
              { path: RUTAS.ADMIN_COMPRAS, element: <AdminComprasPage /> },
              { path: RUTAS.ADMIN_USUARIOS, element: <AdminUsuariosPage /> },
              { path: RUTAS.ADMIN_INCIDENCIAS, element: <AdminIncidenciasPage /> },
              { path: RUTAS.ADMIN_REPORTES, element: <AdminReportesPage /> },
            ],
          },
          {
            element: <RutaPorRol roles={[ROLES.CLIENTE]} />,
            children: [{ path: RUTAS.CLIENTE, element: <ClienteEventosPage /> }],
          },
          {
            element: <RutaPorRol roles={[ROLES.RECARGADOR]} />,
            children: [{ path: RUTAS.RECARGADOR, element: <RecargadorPage /> }],
          },
          {
            element: <RutaPorRol roles={[ROLES.SUPERVISOR]} />,
            children: [{ path: RUTAS.SUPERVISOR, element: <SupervisorPage /> }],
          },
          {
            element: <RutaPorRol roles={[ROLES.DEVOLUCION]} />,
            children: [{ path: RUTAS.DEVOLUCION, element: <DevolucionPage /> }],
          },
          {
            element: <RutaPorRol roles={[ROLES.USUARIO_NORMAL]} />,
            children: [{ path: RUTAS.USUARIO, element: <UsuarioInicioPage /> }],
          },
          {
            element: <RutaPorRol roles={[ROLES.USUARIO_NEGOCIO]} />,
            children: [{ path: RUTAS.NEGOCIO, element: <NegocioPage /> }],
          },
          {
            element: <RutaPorRol roles={[ROLES.AYUDANTE]} />,
            children: [{ path: RUTAS.AYUDANTE, element: <AyudantePage /> }],
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
