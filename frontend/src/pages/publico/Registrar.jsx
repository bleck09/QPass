import { useState, useRef } from 'react';
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

      <div className="pi-register-content">
        <div className="pi-register-card glass-panel">
          
          {/* ==============================================================
              PASO 1: FORMULARIO DE DATOS
              ============================================================== */}
          {step === 1 && (
            <div className="animate-fade">
              <h2 className="pi-register-title">Crear Cuenta</h2>
              <p className="pi-register-subtitle">Únete a QPass. Rellena los datos a continuación.</p>

              <form onSubmit={handlePedirCodigo} className="pi-register-form">
                
                <div className="pi-register-grid">
                  <div className="pi-register-input-group full-width">
                    <label>NOMBRE(S) *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon"><FaUser size={16} /></span>
                      <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Carlos" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label>APELLIDO PATERNO *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon"><FaUser size={16} /></span>
                      <input type="text" value={paterno} onChange={(e) => setPaterno(e.target.value)} placeholder="Pérez" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label>APELLIDO MATERNO *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon"><FaUser size={16} /></span>
                      <input type="text" value={materno} onChange={(e) => setMaterno(e.target.value)} placeholder="Gómez" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label>DOCUMENTO DE IDENTIDAD (C.I.) *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon"><FaIdCard size={16} /></span>
                      <input type="text" value={ci} onChange={(e) => setCi(e.target.value)} placeholder="Ej. 1234567" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label>CORREO ELECTRÓNICO *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon"><MdEmail size={18} /></span>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label>CONTRASEÑA *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon"><MdLock size={18} /></span>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password} onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Mínimo 6 caracteres" required 
                      />
                      <button type="button" className="pi-register-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label>CONFIRMAR CONTRASEÑA *</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon"><MdLock size={18} /></span>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="Repita su contraseña" required 
                      />
                    </div>
                  </div>

                  <div className="pi-register-divider full-width"><span>Datos Opcionales</span></div>

                  {/* NUEVO DISEÑO CELULAR (Estilo Referencia) */}
                  <div className="pi-register-input-group">
                    <label>TELÉFONO CELULAR</label>
                    <div className="pi-register-phone-wrapper">
                      <div className="phone-country-dropdown">
                        <span className="flag">🇧🇴</span>
                        <FaChevronDown size={10} className="chevron" />
                        <span className="code">+591</span>
                      </div>
                      <input 
                        type="text" 
                        value={celular} 
                        onChange={handleCelularChange} 
                        placeholder="12345678" 
                      />
                    </div>
                  </div>

                  <div className="pi-register-input-group">
                    <label>FECHA DE NACIMIENTO</label>
                    <div className="pi-register-input-wrapper">
                      <span className="pi-register-icon"><FaBirthdayCake size={16} /></span>
                      <input 
                        type="date" 
                        value={fechaNacimiento} 
                        onChange={(e) => setFechaNacimiento(e.target.value)} 
                        max={fechaHoyStr}
                      />
                    </div>
                  </div>
                </div>

                {error && <p className="pi-register-error">{error}</p>}
                <button type="submit" className="pi-register-btn-submit">VERIFICAR CORREO →</button>
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
              <h2 className="pi-register-title">Verifica tu correo</h2>
              <p className="pi-register-subtitle">
                Hemos enviado un código de 6 dígitos a <strong>{email}</strong>. 
                <br/>Por favor ingrésalo abajo para crear tu cuenta.
              </p>

              <form onSubmit={handleVerifyAndRegister} className="otp-form">
                <div className="otp-inputs-container">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      maxLength="1"
                      className="otp-digit-input"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {error && <p className="pi-register-error">{error}</p>}
                {success && <p className="pi-register-success">{success}</p>}

                <button type="submit" className="pi-register-btn-submit" style={{marginTop: '30px'}}>
                  CONFIRMAR Y REGISTRAR
                </button>
              </form>
              
              <p className="otp-resend">¿No recibiste el código? <button type="button">Reenviar</button></p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}