import { useState, useEffect } from 'react';
import { forzarTemaClaro } from '../../utils/tema.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaEnvelopeOpenText, FaKey, FaEnvelope, FaArrowLeft, FaPaperPlane, FaCheck } from 'react-icons/fa';
import api from '../../api/index.js';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import InputCodigo from '../../components/InputCodigo.jsx';
import ErrorCampo from '../../components/ErrorCampo.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import {
  errorCorreo, errorContrasenaNueva, errorConfirmacion, limpiarErrores, enfocarPrimero, MIN_CONTRASENA,
} from '../../utils/validacion.js';
import './auth.css';

export default function RecuperarContra() {
  // Esta pantalla se ve siempre en claro: el tema oscuro es solo del
  // panel (ver utils/tema.js).
  useEffect(() => { forzarTemaClaro(); }, []);

  useTituloPagina('Recuperar contraseña');
  const navigate = useNavigate();
  const avisos = useAvisos();

  // --- PASOS DEL FLUJO ---  1: Correo | 2: Código | 3: Nueva contraseña
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // No hay servicio de correo: el backend devuelve el código en la respuesta para
  // poder probar el flujo. En producción llegaría solo por correo.
  const [codigoDemo, setCodigoDemo] = useState('');

  // Error de cada campo (después del primer intento) y del servidor.
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Envuelve cada llamada: spinner en el botón y error del servidor en línea.
  const conEnvio = async (fn) => {
    setError('');
    setEnviando(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // PASO 1: pedir el código
  const handlePedirCodigo = (e) => {
    e.preventDefault();
    const errs = limpiarErrores({ 'rec-email': errorCorreo(email) });
    setErrores(errs);
    if (errs['rec-email']) return enfocarPrimero(errs, ['rec-email']);
    conEnvio(async () => {
      const { codigoDemo: c } = await api.auth.recuperarSolicitar(email.trim());
      setCodigoDemo(c);
      setCodigo('');
      setStep(2);
    });
  };

  // PASO 2: verificar el código
  const handleVerificarCodigo = (e) => {
    e.preventDefault();
    if (codigo.length < 6) return setErrores({ codigo: 'Escribí los 6 dígitos del código.' });
    setErrores({});
    conEnvio(async () => {
      await api.auth.recuperarVerificar(email.trim(), codigo);
      setStep(3);
    });
  };

  const handleReenviarCodigo = () => conEnvio(async () => {
    const { codigoDemo: c } = await api.auth.recuperarSolicitar(email.trim());
    setCodigoDemo(c);
    setCodigo('');
    setErrores({});
    avisos.info('Te generamos un código nuevo.');
  });

  // PASO 3: nueva contraseña
  const validarPaso3 = (p, c) => limpiarErrores({
    'rec-password': errorContrasenaNueva(p),
    'rec-password-2': errorConfirmacion(c, p),
  });

  const handleRestablecerContra = (e) => {
    e.preventDefault();
    const errs = validarPaso3(password, confirmPassword);
    setErrores({ ...errs, intento3: true });
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['rec-password', 'rec-password-2']);
    conEnvio(async () => {
      await api.auth.recuperarRestablecer(email.trim(), codigo, password);
      avisos.exito('Ya podés iniciar sesión con tu nueva contraseña.', { titulo: 'Contraseña actualizada' });
      navigate('/login');
    });
  };

  // En el paso 3 los errores se recalculan al escribir, una vez intentado.
  const erroresPaso3 = errores.intento3 ? validarPaso3(password, confirmPassword) : {};

  const irA = (paso) => { setStep(paso); setError(''); setErrores({}); };

  return (
    <div className="pi-auth">
      <Boton
        variante="translucido" tamano="sm" pildora icono={FaArrowLeft} className="pi-auth__volver"
        onClick={() => (step === 2 ? irA(1) : navigate('/login'))}
      >
        {step === 2 ? 'Cambiar correo' : 'Volver al login'}
      </Boton>

      <div className="pi-auth__card">
        <div className="pi-auth__panel">
        <main className="pi-auth__body" id="contenido">

          {/* ===== PASO 1: CORREO ===== */}
          {step === 1 && (
            <div className="animate-fade pi-auth__step">
              <div className="pi-auth__step-icon"><FaShieldAlt size={34} aria-hidden="true" /></div>
              <h1 className="pi-auth__title">Recuperar contraseña</h1>
              <p className="pi-auth__subtitle">
                Ingresá el correo asociado a tu cuenta. Te enviaremos un código de seguridad para verificar tu identidad.
              </p>

              <form onSubmit={handlePedirCodigo} className="pi-auth__form" noValidate>
                <Campo
                  id="rec-email" etiqueta="Correo electrónico" icono={FaEnvelope} type="email" autoComplete="email"
                  placeholder="usuario@qpass.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errores['rec-email']) setErrores({ 'rec-email': errorCorreo(e.target.value) }); }}
                  error={errores['rec-email']}
                />
                {error && <AvisoFijo tono="error">{error}</AvisoFijo>}
                <Boton type="submit" tamano="lg" pildora anchoCompleto icono={FaPaperPlane} cargando={enviando}>
                  Enviar código
                </Boton>
              </form>
            </div>
          )}

          {/* ===== PASO 2: CÓDIGO ===== */}
          {step === 2 && (
            <div className="animate-fade pi-auth__step">
              <div className="pi-auth__step-icon"><FaEnvelopeOpenText size={34} aria-hidden="true" /></div>
              <h1 className="pi-auth__title">Código de seguridad</h1>
              <p className="pi-auth__subtitle">
                Generamos un código de 6 dígitos para <strong>{email}</strong>. Ingresálo abajo para continuar.
              </p>
              {codigoDemo && (
                <AvisoFijo tono="info" titulo="Modo desarrollo (sin correo real)">
                  Tu código es <strong>{codigoDemo}</strong>
                </AvisoFijo>
              )}

              <form onSubmit={handleVerificarCodigo} className="pi-auth__form pi-auth__form--codigo" noValidate>
                <InputCodigo
                  valor={codigo}
                  onCambio={(v) => { setCodigo(v); setErrores({}); }}
                  etiqueta="Código de seguridad de 6 dígitos"
                  error={!!errores.codigo}
                  idError="rec-codigo-error"
                />
                <ErrorCampo id="rec-codigo-error" mensaje={errores.codigo} />
                {error && <AvisoFijo tono="error">{error}</AvisoFijo>}
                <Boton type="submit" tamano="lg" pildora anchoCompleto icono={FaCheck} cargando={enviando}>
                  Verificar código
                </Boton>
              </form>

              <p className="pi-auth__reenviar">
                ¿No lo recibiste?
                <Boton variante="fantasma" tamano="sm" onClick={handleReenviarCodigo} disabled={enviando}>Reenviar código</Boton>
              </p>
            </div>
          )}

          {/* ===== PASO 3: NUEVA CONTRASEÑA ===== */}
          {step === 3 && (
            <div className="animate-fade pi-auth__step">
              <div className="pi-auth__step-icon"><FaKey size={34} aria-hidden="true" /></div>
              <h1 className="pi-auth__title">Crear nueva contraseña</h1>
              <p className="pi-auth__subtitle">Identidad verificada. Escribí una contraseña segura que no hayas usado antes.</p>

              <form onSubmit={handleRestablecerContra} className="pi-auth__form" noValidate>
                <Campo
                  id="rec-password" etiqueta="Nueva contraseña" contrasena maxLength={72} autoComplete="new-password"
                  placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`} value={password}
                  onChange={(e) => setPassword(e.target.value)} error={erroresPaso3['rec-password']}
                />
                <Campo
                  id="rec-password-2" etiqueta="Confirmar contraseña" contrasena maxLength={72} autoComplete="new-password"
                  placeholder="Repetí la contraseña" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} error={erroresPaso3['rec-password-2']}
                />
                {error && <AvisoFijo tono="error">{error}</AvisoFijo>}
                <Boton type="submit" tamano="lg" pildora anchoCompleto icono={FaKey} cargando={enviando}>
                  Restablecer contraseña
                </Boton>
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
