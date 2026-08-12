import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import App from './App.jsx'
import Login from './Login.jsx'
import MenuLateral from './MenuLateral.jsx' 

import Admin from './Admin.jsx'
import AdminConfigurarPagina from './AdminConfigurarPagina.jsx'
import UsuNegoDasboar from './UsuNegoDasboar.jsx'
// 1. IMPORTAMOS TU NUEVA HOJA AQUÍ
import AdCreaUsuarioNegocio from './AdCreaUsuarioNegocio.jsx' 
import UsuNegoCreaAyudante from './UsuNegoCreaAyudante.jsx'

import Cliente from './Cliente.jsx'
import Recargador from './Recargador.jsx'
import Supervisor from './Supervisor.jsx'
import Devolucion from './Devolucion.jsx'
import UsuarioNormal from './UsuarioNormal.jsx'
import UsuarioNegocio from './UsuarioNegocio.jsx'
import Ayudante from './Ayudante.jsx'
import Perfil from './Perfil.jsx'

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/login", element: <Login /> },
  
  {
    path: "/admin",
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