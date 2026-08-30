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
import './Registrar.css';

export default function Registrar() {
  useTituloPagina('Crear cuenta');
  const navigate = useNavigate();

  // --- PASOS DEL FORMULARIO ---
  const [step, setStep] = useState(1); // 1 = Datos, 2 = Verificación OTP

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
  
  // --- ESTADO DEL CÓDIGO OTP (6 dígitos) ---
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]); // Referencias para saltar al siguiente cuadro

  // --- ESTADOS DE UI ---
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [theme] = useState(() => {
    const dataGuardada = localStorage.getItem('pi_landing_config');
    return dataGuardada ? JSON.parse(dataGuardada) : {
      colorPrimario: '#00B4D8', colorFondo: '#0b1120', colorBoton: '#FFFFFF'
    };
  });

  const fechaHoyStr = new Date().toISOString().split('T')[0];

  // --- MANEJO DE CELULAR ---
  const handleCelularChange = (e) => {
    const valor = e.target.value;
    const soloNumeros = valor.replace(/\D/g, ''); // Borra letras
    if (soloNumeros.length <= 8) setCelular(soloNumeros);
  };

  // --- MANEJO DEL FORMULARIO (PASO 1) ---
  const handlePedirCodigo = (e) => {
    e.preventDefault();
    setError('');

    if (!nombre || !paterno || !materno || !email || !ci || !password || !confirmPassword) {
      setError('Por favor, completa todos los campos obligatorios (*).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (celular && celular.length < 8) {
      setError('El celular debe tener exactamente 8 dígitos.');
      return;
    }

    // Si todo está bien, pasamos al paso 2 (Simulamos que se envió el correo)
    setStep(2);
  };

  // --- MANEJO DEL CÓDIGO OTP (PASO 2) ---
  const handleOtpChange = (index, value) => {
    const soloNumeros = value.replace(/\D/g, ''); // Solo números
    if (!soloNumeros && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = soloNumeros;
    setOtp(newOtp);

    // Saltar al siguiente input si escribió un número
    if (soloNumeros && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Si presiona Borrar y está vacío, regresa al anterior
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

    // SIMULACIÓN: El código correcto será siempre 123456
    if (codigoIngresado !== '123456') {
      setError('Código incorrecto. Para esta prueba usa: 123456');
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
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.message === 'El email ya está registrado' ? 'Ese correo ya tiene una cuenta registrada.' : err.message);
    }
  };

  const estiloDinamico = {
    '--color-primario': theme.colorPrimario,
    '--color-fondo': theme.colorFondo,
    '--color-boton': theme.colorBoton
  };

  return (
    <div className="pi-register-wrapper" style={estiloDinamico}>
      
      <div className="bg-glow glow-top-left"></div>
      <div className="bg-glow glow-bottom-right"></div>

      <div className="pi-register-top-bar">
        {step === 1 ? (
          <button className="pi-register-btn-back" onClick={() => navigate('/login')}>
            <MdArrowBack size={20} /> Volver al Login
          </button>
        ) : (
          <button className="pi-register-btn-back" onClick={() => { setStep(1); setError(''); }}>
            <MdArrowBack size={20} /> Corregir datos
          </button>
        )}
      </div>

      {/* Landmark principal de la pantalla (Manual 11) */}
      <main className="pi-register-content" id="contenido">
        <div className="pi-register-card glass-panel">
          
          {/* ==============================================================
              PASO 1: FORMULARIO DE DATOS
              ============================================================== */}
          {step === 1 && (
            <div className="animate-fade">
              {/* Único h1 del paso 1 (Manual 5.6 / 11) */}
              <h1 className="pi-register-title">Crear cuenta</h1>
              <p className="pi-register-subtitle">Únete a QPass. Rellena los datos a continuación.</p>

              <form onSubmit={handlePedirCodigo} className="pi-register-form">
                
                <div className="pi-register-grid">
                  {/* Todos los campos: <label htmlFor> + <input id> + autocomplete (Manual 8.3) */}
                  <div className="pi-register-input-group full-width">
                    <label htmlFor="reg-nombre">Nombre(s) *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon" aria-hidden="true"><FaUser size={16} /></span>
                      <input id="reg-nombre" type="text" autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Carlos" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label htmlFor="reg-paterno">Apellido paterno *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon" aria-hidden="true"><FaUser size={16} /></span>
                      <input id="reg-paterno" type="text" autoComplete="family-name" value={paterno} onChange={(e) => setPaterno(e.target.value)} placeholder="Pérez" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label htmlFor="reg-materno">Apellido materno *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon" aria-hidden="true"><FaUser size={16} /></span>
                      <input id="reg-materno" type="text" autoComplete="additional-name" value={materno} onChange={(e) => setMaterno(e.target.value)} placeholder="Gómez" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label htmlFor="reg-ci">Documento de identidad (C.I.) *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon" aria-hidden="true"><FaIdCard size={16} /></span>
                      <input id="reg-ci" type="text" inputMode="numeric" value={ci} onChange={(e) => setCi(e.target.value)} placeholder="Ej. 1234567" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label htmlFor="reg-email">Correo electrónico *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon" aria-hidden="true"><MdEmail size={18} /></span>
                      <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label htmlFor="reg-password">Contraseña *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon" aria-hidden="true"><MdLock size={18} /></span>
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres" required
                      />
                      <button
                        type="button"
                        className="pi-register-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <MdVisibilityOff size={18} aria-hidden="true" /> : <MdVisibility size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label htmlFor="reg-password-2">Confirmar contraseña *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon" aria-hidden="true"><MdLock size={18} /></span>
                      <input
                        id="reg-password-2"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita su contraseña" required
                      />
                    </div>
                  </div>

                  <div className="pi-register-divider full-width"><span>Datos Opcionales</span></div>

                  {/* NUEVO DISEÑO CELULAR (Estilo Referencia) */}
                  <div className="pi-register-input-group">
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

                  <div className="pi-register-input-group">
                    <label htmlFor="reg-nacimiento">Fecha de nacimiento</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon" aria-hidden="true"><FaBirthdayCake size={16} /></span>
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
                </div>

                {error && <p className="pi-register-error" role="alert">{error}</p>}
                <button type="submit" className="pi-register-btn-submit">Verificar correo →</button>
              </form>
            </div>
          )}

          {/* ==============================================================
              PASO 2: VERIFICACIÓN OTP
              ============================================================== */}
          {step === 2 && (
            <div className="animate-fade otp-step-container">
              <div className="otp-icon-wrapper">
                <FaEnvelopeOpenText size={45} />
              </div>
              {/* h1 del paso 2 (solo se renderiza un paso a la vez) */}
              <h1 className="pi-register-title">Verifica tu correo</h1>
              <p className="pi-register-subtitle">
                Hemos enviado un código de 6 dígitos a <strong>{email}</strong>. 
                <br/>Por favor ingrésalo abajo para crear tu cuenta.
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

                {error && <p className="pi-register-error" role="alert">{error}</p>}
                {success && <p className="pi-register-success" role="status">{success}</p>}

                <button type="submit" className="pi-register-btn-submit" style={{marginTop: '30px'}}>
                  Confirmar y registrar
                </button>
              </form>
              
              <p className="otp-resend">¿No recibiste el código? <button type="button">Reenviar</button></p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}