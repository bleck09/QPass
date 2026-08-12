import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import App from './App.jsx'
import Login from './Login.jsx'
import MenuLateral from './MenuLateral.jsx' // <-- IMPORTAMOS EL NUEVO COMPONENTE

import Admin from './Admin.jsx'
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
  
  // Envolvemos las rutas de roles dentro de MenuLateral
  {
    path: "/admin",
    element: <MenuLateral><Admin /></MenuLateral>,
  },
  {
    path: "/recargador",
    element: <MenuLateral><Recargador /></MenuLateral>,
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