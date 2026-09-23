import { useState, useEffect } from 'react';
import { forzarTemaClaro } from '../../utils/tema.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useNavigate } from 'react-router-dom';
import {
  FaUser, FaIdCard, FaBirthdayCake, FaEnvelope, FaEnvelopeOpenText, FaArrowLeft, FaArrowRight, FaCheck,
} from 'react-icons/fa';
import { ROLES } from '../../constants/roles.js';
import api from '../../api/index.js';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import InputCodigo from '../../components/InputCodigo.jsx';
import ErrorCampo from '../../components/ErrorCampo.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import {
  errorCorreo, errorObligatorio, errorContrasenaNueva, errorConfirmacion, errorCelular,
  soloDigitos, limpiarErrores, enfocarPrimero, MIN_CONTRASENA,
} from '../../utils/validacion.js';
import './auth.css';
import './Registrar.css';
import Pasos from '../../components/Pasos.jsx';

const PASOS = [
  { id: 'datos', titulo: 'Tus datos' },
  { id: 'acceso', titulo: 'Acceso' },
  { id: 'verificar', titulo: 'Verificación' },
];
// SIMULACIÓN: sin servicio de correo todavía, el código correcto es siempre este.
const CODIGO_DEMO = '123456';

const validarPaso1 = (d) => limpiarErrores({
  'reg-nombre': errorObligatorio(d.nombre, 'Escribí tu nombre.'),
  'reg-paterno': errorObligatorio(d.paterno, 'Escribí tu apellido paterno.'),
  'reg-materno': errorObligatorio(d.materno, 'Escribí tu apellido materno.'),
  'reg-ci': errorObligatorio(d.ci, 'Escribí tu número de carnet.'),
});

const validarPaso2 = (d) => limpiarErrores({
  'reg-email': errorCorreo(d.email),
  'reg-password': errorContrasenaNueva(d.password),
  'reg-password-2': errorConfirmacion(d.confirmPassword, d.password),
  'reg-celular': errorCelular(d.celular),
});

const ORDEN = {
  1: ['reg-nombre', 'reg-paterno', 'reg-materno', 'reg-ci'],
  2: ['reg-email', 'reg-password', 'reg-password-2', 'reg-celular'],
};

export default function Registrar() {
  // Esta pantalla se ve siempre en claro: el tema oscuro es solo del
  // panel (ver utils/tema.js).
  useEffect(() => { forzarTemaClaro(); }, []);

  useTituloPagina('Crear cuenta');
  const navigate = useNavigate();
  const avisos = useAvisos();

  // 1 = Identidad · 2 = Acceso · 3 = Verificación (código)
  const [step, setStep] = useState(1);

  const [datos, setDatos] = useState({
    nombre: '', paterno: '', materno: '', ci: '',
    email: '', password: '', confirmPassword: '', celular: '', fechaNacimiento: '',
  });
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const [codigo, setCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState('');
  // Paso en el que ya se intentó avanzar: desde ahí se muestran sus errores.
  const [intentos, setIntentos] = useState({});
  // Error del servidor al crear la cuenta.
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const errores = step === 1 && intentos[1] ? validarPaso1(datos)
    : step === 2 && intentos[2] ? validarPaso2(datos) : {};

  const fechaHoyStr = new Date().toISOString().split('T')[0];

  const volver = () => {
    setError('');
    if (step === 1) navigate('/login');
    else setStep(step - 1);
  };

  const avanzar = (paso, validar) => (e) => {
    e.preventDefault();
    setIntentos((i) => ({ ...i, [paso]: true }));
    const errs = validar(datos);
    if (Object.keys(errs).length) return enfocarPrimero(errs, ORDEN[paso]);
    setStep(paso + 1);
  };

  const reenviar = () => {
    setCodigo('');
    setErrorCodigo('');
    avisos.info(`Te reenviamos el código a ${datos.email}.`);
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (codigo.length < 6) return setErrorCodigo('Escribí los 6 dígitos del código.');
    if (codigo !== CODIGO_DEMO) return setErrorCodigo(`Código incorrecto. Para esta prueba usá: ${CODIGO_DEMO}`);
    setErrorCodigo('');

    setEnviando(true);
    try {
      await api.auth.registro({
        rol: ROLES.USUARIO_NORMAL,
        nombre: datos.nombre.trim(),
        apellidoPaterno: datos.paterno.trim(),
        apellidoMaterno: datos.materno.trim(),
        email: datos.email.trim(),
        ci: datos.ci.trim(),
        password: datos.password,
        fechaNacimiento: datos.fechaNacimiento || undefined,
        celular: datos.celular || undefined,
      });
      avisos.exito('Ya podés iniciar sesión con tu correo y contraseña.', { titulo: '¡Cuenta creada!' });
      navigate('/login');
    } catch (err) {
      setError(err.message === 'El email ya está registrado' ? 'Ese correo ya tiene una cuenta registrada.' : err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pi-auth">
      <Boton variante="translucido" tamano="sm" pildora icono={FaArrowLeft} className="pi-auth__volver" onClick={volver}>
        {step === 1 ? 'Volver al login' : 'Atrás'}
      </Boton>

      <div className="pi-auth__card">
        <div className="pi-auth__panel">
        <main className="pi-auth__body" id="contenido">

          <Pasos variante="riel" etiqueta="Pasos para crear tu cuenta" actual={step - 1} pasos={PASOS} className="pi-auth__pasos" />

          {/* ===== PASO 1: IDENTIDAD ===== */}
          {step === 1 && (
            <div className="animate-fade">
              <h1 className="pi-auth__title">Crear cuenta</h1>
              <p className="pi-auth__subtitle">Empecemos por tus datos personales.</p>

              <form onSubmit={avanzar(1, validarPaso1)} className="pi-auth__form" noValidate>
                <Campo id="reg-nombre" etiqueta="Nombre(s)" icono={FaUser} autoComplete="given-name"
                  placeholder="Ej. Juan Carlos" value={datos.nombre} onChange={cambiar('nombre')} error={errores['reg-nombre']} />

                <div className="pi-register-grid">
                  <Campo id="reg-paterno" etiqueta="Apellido paterno" icono={FaUser} autoComplete="family-name"
                    placeholder="Pérez" value={datos.paterno} onChange={cambiar('paterno')} error={errores['reg-paterno']} />
                  <Campo id="reg-materno" etiqueta="Apellido materno" icono={FaUser} autoComplete="additional-name"
                    placeholder="Gómez" value={datos.materno} onChange={cambiar('materno')} error={errores['reg-materno']} />
                </div>

                <Campo id="reg-ci" etiqueta="Documento de identidad (C.I.)" icono={FaIdCard} inputMode="numeric"
                  placeholder="Ej. 1234567" value={datos.ci} onChange={cambiar('ci')} error={errores['reg-ci']} />

                <Boton type="submit" tamano="lg" pildora anchoCompleto iconoDerecha={FaArrowRight}>Continuar</Boton>
              </form>
            </div>
          )}

          {/* ===== PASO 2: ACCESO ===== */}
          {step === 2 && (
            <div className="animate-fade">
              <h1 className="pi-auth__title">Datos de acceso</h1>
              <p className="pi-auth__subtitle">Con esto vas a entrar a QPass.</p>

              <form onSubmit={avanzar(2, validarPaso2)} className="pi-auth__form" noValidate>
                <Campo id="reg-email" etiqueta="Correo electrónico" icono={FaEnvelope} type="email" autoComplete="email"
                  placeholder="correo@ejemplo.com" value={datos.email} onChange={cambiar('email')} error={errores['reg-email']} />
                <Campo id="reg-password" etiqueta="Contraseña" contrasena autoComplete="new-password"
                  placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`} value={datos.password} onChange={cambiar('password')}
                  error={errores['reg-password']} />
                <Campo id="reg-password-2" etiqueta="Confirmar contraseña" contrasena autoComplete="new-password"
                  placeholder="Repetí tu contraseña" value={datos.confirmPassword} onChange={cambiar('confirmPassword')}
                  error={errores['reg-password-2']} />

                <div className="pi-auth__separador"><span>Opcional</span></div>

                <Campo id="reg-celular" etiqueta="Teléfono celular" prefijo="🇧🇴 +591" type="tel" inputMode="numeric"
                  autoComplete="tel-national" placeholder="12345678" value={datos.celular}
                  onChange={(e) => setDatos((d) => ({ ...d, celular: soloDigitos(e.target.value) }))}
                  error={errores['reg-celular']} />
                <Campo id="reg-nacimiento" etiqueta="Fecha de nacimiento" icono={FaBirthdayCake} type="date" autoComplete="bday"
                  max={fechaHoyStr} value={datos.fechaNacimiento} onChange={cambiar('fechaNacimiento')} />

                <Boton type="submit" tamano="lg" pildora anchoCompleto iconoDerecha={FaArrowRight}>Verificar correo</Boton>
              </form>
            </div>
          )}

          {/* ===== PASO 3: VERIFICACIÓN ===== */}
          {step === 3 && (
            <div className="animate-fade pi-auth__step">
              <div className="pi-auth__step-icon"><FaEnvelopeOpenText size={34} aria-hidden="true" /></div>
              <h1 className="pi-auth__title">Verificá tu correo</h1>
              <p className="pi-auth__subtitle">
                Enviamos un código de 6 dígitos a <strong>{datos.email}</strong>.
                <br />Ingresálo para crear tu cuenta.
              </p>

              <form onSubmit={handleVerifyAndRegister} className="pi-auth__form pi-auth__form--codigo" noValidate>
                <InputCodigo
                  valor={codigo}
                  onCambio={(v) => { setCodigo(v); setErrorCodigo(''); }}
                  etiqueta="Código de verificación de 6 dígitos"
                  error={!!errorCodigo}
                  idError="reg-codigo-error"
                />
                <ErrorCampo id="reg-codigo-error" mensaje={errorCodigo} />
                {error && <AvisoFijo tono="error">{error}</AvisoFijo>}

                <Boton type="submit" tamano="lg" pildora anchoCompleto icono={FaCheck} cargando={enviando}>
                  Confirmar y registrar
                </Boton>
              </form>

              <p className="pi-auth__reenviar">
                ¿No recibiste el código?
                <Boton variante="fantasma" tamano="sm" onClick={reenviar}>Reenviar</Boton>
              </p>
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
