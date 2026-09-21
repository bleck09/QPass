import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/index.css'
import './styles/animaciones.css'
import './styles/buttons.css'
import './styles/forms.css'
import './styles/layout.css'

// 1. IMPORTAMOS LA NUEVA LANDING PAGE GLOBAL Y LA DEL EVENTO
import PaginaPrincipal from './pages/publico/PaginaPrincipal.jsx'
import App from './pages/publico/App.jsx'
import Login from './pages/publico/Login.jsx'
import MenuLateral from './layout/MenuLateral.jsx'
import { AvisosProvider } from './components/Avisos.jsx'

import Admin from './pages/admin/Admin.jsx'
import AdminGeneral from './pages/admin/AdminGeneral.jsx'
import AdminAuditoria from './pages/admin/AdminAuditoria.jsx'
import AdminGestionEventos from './pages/admin/AdminGestionEventos.jsx'
import AdminConfigurarPagina from './pages/admin/AdminConfigurarPagina.jsx'
import UsuNegoDasboar from './pages/usuario-negocio/UsuNegoDasboar.jsx'
import AdCreaUsuarioNegocio from './pages/admin/AdCreaUsuarioNegocio.jsx'
import AdminCrearTickets from './pages/admin/AdminCrearTickets.jsx'
import AdminCrearQr from './pages/admin/AdminCrearQr.jsx'
import Mapa from './pages/admin/Mapa.jsx'

import Cliente from './pages/cliente/Cliente.jsx'
import ClienteDashboard from './pages/cliente/ClienteDashboard.jsx'
import Recargador from './pages/recargador/Recargador.jsx'
import Supervisor from './pages/supervisor/Supervisor.jsx'
import GestionEntrega from './pages/supervisor/GestionEntrega.jsx'
import Devolucion from './pages/devolucion/Devolucion.jsx'
import UsuarioNormal from './pages/usuario-normal/UsuarioNormal.jsx'
import UsuarioNegocio from './pages/usuario-negocio/UsuarioNegocio.jsx'
import MisAyudantes from './pages/usuario-negocio/MisAyudantes.jsx'
import MiCatalogo from './pages/usuario-negocio/MiCatalogo.jsx'
import MiCatalogoPuesto from './pages/usuario-negocio/MiCatalogoPuesto.jsx'
import MiPuestoDetalle from './pages/usuario-negocio/MiPuestoDetalle.jsx'
import Ayudante from './pages/ayudante/Ayudante.jsx'
import Perfil from './pages/perfil/Perfil.jsx'
import Registrar from './pages/publico/Registrar.jsx'
import RecuperarContra from './pages/publico/RecuperarContra.jsx'
import CompletarPerfil from './pages/publico/CompletarPerfil.jsx'
import PersonasPorEncontrar from './pages/seguridad/PersonasPorEncontrar.jsx'

const router = createBrowserRouter([
  // 2. ACTUALIZAMOS LAS RUTAS PÚBLICAS PRINCIPALES
  { path: "/", element: <PaginaPrincipal /> }, // La vista corporativa global de QPass
  { path: "/evento/:id", element: <App /> },   // La vista específica del evento (Landing del cliente)
  { path: "/login", element: <Login /> },
   { path: "/Registrar", element: <Registrar/> },
   { path: "/recuperar", element: <RecuperarContra/> },
   // Sin MenuLateral a propósito: mientras falte completar, no debe poder navegar
   // a otro lado (ver el guard en MenuLateral.jsx que redirige acá).
   { path: "/completar-perfil", element: <CompletarPerfil /> },
      // Pantalla de inicio de sesión
  
  // RUTAS PRIVADAS (Con Menú Lateral)
  {
    path: "/admin",
    element: <MenuLateral><Admin /></MenuLateral>,
  },
  {
    path: "/admin/general",
    element: <MenuLateral><AdminGeneral /></MenuLateral>,
  },
  {
    path: "/admin/reportes",
    element: <MenuLateral><Admin /></MenuLateral>,
  },
  {
    path: "/admin/solicitudes",
    element: <MenuLateral><Admin /></MenuLateral>,
  },
  {
    path: "/admin/auditoria",
    element: <MenuLateral><AdminAuditoria /></MenuLateral>,
  },
  {
    path: "/admin/eventos",
    element: <MenuLateral><AdminGestionEventos /></MenuLateral>,
  },
  // 2. AGREGAMOS LA NUEVA RUTA AQUÍ (Debe coincidir con la ruta de tu MenuLateral.jsx)
  {
    path: "/AdCreaUsuarioNegocio",
    element: <MenuLateral><AdCreaUsuarioNegocio /></MenuLateral>,
  },
  {
    path: "/admin/config",
    element: <MenuLateral><AdminConfigurarPagina /></MenuLateral>,
  },
  {
    path: "/AdminCrearTickets",
    element: <MenuLateral><AdminCrearTickets /></MenuLateral>,
  },
  {
    path: "/admin/qr",
    element: <MenuLateral><AdminCrearQr /></MenuLateral>,
  },
  {
    path: "/recargador",
    element: <MenuLateral><Recargador /></MenuLateral>,
  },
  {
    path: "/Cliente",
    element: <MenuLateral><Cliente/></MenuLateral>,
  },
  {
    path: "/Cliente/dashboard",
    element: <MenuLateral><ClienteDashboard/></MenuLateral>,
  },
  {
    path: "/recargador/historial",
    element: <MenuLateral><Recargador /></MenuLateral>,
  },
  {
    path: "/recargador/incidencias",
    element: <MenuLateral><Recargador /></MenuLateral>,
  },
  {
    path: "/recargador/caja",
    element: <MenuLateral><Recargador /></MenuLateral>,
  },
  {
    path: "/Mapa",
    element: <MenuLateral><Mapa /></MenuLateral>,
  },
  {
    path: "/supervisor",
    element: <MenuLateral><Supervisor /></MenuLateral>,
  },
  {
    path: "/supervisor/entrega",
    element: <MenuLateral><GestionEntrega /></MenuLateral>,
  },
  {
    path: "/devolucion",
    element: <MenuLateral><Devolucion /></MenuLateral>,
  },
  {
    path: "/devolucion/historial",
    element: <MenuLateral><Devolucion /></MenuLateral>,
  },
  {
    path: "/devolucion/caja",
    element: <MenuLateral><Devolucion /></MenuLateral>,
  },
  {
    path: "/usuarionormal",
    element: <MenuLateral><UsuarioNormal /></MenuLateral>,
  },
  {
    path: "/usuarionormal/eventos",
    element: <MenuLateral><UsuarioNormal /></MenuLateral>,
  },
  {
    path: "/usuarionormal/comprar",
    element: <MenuLateral><UsuarioNormal /></MenuLateral>,
  },
  {
    path: "/usuarionormal/saldo",
    element: <MenuLateral><UsuarioNormal /></MenuLateral>,
  },
  {
    path: "/usuarionegocio",
    element: <MenuLateral><UsuarioNegocio /></MenuLateral>,
  },
  {
    path: "/usuarionegocio/ayudantes",
    element: <MenuLateral><MisAyudantes /></MenuLateral>,
  },
  {
    path: "/usuarionegocio/catalogo",
    element: <MenuLateral><MiCatalogo /></MenuLateral>,
  },
  {
    path: "/usuarionegocio/catalogo/:id",
    element: <MenuLateral><MiCatalogoPuesto /></MenuLateral>,
  },
  {
    path: "/usuarionegocio/evento/:eventoId/puesto/:puestoId",
    element: <MenuLateral><MiPuestoDetalle /></MenuLateral>,
  },
  {
    path: "/UsuNegoDasboar",
    element: <MenuLateral><UsuNegoDasboar /></MenuLateral>,
  },
  {
    path: "/ayudante",
    element: <MenuLateral><Ayudante /></MenuLateral>,
  },
  {
    path: "/perfil",
    element: <MenuLateral><Perfil /></MenuLateral>,
  },
  // Manillas duplicadas: Admin, Supervisor y Cliente (el backend filtra por evento).
  {
    path: "/duplicados",
    element: <MenuLateral><PersonasPorEncontrar /></MenuLateral>,
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Avisos flotantes globales (useAvisos): disponibles en toda la app. */}
    <AvisosProvider>
      <RouterProvider router={router} />
    </AvisosProvider>
  </StrictMode>,
)