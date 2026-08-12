import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import App from './App.jsx'
import Login from './Login.jsx'
import MenuLateral from './MenuLateral.jsx' 

import Admin from './Admin.jsx'
// 1. IMPORTAMOS TU NUEVA HOJA AQUÍ
import AdCreaUsuarioNegocio from './AdCreaUsuarioNegocio.jsx' 

import Recargador from './Recargador.jsx'
import Supervisor from './Supervisor.jsx'
import Devolucion from './Devolucion.jsx'
import UsuarioNormal from './UsuarioNormal.jsx'
import UsuarioNegocio from './UsuarioNegocio.jsx'
import Ayudante from './Ayudante.jsx'

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
    path: "/recargador",
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
    path: "/usuarionegocio",
    element: <MenuLateral><UsuarioNegocio /></MenuLateral>,
  },
  {
    path: "/ayudante",
    element: <MenuLateral><Ayudante /></MenuLateral>,
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)