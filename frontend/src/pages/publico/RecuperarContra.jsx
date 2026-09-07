import { useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useNavigate } from 'react-router-dom';
import {
  MdEmail, MdLock, MdArrowBack, MdVisibility, MdVisibilityOff
} from 'react-icons/md';
import { FaShieldAlt, FaEnvelopeOpenText, FaKey } from 'react-icons/fa';
import api from '../../api/index.js';
import './auth.css';
import './RecuperarContra.css';

export default function RecuperarContra() {
  useTituloPagina('Recuperar contraseña');
  const navigate = useNavigate();

  // --- PASOS DEL FLUJO ---  1: Correo | 2: Código OTP | 3: Nueva contraseña
  const [step, setStep] = useState(1);

  // --- ESTADOS DE DATOS ---
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // No hay servicio de correo: el backend devuelve el código en la respuesta para
  // poder probar el flujo. En producción llegaría solo por correo.
  const [codigoDemo, setCodigoDemo] = useState('');

  // --- ESTADOS DE UI ---
  const inputRefs = useRef([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // PASO 1: enviar correo
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

  // PASO 2: verificar OTP
  const handleOtpChange = (index, value) => {
    const soloNumeros = value.replace(/\D/g, '');
    if (!soloNumeros && value !== '') return;
    const newOtp = [...otp];
    newOtp[index] = soloNumeros;
    setOtp(newOtp);
    if (soloNumeros && index < 5) inputRefs.current[index + 1].focus();
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

  // PASO 3: cambiar contraseña
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
      setSuccess('¡Contraseña actualizada! Redirigiendo al login…');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="pi-auth">
      {step === 1 ? (
        <button type="button" className="pi-auth__back" onClick={() => navigate('/login')}>
          <MdArrowBack size={18} aria-hidden="true" /> Volver al login
        </button>
      ) : step === 2 ? (
        <button type="button" className="pi-auth__back" onClick={() => { setStep(1); setError(''); }}>
          <MdArrowBack size={18} aria-hidden="true" /> Cambiar correo
        </button>
      ) : (
        <button type="button" className="pi-auth__back" onClick={() => navigate('/login')}>
          <MdArrowBack size={18} aria-hidden="true" /> Cancelar recuperación
        </button>
      )}

      <div className="pi-auth__card">
        <div className="pi-auth__panel">
        {/* Landmark principal de la pantalla (Manual 11) */}
        <main className="pi-auth__body" id="contenido">

          {/* ===== PASO 1: pedir correo ===== */}
          {step === 1 && (
            <div className="animate-fade pi-auth__step">
              <div className="pi-auth__step-icon"><FaShieldAlt size={34} aria-hidden="true" /></div>
              <h1 className="pi-auth__title">Recuperar contraseña</h1>
              <p className="pi-auth__subtitle">
                Ingresá el correo asociado a tu cuenta. Te enviaremos un código de seguridad para verificar tu identidad.
              </p>

              <form onSubmit={handlePedirCodigo} className="pi-auth__form">
                <div className="pi-auth__field">
                  <label htmlFor="rec-email">Correo electrónico registrado</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><MdEmail size={18} /></span>
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

                {error && <p className="pi-auth__error" role="alert">{error}</p>}
                {success && <p className="pi-auth__success" role="status">{success}</p>}

                <button type="submit" className="pi-auth__submit">Enviar código</button>
              </form>
            </div>
          )}

          {/* ===== PASO 2: verificar OTP ===== */}
          {step === 2 && (
            <div className="animate-fade pi-auth__step">
              <div className="pi-auth__step-icon"><FaEnvelopeOpenText size={34} aria-hidden="true" /></div>
              <h1 className="pi-auth__title">Código de seguridad</h1>
              <p className="pi-auth__subtitle">
                Generamos un código de 6 dígitos para <strong>{email}</strong>. Ingresálo abajo para continuar.
              </p>
              {codigoDemo && (
                <p className="pi-auth__subtitle">
                  Modo desarrollo (sin correo real): tu código es <strong>{codigoDemo}</strong>
                </p>
              )}

              <form onSubmit={handleVerificarCodigo} className="pi-auth__form">
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

                {error && <p className="pi-auth__error" role="alert">{error}</p>}
                {success && <p className="pi-auth__success" role="status">{success}</p>}

                <button type="submit" className="pi-auth__submit" style={{ marginTop: '20px' }}>
                  Verificar código
                </button>
              </form>
              <p className="otp-resend">¿No lo recibiste? <button type="button" onClick={handleReenviarCodigo}>Reenviar código</button></p>
            </div>
          )}

          {/* ===== PASO 3: nueva contraseña ===== */}
          {step === 3 && (
            <div className="animate-fade pi-auth__step">
              <div className="pi-auth__step-icon"><FaKey size={34} aria-hidden="true" /></div>
              <h1 className="pi-auth__title">Crear nueva contraseña</h1>
              <p className="pi-auth__subtitle">
                Identidad verificada. Escribí una contraseña segura que no hayas usado antes.
              </p>

              <form onSubmit={handleRestablecerContra} className="pi-auth__form">
                <div className="pi-auth__field">
                  <label htmlFor="rec-password">Nueva contraseña</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><MdLock size={18} /></span>
                    <input
                      id="rec-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className="pi-auth__ghost-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <MdVisibilityOff size={18} aria-hidden="true" /> : <MdVisibility size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="pi-auth__field">
                  <label htmlFor="rec-password-2">Confirmar nueva contraseña</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><MdLock size={18} /></span>
                    <input
                      id="rec-password-2"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetí tu contraseña"
                      required
                    />
                  </div>
                </div>

                {error && <p className="pi-auth__error" role="alert">{error}</p>}
                {success && <p className="pi-auth__success" role="status">{success}</p>}

                <button type="submit" className="pi-auth__submit">Restablecer contraseña</button>
              </form>
            </div>
          )}

        </main>
      </div>

      <aside className="pi-auth__aside" aria-hidden="true">
        <div className="pi-auth__tagline">
          <p className="pi-auth__eyebrow">QPass</p>
          <h2>Recuperá el acceso a tu cuenta</h2>
        </div>
      </aside>
      </div>
  </div>
  );
}
