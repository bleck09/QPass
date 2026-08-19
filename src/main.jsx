import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

// 1. IMPORTAMOS LA NUEVA LANDING PAGE GLOBAL Y LA DEL EVENTO
import PaginaPrincipal from './pages/publico/PaginaPrincipal.jsx'
import App from './pages/publico/App.jsx'
import Login from './pages/publico/Login.jsx'
import MenuLateral from './layout/MenuLateral.jsx'

import Admin from './pages/admin/Admin.jsx'
import AdminGestionEventos from './pages/admin/AdminGestionEventos.jsx'
import AdminConfigurarPagina from './pages/admin/AdminConfigurarPagina.jsx'
import UsuNegoDasboar from './pages/usuario-negocio/UsuNegoDasboar.jsx'
import AdCreaUsuarioNegocio from './pages/admin/AdCreaUsuarioNegocio.jsx'
import AdminCrearTickets from './pages/admin/AdminCrearTickets.jsx'
import AdminCrearQr from './pages/admin/AdminCrearQr.jsx'
import Mapa from './pages/admin/Mapa.jsx'

import Cliente from './pages/cliente/Cliente.jsx'
import Recargador from './pages/recargador/Recargador.jsx'
import Supervisor from './pages/supervisor/Supervisor.jsx'
import GestionEntrega from './pages/supervisor/GestionEntrega.jsx'
import Devolucion from './pages/devolucion/Devolucion.jsx'
import UsuarioNormal from './pages/usuario-normal/UsuarioNormal.jsx'
import UsuarioNegocio from './pages/usuario-negocio/UsuarioNegocio.jsx'
import Ayudante from './pages/ayudante/Ayudante.jsx'
import Perfil from './pages/perfil/Perfil.jsx'
import Registrar from './pages/publico/Registrar.jsx'
import RecuperarContra from './pages/publico/RecuperarContra.jsx'

const router = createBrowserRouter([
  // 2. ACTUALIZAMOS LAS RUTAS PÚBLICAS PRINCIPALES
  { path: "/", element: <PaginaPrincipal /> }, // La vista corporativa global de QPass
  { path: "/evento", element: <App /> },       // La vista específica del evento (Landing del cliente)
  { path: "/login", element: <Login /> },
   { path: "/Registrar", element: <Registrar/> },   
   { path: "/recuperar", element: <RecuperarContra/> }, 
      // Pantalla de inicio de sesión
  
  // RUTAS PRIVADAS (Con Menú Lateral)
  {
    path: "/admin",
    element: <MenuLateral><Admin /></MenuLateral>,
  },
  {
    path: "/admin/reportes",
    element: <MenuLateral><Admin /></MenuLateral>,
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
    element: <MenuLateral><Cliente/></MenuLateral>,
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
    element: <MenuLateral><UsuarioNegocio /></MenuLateral>,
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
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)