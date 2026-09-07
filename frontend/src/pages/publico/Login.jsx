import { useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdEmail,
  MdLock,
  MdArrowBack,
  MdVisibility,
  MdVisibilityOff
} from 'react-icons/md';
import { ROLE_HOME_PATH } from '../../constants/roles.js';
import { guardarSesion } from '../../api/client.js';
import api from '../../api/index.js';
import './auth.css';
import './Login.css';

export default function Login() {
  useTituloPagina('Iniciar sesión');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="pi-auth">
      <button type="button" className="pi-auth__back" onClick={() => navigate('/')}>
        <MdArrowBack size={18} aria-hidden="true" /> Volver al inicio
      </button>

      <div className="pi-auth__card">
        <div className="pi-auth__panel">
        {/* Landmark principal + único h1 de la pantalla (Manual 11) */}
        <main className="pi-auth__body" id="contenido">
          <h1 className="pi-auth__title">Iniciar sesión</h1>
          <p className="pi-auth__subtitle">Ingresá tus credenciales para acceder al portal de QPass.</p>

          <form onSubmit={handleLogin} className="pi-auth__form">

            <div className="pi-auth__field">
              <label htmlFor="login-email">Correo electrónico</label>
              <div className="pi-auth__control">
                <span className="pi-auth__icon" aria-hidden="true"><MdEmail size={18} /></span>
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

            <div className="pi-auth__field">
              <label htmlFor="login-password">Contraseña</label>
              <div className="pi-auth__control">
                <span className="pi-auth__icon" aria-hidden="true"><MdLock size={18} /></span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="pi-auth__ghost-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  {showPassword
                    ? <MdVisibilityOff size={18} aria-hidden="true" />
                    : <MdVisibility size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="pi-login-options">
              <label className="pi-login-checkbox">
                <input type="checkbox" /> Recordarme
              </label>
              <Link to="/recuperar" className="pi-auth__link">¿Olvidaste tu contraseña?</Link>
            </div>

            {error && <p className="pi-auth__error" role="alert">{error}</p>}

            <button type="submit" className="pi-auth__submit" disabled={cargando}>
              {cargando ? 'Entrando…' : 'Entrar '}
            </button>

            <div className="pi-login-divider"><span>o</span></div>

            <button
              type="button"
              className="pi-login-btn-register"
              onClick={() => navigate('/registrar')}
            >
              Crear una cuenta
            </button>
          </form>
        </main>
      </div>

      <aside className="pi-auth__aside" aria-hidden="true">
        <div className="pi-auth__tagline">
          <p className="pi-auth__eyebrow">QPass</p>
          <h2>Tu acceso y tu billetera para cada evento</h2>
        </div>
      </aside>
      </div>
    </div>
  );
}
