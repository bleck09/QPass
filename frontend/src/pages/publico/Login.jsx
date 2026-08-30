import { useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MdEmail, 
  MdLock, 
  MdKeyboardArrowDown, 
  MdKeyboardArrowUp, 
  MdArrowBack,
  MdVisibility,        // <- Ícono Ojo Abierto
  MdVisibilityOff      // <- Ícono Ojo Cerrado
} from 'react-icons/md';
import { FaBuilding } from 'react-icons/fa';
import { ROLE_LABELS, ROLE_HOME_PATH } from '../../constants/roles.js';
import { guardarSesion } from '../../api/client.js';
import api from '../../api/index.js';
import './Login.css';

// Cuentas de prueba sembradas por backend/prisma/seed.js (password "123456" para todas).
const credencialesDemo = [
  { rol: 'Admin', email: 'admin@qpass.com' },
  { rol: 'Cliente', email: 'cliente@qpass.com' },
  { rol: 'Recargador', email: 'recargador@qpass.com' },
  { rol: 'Supervisor', email: 'supervisor@qpass.com' },
  { rol: 'Devolucion', email: 'devolucion@qpass.com' },
  { rol: 'UsuarioNormal', email: 'normal@qpass.com' },
  { rol: 'UsuarioNegocio', email: 'negocio@qpass.com' },
  { rol: 'Ayudante', email: 'ayudante@qpass.com' },
].map(c => ({ ...c, label: ROLE_LABELS[c.rol], pass: '123456' }));

export default function Login() {
  useTituloPagina('Iniciar sesión');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // <- Estado para ver contraseña
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [showDevCredentials, setShowDevCredentials] = useState(false);
  const navigate = useNavigate();

  // Leemos la configuración de la Landing Page para que el Login herede los colores de la marca
  const [theme] = useState(() => {
    const dataGuardada = localStorage.getItem('pi_landing_config');
    return dataGuardada ? JSON.parse(dataGuardada) : {
      colorPrimario: '#00B4D8',
      colorFondo: '#0b1120',
      colorBoton: '#FFFFFF'
    };
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { token, usuario } = await api.auth.login(email, password);
      guardarSesion({ ...usuario, token });
      navigate(ROLE_HOME_PATH[usuario.rol] || '/');
    } catch (err) {
      setError(err.message === 'Credenciales inválidas' ? 'Credenciales incorrectas. Verifica tu correo o contraseña.' : err.message);
    } finally {
      setCargando(false);
    }
  };

  // Aplicamos los colores dinámicamente
  const estiloDinamico = {
    '--color-primario': theme.colorPrimario,
    '--color-fondo': theme.colorFondo,
    '--color-boton': theme.colorBoton
  };

  return (
    <div className="pi-login-wrapper" style={estiloDinamico}>
      
      {/* Luces de fondo (Glow Effect) */}
      <div className="bg-glow glow-top-left"></div>
      <div className="bg-glow glow-bottom-right"></div>

      {/* Botón de volver */}
      <div className="pi-login-top-bar">
        <button type="button" className="pi-login-btn-back" onClick={() => navigate('/')}>
          <MdArrowBack size={20} aria-hidden="true" />
          Volver al inicio
        </button>
      </div>

      {/* Landmark principal + único h1 de la pantalla (Manual 11) */}
      <main className="pi-login-content" id="contenido">
        <div className="pi-login-card glass-panel">
          <h1 className="pi-login-title">Iniciar sesión</h1>
          <p className="pi-login-subtitle">Ingrese sus credenciales para acceder al portal de QPass.</p>

          <form onSubmit={handleLogin} className="pi-login-form">
            
            {/* CORREO — label asociado por id + autocomplete (Manual 8.3) */}
            <div className="pi-login-input-group">
              <label htmlFor="login-email">Correo electrónico</label>
              <div className="pi-login-input-wrapper">
                <span className="pi-login-icon" aria-hidden="true">
                  <MdEmail size={20} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@qpass.com"
                  required
                />
              </div>
            </div>

            {/* CONTRASEÑA */}
            <div className="pi-login-input-group">
              <label htmlFor="login-password">Contraseña</label>
              <div className="pi-login-input-wrapper">
                <span className="pi-login-icon" aria-hidden="true">
                  <MdLock size={20} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />

                {/* Ver/ocultar contraseña: aria-label + aria-pressed en vez de solo title */}
                <button
                  type="button"
                  className="pi-login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  {showPassword
                    ? <MdVisibilityOff size={20} aria-hidden="true" />
                    : <MdVisibility size={20} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="pi-login-options">
              <label className="pi-login-checkbox">
                <input type="checkbox" /> Recordarme
              </label>
              <Link to="/recuperar" className="pi-login-forgot">¿Olvidó su contraseña?</Link>
            </div>

            {error && <p className="pi-login-error">{error}</p>}

            <button type="submit" className="pi-login-btn-enter" disabled={cargando}>
              {cargando ? 'Entrando…' : 'Entrar →'}
            </button>
            
            <div className="pi-login-divider"><span>o</span></div>

            <button
              type="button"
              className="pi-login-btn-register"
              onClick={() => navigate('/registrar')}
            >
              Registrarme <FaBuilding style={{ marginLeft: '8px' }} aria-hidden="true" />
            </button>
          </form>
        </div>

        {/* Acordeón de credenciales (Dev) adaptado al Glassmorphism */}
        <div className="pi-login-dev-accordion">
          <button
            type="button"
            className="pi-login-dev-btn glass-panel"
            onClick={() => setShowDevCredentials(!showDevCredentials)}
          >
            <b>Ver credenciales de prueba (Dev)</b>
            <span>
              {showDevCredentials ? <MdKeyboardArrowUp size={24} /> : <MdKeyboardArrowDown size={24} />}
            </span>
          </button>

          {showDevCredentials && (
            <div className="pi-login-dev-content glass-panel">
              <table className="pi-login-dev-table">
                <thead>
                  <tr>
                    <th scope="col">Rol</th>
                    <th scope="col">Usuario</th>
                    <th scope="col">Contraseña</th>
                  </tr>
                </thead>
                <tbody>
                  {credencialesDemo.map((cred, index) => (
                    <tr key={index}>
                      <td>{cred.label}</td>
                      <td>{cred.email}</td>
                      <td>{cred.pass}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}