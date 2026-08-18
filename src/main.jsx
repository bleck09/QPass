import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

// 1. IMPORTAMOS LA NUEVA LANDING PAGE GLOBAL Y LA DEL EVENTO
import PaginaPrincipal from './PaginaPrincipal.jsx'
import App from './App.jsx' 
import Login from './Login.jsx'
import MenuLateral from './MenuLateral.jsx' 

import Admin from './Admin.jsx'
import AdminConfigurarPagina from './AdminConfigurarPagina.jsx'
import UsuNegoDasboar from './UsuNegoDasboar.jsx'
import AdCreaUsuarioNegocio from './AdCreaUsuarioNegocio.jsx'
import AdminCrearTickets from './AdminCrearTickets.jsx'
import UsuNegoCreaAyudante from './UsuNegoCreaAyudante.jsx'
import Mapa from './Mapa.jsx'

import Cliente from './Cliente.jsx'
import Recargador from './Recargador.jsx'
import Supervisor from './Supervisor.jsx'
import Devolucion from './Devolucion.jsx'
import UsuarioNormal from './UsuarioNormal.jsx'
import UsuarioNegocio from './UsuarioNegocio.jsx'
import Ayudante from './Ayudante.jsx'
import Perfil from './Perfil.jsx'
import Registrar from './Registrar.jsx'
import RecuperarContra from './RecuperarContra.jsx'

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
    path: "/recargador",
    element: <MenuLateral><Recargador /></MenuLateral>,
  },
  {
    path: "/Cliente",
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
    path: "/devolucion",
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
    path: "/UsuNegoCreaAyudante",
    element: <MenuLateral><UsuNegoCreaAyudante /></MenuLateral>,
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