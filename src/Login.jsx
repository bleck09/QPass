import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdEmail, MdLock, MdKeyboardArrowDown, MdKeyboardArrowUp, MdArrowBack } from 'react-icons/md';
import { FaBuilding } from 'react-icons/fa';
import './Login.css';

// 1. Credenciales con los 7 roles y el campo 'nombre' agregado para el MenuLateral
const testCredentials = [
  { rol: 'Admin', nombre: 'Carlos Admin', email: 'admin@proyectodeingresos.com', pass: '123456', path: '/admin' },
  { rol: 'Recargador', nombre: 'Juan Recargador', email: 'recargador@proyectodeingresos.com', pass: '123456', path: '/recargador' },
  { rol: 'Supervisor', nombre: 'Ana Supervisor', email: 'supervisor@proyectodeingresos.com', pass: '123456', path: '/supervisor' },
  { rol: 'Devolución', nombre: 'Luis Devoluciones', email: 'devolucion@proyectodeingresos.com', pass: '123456', path: '/devolucion' },
  { rol: 'Usuario Normal', nombre: 'Pedro Normal', email: 'normal@proyectodeingresos.com', pass: '123456', path: '/usuarionormal' },
  { rol: 'Usuario Negocio', nombre: 'María Negocio', email: 'negocio@proyectodeingresos.com', pass: '123456', path: '/usuarionegocio' },
  { rol: 'Ayudante', nombre: 'José Ayudante', email: 'ayudante@proyectodeingresos.com', pass: '123456', path: '/ayudante' }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showDevCredentials, setShowDevCredentials] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const user = testCredentials.find(
      (u) => u.email === email && u.pass === password
    );

    if (user) {
      // Guardamos al usuario en localStorage para que el MenuLateral lo pueda leer
      localStorage.setItem('usuarioProyectoIngresos', JSON.stringify(user));
      navigate(user.path);
    } else {
      setError('Credenciales incorrectas. Verifica tu correo o contraseña.');
    }
  };

  return (
    <div className="pi-login-wrapper">
      
      {/* Botón de volver al inicio que queda fuera de la tarjeta blanca o en la parte superior */}
      <div className="pi-login-top-bar">
        <button 
          className="pi-login-btn-back" 
          onClick={() => navigate('/')}
        >
          <MdArrowBack size={20} />
          Volver al inicio
        </button>
      </div>

      <div className="pi-login-card">
        <h2 className="pi-login-title">Iniciar Sesión</h2>
        <p className="pi-login-subtitle">Ingrese sus credenciales para acceder al portal.</p>

        <form onSubmit={handleLogin} className="pi-login-form">
          <div className="pi-login-input-group">
            <label>CORREO ELECTRÓNICO</label>
            <div className="pi-login-input-wrapper">
              <span className="pi-login-icon">
                <MdEmail size={20} color="#718096" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@proyectodeingresos.com"
                required
              />
            </div>
          </div>

          <div className="pi-login-input-group">
            <label>CONTRASEÑA</label>
            <div className="pi-login-input-wrapper">
              <span className="pi-login-icon">
                <MdLock size={20} color="#718096" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="pi-login-options">
            <label className="pi-login-checkbox">
              <input type="checkbox" /> Recordarme
            </label>
            <a href="#" className="pi-login-forgot">¿Olvidó su contraseña?</a>
          </div>

          {error && <p className="pi-login-error">{error}</p>}

          <button type="submit" className="pi-login-btn-enter">ENTRAR →</button>
          
          <div className="pi-login-divider"><span>o</span></div>

          <button type="button" className="pi-login-btn-register">
            REGISTRARME <FaBuilding style={{ marginLeft: '8px' }} />
          </button>
        </form>
      </div>

      {/* Acordeón de credenciales (Dev) */}
      <div className="pi-login-dev-accordion">
        <button
          type="button"
          className="pi-login-dev-btn"
          onClick={() => setShowDevCredentials(!showDevCredentials)}
        >
          <b>Ver credenciales de prueba (Dev)</b>
          <span>
            {showDevCredentials ? <MdKeyboardArrowUp size={24} /> : <MdKeyboardArrowDown size={24} />}
          </span>
        </button>

        {showDevCredentials && (
          <div className="pi-login-dev-content">
            <table className="pi-login-dev-table">
              <thead>
                <tr>
                  <th>Rol</th>
                  <th>Usuario</th>
                  <th>Contraseña</th>
                </tr>
              </thead>
              <tbody>
                {testCredentials.map((cred, index) => (
                  <tr key={index}>
                    <td>{cred.rol}</td>
                    <td>{cred.email}</td>
                    <td>{cred.pass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}