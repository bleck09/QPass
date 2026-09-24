import { useState, useEffect } from 'react';
import { forzarTemaClaro } from '../../utils/tema.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft, FaSignInAlt } from 'react-icons/fa';
import { ROLE_HOME_PATH } from '../../constants/roles.js';
import { guardarSesion } from '../../api/client.js';
import api from '../../api/index.js';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import { AvisoFijo } from '../../components/Avisos.jsx';
import { errorCorreo, errorObligatorio, limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
import './auth.css';

const validar = ({ email, password }) => limpiarErrores({
  'login-email': errorCorreo(email),
  'login-password': errorObligatorio(password, 'Escribí tu contraseña.'),
});

export default function Login() {
  // Esta pantalla se ve siempre en claro: el tema oscuro es solo del
  // panel (ver utils/tema.js).
  useEffect(() => { forzarTemaClaro(); }, []);

  useTituloPagina('Iniciar sesión');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Error del servidor (credenciales, red). Los de cada campo van junto al campo.
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  // Los errores por campo se ven recién después del primer intento (PLAN §2.5).
  const [intento, setIntento] = useState(false);
  const navigate = useNavigate();

  const errores = intento ? validar({ email, password }) : {};

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIntento(true);
    const errs = validar({ email, password });
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['login-email', 'login-password']);

    setCargando(true);
    try {
      const { token, usuario } = await api.auth.login(email.trim(), password);
      guardarSesion({ ...usuario, token });
      navigate(ROLE_HOME_PATH[usuario.rol] || '/');
    } catch (err) {
      setError(err.message === 'Credenciales inválidas' ? 'Credenciales incorrectas. Verificá tu correo o contraseña.' : err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="pi-auth">
      <Boton variante="translucido" tamano="sm" pildora icono={FaArrowLeft} className="pi-auth__volver" onClick={() => navigate('/')}>
        Volver al inicio
      </Boton>

      <div className="pi-auth__card">
        <div className="pi-auth__panel">
        {/* Landmark principal + único h1 de la pantalla (Manual 11) */}
        <main className="pi-auth__body" id="contenido">
          <h1 className="pi-auth__title">Iniciar sesión</h1>
          <p className="pi-auth__subtitle">Ingresá tus credenciales para acceder al portal de QPass.</p>

          <form onSubmit={handleLogin} className="pi-auth__form" noValidate>
            <Campo
              id="login-email" etiqueta="Correo electrónico" icono={FaEnvelope}
              type="email" autoComplete="email" placeholder="usuario@qpass.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              error={errores['login-email']}
            />
            <Campo
              id="login-password" etiqueta="Contraseña" contrasena maxLength={72}
              etiquetaExtra={<Link to="/recuperar" className="pi-auth__link">¿Olvidaste tu contraseña?</Link>}
              autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              error={errores['login-password']}
            />

            {error && <AvisoFijo tono="error">{error}</AvisoFijo>}

            <Boton type="submit" tamano="lg" pildora anchoCompleto icono={FaSignInAlt} cargando={cargando}>
              {cargando ? 'Entrando…' : 'Entrar'}
            </Boton>

            <div className="pi-auth__separador"><span>o</span></div>

            <Boton variante="secundario" tamano="lg" pildora anchoCompleto onClick={() => navigate('/registrar')}>
              Crear una cuenta
            </Boton>
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
