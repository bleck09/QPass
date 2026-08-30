import { useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useNavigate } from 'react-router-dom';
import { 
  MdEmail, MdLock, MdArrowBack, MdVisibility, MdVisibilityOff 
} from 'react-icons/md';
import { FaShieldAlt, FaEnvelopeOpenText, FaKey } from 'react-icons/fa';
import api from '../../api/index.js';
import './RecuperarContra.css';

export default function RecuperarContra() {
  useTituloPagina('Recuperar contraseña');
  const navigate = useNavigate();

  // --- PASOS DEL FLUJO ---
  // 1: Ingresar Correo | 2: Código OTP | 3: Nueva Contraseña
  const [step, setStep] = useState(1);

  // --- ESTADOS DE DATOS ---
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // No hay servicio de correo: el backend devuelve el código en la respuesta para poder
  // probar el flujo. En producción esto no existiría y el código llegaría solo por correo.
  const [codigoDemo, setCodigoDemo] = useState('');

  // --- ESTADOS DE UI ---
  const inputRefs = useRef([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mantener colores globales
  const [theme] = useState(() => {
    const dataGuardada = localStorage.getItem('pi_landing_config');
    return dataGuardada ? JSON.parse(dataGuardada) : {
      colorPrimario: '#00B4D8', colorFondo: '#0b1120', colorBoton: '#FFFFFF'
    };
  });

  // ==========================================
  // PASO 1: ENVIAR CORREO
  // ==========================================
  const handlePedirCodigo = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }

    try {
      const { codigoDemo: codigo } = await api.auth.recuperarSolicitar(email);
      setCodigoDemo(codigo);
      setOtp(['', '', '', '', '', '']);
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // PASO 2: VERIFICAR OTP (Lógica heredada de Registro)
  // ==========================================
  const handleOtpChange = (index, value) => {
    const soloNumeros = value.replace(/\D/g, ''); 
    if (!soloNumeros && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = soloNumeros;
    setOtp(newOtp);

    if (soloNumeros && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setError('');

    const codigoIngresado = otp.join('');

    if (codigoIngresado.length < 6) {
      setError('Debes ingresar los 6 dígitos del código.');
      return;
    }

    try {
      await api.auth.recuperarVerificar(email, codigoIngresado);
      setStep(3);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReenviarCodigo = async () => {
    setError('');
    try {
      const { codigoDemo: codigo } = await api.auth.recuperarSolicitar(email);
      setCodigoDemo(codigo);
      setOtp(['', '', '', '', '', '']);
      setSuccess('Se generó un nuevo código.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // PASO 3: CAMBIAR CONTRASEÑA
  // ==========================================
  const handleRestablecerContra = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Completa ambos campos de contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      await api.auth.recuperarRestablecer(email, otp.join(''), password);
      setSuccess('¡Contraseña actualizada con éxito! Redirigiendo al login...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  const estiloDinamico = {
    '--color-primario': theme.colorPrimario,
    '--color-fondo': theme.colorFondo,
    '--color-boton': theme.colorBoton
  };

  return (
    <div className="pi-recover-wrapper" style={estiloDinamico}>
      
      {/* Luces de fondo */}
      <div className="bg-glow glow-top-left"></div>
      <div className="bg-glow glow-bottom-right"></div>

      <div className="pi-recover-top-bar">
        {step === 1 ? (
          <button className="pi-recover-btn-back" onClick={() => navigate('/login')}>
            <MdArrowBack size={20} /> Volver al Login
          </button>
        ) : step === 2 ? (
          <button className="pi-recover-btn-back" onClick={() => { setStep(1); setError(''); }}>
            <MdArrowBack size={20} /> Cambiar correo
          </button>
        ) : (
          <button className="pi-recover-btn-back" onClick={() => navigate('/login')}>
            <MdArrowBack size={20} /> Cancelar recuperación
          </button>
        )}
      </div>

      {/* Landmark principal de la pantalla (Manual 11) */}
      <main className="pi-recover-content" id="contenido">
        <div className="pi-recover-card glass-panel">
          
          {/* =====================================
              PASO 1: PEDIR CORREO
          ===================================== */}
          {step === 1 && (
            <div className="animate-fade pi-recover-step">
              <div className="recover-icon-wrapper">
                <FaShieldAlt size={40} />
              </div>
              {/* h1 del paso activo (solo se muestra un paso a la vez) */}
              <h1 className="pi-recover-title">Recuperar contraseña</h1>
              <p className="pi-recover-subtitle">
                Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un código de seguridad para verificar tu identidad.
              </p>

              <form onSubmit={handlePedirCodigo} className="pi-recover-form">
                <div className="pi-recover-input-group">
                  <label htmlFor="rec-email">Correo electrónico registrado</label>
                  <div className="pi-recover-input-wrapper">
                    <span className="pi-recover-icon" aria-hidden="true"><MdEmail size={20} /></span>
                    <input
                      id="rec-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@qpass.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && <p className="pi-recover-error" role="alert">{error}</p>}
                {success && <p className="pi-recover-success" role="status">{success}</p>}

                <button type="submit" className="pi-recover-btn-submit">Enviar código →</button>
              </form>
            </div>
          )}

          {/* =====================================
              PASO 2: VERIFICAR CÓDIGO (OTP)
          ===================================== */}
          {step === 2 && (
            <div className="animate-fade pi-recover-step">
              <div className="recover-icon-wrapper">
                <FaEnvelopeOpenText size={40} />
              </div>
              <h1 className="pi-recover-title">Código de seguridad</h1>
              <p className="pi-recover-subtitle">
                Generamos un código de 6 dígitos para <strong>{email}</strong>. Ingrésalo a continuación para continuar.
              </p>
              {codigoDemo && (
                <p className="pi-recover-subtitle" style={{ fontWeight: 'bold' }}>
                  Modo desarrollo (sin envío de correo real): tu código es <strong>{codigoDemo}</strong>
                </p>
              )}

              <form onSubmit={handleVerificarCodigo} className="pi-recover-form">
                <fieldset className="otp-inputs-container" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="sr-only">Código de seguridad de 6 dígitos</legend>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength="1"
                      className="otp-digit-input"
                      aria-label={`Dígito ${index + 1} de 6`}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoFocus={index === 0}
                    />
                  ))}
                </fieldset>

                {error && <p className="pi-recover-error" role="alert">{error}</p>}
                {success && <p className="pi-recover-success" role="status">{success}</p>}

                <button type="submit" className="pi-recover-btn-submit" style={{marginTop: '20px'}}>
                  Verificar código
                </button>
              </form>
              <p className="otp-resend">¿No lo recibiste? <button type="button" onClick={handleReenviarCodigo}>Reenviar código</button></p>
            </div>
          )}

          {/* =====================================
              PASO 3: NUEVA CONTRASEÑA
          ===================================== */}
          {step === 3 && (
            <div className="animate-fade pi-recover-step">
              <div className="recover-icon-wrapper">
                <FaKey size={40} />
              </div>
              <h1 className="pi-recover-title">Crear nueva contraseña</h1>
              <p className="pi-recover-subtitle">
                Identidad verificada. Por favor, escribe una contraseña segura que no hayas usado antes.
              </p>

              <form onSubmit={handleRestablecerContra} className="pi-recover-form">
                
                <div className="pi-recover-input-group">
                  <label htmlFor="rec-password">Nueva contraseña</label>
                  <div className="pi-recover-input-wrapper">
                    <span className="pi-recover-icon" aria-hidden="true"><MdLock size={20} /></span>
                    <input
                      id="rec-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className="pi-recover-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <MdVisibilityOff size={20} aria-hidden="true" /> : <MdVisibility size={20} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="pi-recover-input-group">
                  <label htmlFor="rec-password-2">Confirmar nueva contraseña</label>
                  <div className="pi-recover-input-wrapper">
                    <span className="pi-recover-icon" aria-hidden="true"><MdLock size={20} /></span>
                    <input
                      id="rec-password-2"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      required
                    />
                  </div>
                </div>

                {error && <p className="pi-recover-error" role="alert">{error}</p>}
                {success && <p className="pi-recover-success" role="status">{success}</p>}

                <button type="submit" className="pi-recover-btn-submit">Restablecer contraseña</button>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}