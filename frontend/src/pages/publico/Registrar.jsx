import { useState, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useNavigate } from 'react-router-dom';
import {
  MdEmail, MdLock, MdArrowBack, MdVisibility, MdVisibilityOff
} from 'react-icons/md';
import {
  FaUser, FaIdCard, FaBirthdayCake, FaChevronDown, FaEnvelopeOpenText
} from 'react-icons/fa';
import { ROLES } from '../../constants/roles.js';
import api from '../../api/index.js';
import './auth.css';
import './Registrar.css';

const TOTAL_PASOS = 3;

export default function Registrar() {
  useTituloPagina('Crear cuenta');
  const navigate = useNavigate();

  // 1 = Identidad · 2 = Acceso · 3 = Verificación (OTP)
  const [step, setStep] = useState(1);

  // --- ESTADOS DE DATOS ---
  const [nombre, setNombre] = useState('');
  const [paterno, setPaterno] = useState('');
  const [materno, setMaterno] = useState('');
  const [email, setEmail] = useState('');
  const [ci, setCi] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [celular, setCelular] = useState('');

  // --- CÓDIGO OTP (6 dígitos) ---
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  // --- UI ---
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fechaHoyStr = new Date().toISOString().split('T')[0];

  const handleCelularChange = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '');
    if (soloNumeros.length <= 8) setCelular(soloNumeros);
  };

  const volver = () => {
    setError('');
    if (step === 1) navigate('/login');
    else setStep(step - 1);
  };

  // PASO 1 -> 2: datos de identidad
  const handlePaso1 = (e) => {
    e.preventDefault();
    setError('');
    if (!nombre || !paterno || !materno || !ci) {
      setError('Completá tu nombre, apellidos y documento.');
      return;
    }
    setStep(2);
  };

  // PASO 2 -> 3: credenciales (+ opcionales) y "envío" del código
  const handlePaso2 = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !confirmPassword) {
      setError('Completá el correo y la contraseña.');
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
    if (celular && celular.length < 8) {
      setError('El celular debe tener exactamente 8 dígitos.');
      return;
    }
    // Simulamos el envío del correo con el código.
    setStep(3);
  };

  // --- OTP ---
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

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    const codigoIngresado = otp.join('');
    if (codigoIngresado.length < 6) {
      setError('Debes ingresar los 6 dígitos del código.');
      return;
    }
    // SIMULACIÓN: el código correcto es siempre 123456
    if (codigoIngresado !== '123456') {
      setError('Código incorrecto. Para esta prueba usá: 123456');
      return;
    }
    try {
      await api.auth.registro({
        rol: ROLES.USUARIO_NORMAL,
        nombre,
        apellidoPaterno: paterno,
        apellidoMaterno: materno,
        email,
        ci,
        password,
        fechaNacimiento: fechaNacimiento || undefined,
        celular: celular || undefined,
      });
      setSuccess('¡Correo verificado! Cuenta creada exitosamente.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message === 'El email ya está registrado' ? 'Ese correo ya tiene una cuenta registrada.' : err.message);
    }
  };

  return (
    <div className="pi-auth">
      <button type="button" className="pi-auth__back" onClick={volver}>
        <MdArrowBack size={18} aria-hidden="true" /> {step === 1 ? 'Volver al login' : 'Atrás'}
      </button>

      <div className="pi-auth__card">
        <div className="pi-auth__panel">
        <main className="pi-auth__body" id="contenido">

          {/* Progreso */}
          <div className="pi-auth__progress" aria-hidden="true">
            {Array.from({ length: TOTAL_PASOS }, (_, i) => (
              <span key={i} className={i + 1 <= step ? 'is-on' : ''} />
            ))}
            <span className="pi-auth__progress-label">Paso {step} de {TOTAL_PASOS}</span>
          </div>

          {/* ===== PASO 1: IDENTIDAD ===== */}
          {step === 1 && (
            <div className="animate-fade">
              <h1 className="pi-auth__title">Crear cuenta</h1>
              <p className="pi-auth__subtitle">Empecemos por tus datos personales.</p>

              <form onSubmit={handlePaso1} className="pi-auth__form">
                <div className="pi-auth__field">
                  <label htmlFor="reg-nombre">Nombre(s)</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><FaUser size={15} /></span>
                    <input id="reg-nombre" type="text" autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Carlos" required />
                  </div>
                </div>

                <div className="pi-register-grid">
                  <div className="pi-auth__field">
                    <label htmlFor="reg-paterno">Apellido paterno</label>
                    <div className="pi-auth__control">
                      <span className="pi-auth__icon" aria-hidden="true"><FaUser size={15} /></span>
                      <input id="reg-paterno" type="text" autoComplete="family-name" value={paterno} onChange={(e) => setPaterno(e.target.value)} placeholder="Pérez" required />
                    </div>
                  </div>
                  <div className="pi-auth__field">
                    <label htmlFor="reg-materno">Apellido materno</label>
                    <div className="pi-auth__control">
                      <span className="pi-auth__icon" aria-hidden="true"><FaUser size={15} /></span>
                      <input id="reg-materno" type="text" autoComplete="additional-name" value={materno} onChange={(e) => setMaterno(e.target.value)} placeholder="Gómez" required />
                    </div>
                  </div>
                </div>

                <div className="pi-auth__field">
                  <label htmlFor="reg-ci">Documento de identidad (C.I.)</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><FaIdCard size={15} /></span>
                    <input id="reg-ci" type="text" inputMode="numeric" value={ci} onChange={(e) => setCi(e.target.value)} placeholder="Ej. 1234567" required />
                  </div>
                </div>

                {error && <p className="pi-auth__error" role="alert">{error}</p>}
                <button type="submit" className="pi-auth__submit">Continuar</button>
              </form>
            </div>
          )}

          {/* ===== PASO 2: ACCESO ===== */}
          {step === 2 && (
            <div className="animate-fade">
              <h1 className="pi-auth__title">Datos de acceso</h1>
              <p className="pi-auth__subtitle">Con esto vas a entrar a QPass.</p>

              <form onSubmit={handlePaso2} className="pi-auth__form">
                <div className="pi-auth__field">
                  <label htmlFor="reg-email">Correo electrónico</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><MdEmail size={17} /></span>
                    <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
                  </div>
                </div>

                <div className="pi-auth__field">
                  <label htmlFor="reg-password">Contraseña</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><MdLock size={17} /></span>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres" required
                    />
                    <button
                      type="button"
                      className="pi-auth__ghost-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <MdVisibilityOff size={17} aria-hidden="true" /> : <MdVisibility size={17} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="pi-auth__field">
                  <label htmlFor="reg-password-2">Confirmar contraseña</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><MdLock size={17} /></span>
                    <input
                      id="reg-password-2"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetí tu contraseña" required
                    />
                  </div>
                </div>

                <div className="pi-register-divider"><span>Opcional</span></div>

                <div className="pi-auth__field">
                  <label htmlFor="reg-celular">Teléfono celular</label>
                  <div className="pi-register-phone-wrapper">
                    <div className="phone-country-dropdown" aria-hidden="true">
                      <span className="flag">🇧🇴</span>
                      <FaChevronDown size={10} className="chevron" />
                      <span className="code">+591</span>
                    </div>
                    <input
                      id="reg-celular"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={celular}
                      onChange={handleCelularChange}
                      placeholder="12345678"
                    />
                  </div>
                </div>

                <div className="pi-auth__field">
                  <label htmlFor="reg-nacimiento">Fecha de nacimiento</label>
                  <div className="pi-auth__control">
                    <span className="pi-auth__icon" aria-hidden="true"><FaBirthdayCake size={15} /></span>
                    <input
                      id="reg-nacimiento"
                      type="date"
                      autoComplete="bday"
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      max={fechaHoyStr}
                    />
                  </div>
                </div>

                {error && <p className="pi-auth__error" role="alert">{error}</p>}
                <button type="submit" className="pi-auth__submit">Verificar correo</button>
              </form>
            </div>
          )}

          {/* ===== PASO 3: VERIFICACIÓN OTP ===== */}
          {step === 3 && (
            <div className="animate-fade otp-step-container">
              <div className="otp-icon-wrapper">
                <FaEnvelopeOpenText size={40} aria-hidden="true" />
              </div>
              <h1 className="pi-auth__title">Verificá tu correo</h1>
              <p className="pi-auth__subtitle">
                Enviamos un código de 6 dígitos a <strong>{email}</strong>.
                <br />Ingresálo para crear tu cuenta.
              </p>

              <form onSubmit={handleVerifyAndRegister} className="otp-form">
                <fieldset className="otp-inputs-container" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="sr-only">Código de verificación de 6 dígitos</legend>
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

                <button type="submit" className="pi-auth__submit" style={{ marginTop: '28px' }}>
                  Confirmar y registrar
                </button>
              </form>

              <p className="otp-resend">¿No recibiste el código? <button type="button">Reenviar</button></p>
            </div>
          )}

        </main>
      </div>

      <aside className="pi-auth__aside" aria-hidden="true">
        <div className="pi-auth__tagline">
          <p className="pi-auth__eyebrow">QPass</p>
          <h2>Sumate a QPass y viví cada evento sin filas</h2>
        </div>
      </aside>
      </div>
    </div>
  );
}
