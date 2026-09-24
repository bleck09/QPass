import { useRef, useState, useEffect } from 'react';
import { forzarTemaClaro } from '../../utils/tema.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useNavigate } from 'react-router-dom';
import { FaIdCard, FaBirthdayCake, FaMapMarkerAlt, FaCamera, FaLock, FaUserCheck, FaArrowRight, FaCheck, FaGlobeAmericas, FaVenusMars } from 'react-icons/fa';
import { ROLE_HOME_PATH } from '../../constants/roles.js';
import { PAISES } from '../../constants/paises.js';
import { OPCIONES_SEXO, OPCIONES_TIPO_DOCUMENTO } from '../../constants/perfil.js';
import { leerSesion, guardarSesion } from '../../api/client.js';
import { EVENTO_USUARIO_ACTUALIZADO } from '../../layout/MenuLateral.jsx';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import api from '../../api/index.js';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import { AvisoFijo } from '../../components/Avisos.jsx';
import {
  errorObligatorio, errorContrasenaNueva, errorConfirmacion, errorCelular,
  errorFechaNacimiento, soloDigitos, limpiarErrores, enfocarPrimero, MIN_CONTRASENA,
} from '../../utils/validacion.js';
import './auth.css';
import './Registrar.css';
import Pasos from '../../components/Pasos.jsx';

const PASOS = [
  { id: 'seguridad', titulo: 'Contraseña' },
  { id: 'datos', titulo: 'Tus datos' },
];

/* ============================================================================
 * Paso obligatorio para las cuentas que se auto-crean al aprobar una compra
 * (ver ComprasService.aprobar): llegan con una contraseña temporal por correo.
 * Acá SÍ o SÍ cambian esa contraseña y cargan su CI (se pide en la puerta para
 * verificar identidad) — el resto de los datos es opcional. MenuLateral.jsx
 * redirige acá mientras sesion.debeCompletarPerfil sea true; esta pantalla no
 * tiene menú lateral para que no se pueda navegar a otro lado sin terminar.
 *
 * Dos pasos (como Registrar): 1) seguridad, 2) datos. Reusa el shell de las
 * pantallas de acceso (auth.css) y los globales: Campo (.input-group), Boton,
 * AvisoFijo; reglas de validación en utils/validacion.js.
 * ========================================================================= */
export default function CompletarPerfil() {
  // Esta pantalla se ve siempre en claro: el tema oscuro es solo del
  // panel (ver utils/tema.js).
  useEffect(() => { forzarTemaClaro(); }, []);

  useTituloPagina('Completa tu cuenta');
  const navigate = useNavigate();
  const sesion = leerSesion();

  // 1 = Seguridad (cambiar contraseña temporal) · 2 = Tus datos (CI + opcionales)
  const [step, setStep] = useState(1);

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [tipoDocumento, setTipoDocumento] = useState('ci');
  const [ci, setCi] = useState('');
  const [celular, setCelular] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('');
  const [pais, setPais] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [foto, setFoto] = useState('');

  // Error del servidor; los de cada campo van junto al campo (PLAN §2.5).
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Paso en el que ya se intentó avanzar: desde ahí se muestran sus errores.
  const [intentos, setIntentos] = useState({});
  const inputFoto = useRef(null);

  // Nada que completar: no debería haber llegado acá (MenuLateral ya lo manda
  // a login si no hay sesión). Defensivo, no navegación normal.
  if (!sesion) return null;

  const validarPaso1 = () => limpiarErrores({
    'cp-password-actual': errorObligatorio(passwordActual, 'Escribí la contraseña con la que iniciaste sesión.'),
    'cp-password-nueva': errorContrasenaNueva(passwordNueva),
    'cp-password-confirmar': errorConfirmacion(confirmarPassword, passwordNueva),
  });
  const validarPaso2 = () => limpiarErrores({
    'cp-ci': errorObligatorio(ci, 'El número de carnet es obligatorio.'),
    'cp-celular': errorCelular(celular),
    'cp-nacimiento': errorFechaNacimiento(fechaNacimiento),
  });
  const errores = step === 1 && intentos[1] ? validarPaso1() : step === 2 && intentos[2] ? validarPaso2() : {};

  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      setFoto(await subirImagenDeInput(file, 'perfiles'));
    } catch (err) {
      setError(err.message);
    }
  };

  // PASO 1 -> 2: cambia la contraseña temporal ya mismo (no se difiere al
  // final: si falla acá, todavía no se tocó nada del perfil).
  const handlePaso1 = async (e) => {
    e.preventDefault();
    setError('');
    setIntentos((i) => ({ ...i, 1: true }));
    const errs = validarPaso1();
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['cp-password-actual', 'cp-password-nueva', 'cp-password-confirmar']);

    setEnviando(true);
    try {
      await api.usuarios.cambiarPassword(sesion.id, passwordActual, passwordNueva);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // PASO 2: datos del perfil (CI obligatorio, el resto opcional) y sale del gate.
  const handlePaso2 = async (e) => {
    e.preventDefault();
    setError('');
    setIntentos((i) => ({ ...i, 2: true }));
    const errs = validarPaso2();
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['cp-ci', 'cp-celular', 'cp-nacimiento']);

    setEnviando(true);
    try {
      const actualizado = await api.usuarios.actualizar(sesion.id, {
        tipoDocumento,
        ci: ci.trim(),
        celular: celular || undefined,
        fechaNacimiento: fechaNacimiento || undefined,
        sexo: sexo || undefined,
        pais: pais || undefined,
        ciudad: ciudad || undefined,
        foto: foto || undefined,
      });

      guardarSesion({ ...sesion, ...actualizado });
      window.dispatchEvent(new Event(EVENTO_USUARIO_ACTUALIZADO));
      navigate(ROLE_HOME_PATH[sesion.rol] || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pi-auth">
      <div className="pi-auth__card">
        <div className="pi-auth__panel">
          <main className="pi-auth__body" id="contenido">

            <Pasos variante="riel" etiqueta="Pasos para completar tu cuenta" actual={step - 1} pasos={PASOS} className="pi-auth__pasos" />

            {/* ===== PASO 1: SEGURIDAD ===== */}
            {step === 1 && (
              <div className="animate-fade">
                <div className="pi-auth__step-icon"><FaLock size={26} aria-hidden="true" /></div>
                <h1 className="pi-auth__title">Cambia tu contraseña</h1>
                <p className="pi-auth__subtitle">
                  Te llegó una contraseña temporal por correo. Antes de continuar, cambiala por una que solo sepas vos.
                </p>

                <form onSubmit={handlePaso1} className="pi-auth__form" noValidate>
                  <Campo
                    id="cp-password-actual" etiqueta="Contraseña actual (la temporal)" contrasena maxLength={72}
                    autoComplete="current-password" placeholder="La que te llegó por correo"
                    value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)}
                    error={errores['cp-password-actual']}
                  />

                  <div className="pi-register-grid">
                    <Campo
                      id="cp-password-nueva" etiqueta="Contraseña nueva" contrasena maxLength={72} autoComplete="new-password"
                      placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`}
                      value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)}
                      error={errores['cp-password-nueva']}
                    />
                    <Campo
                      id="cp-password-confirmar" etiqueta="Confirmar contraseña nueva" contrasena maxLength={72} autoComplete="new-password"
                      placeholder="Repetila"
                      value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)}
                      error={errores['cp-password-confirmar']}
                    />
                  </div>

                  {error && <AvisoFijo tono="error">{error}</AvisoFijo>}

                  <Boton type="submit" tamano="lg" pildora anchoCompleto iconoDerecha={FaArrowRight} cargando={enviando}>
                    {enviando ? 'Guardando…' : 'Continuar'}
                  </Boton>
                </form>
              </div>
            )}

            {/* ===== PASO 2: TUS DATOS ===== */}
            {step === 2 && (
              <div className="animate-fade">
                <div className="pi-auth__step-icon"><FaUserCheck size={26} aria-hidden="true" /></div>
                <h1 className="pi-auth__title">Completa tus datos</h1>
                <p className="pi-auth__subtitle">
                  Cargá tu número de carnet — te lo van a pedir en la puerta para verificar tu identidad.
                  El resto es opcional.
                </p>

                <form onSubmit={handlePaso2} className="pi-auth__form" noValidate>
                  <div className="pi-register-grid">
                    <Campo id="cp-tipo-doc" etiqueta="Tipo de documento">
                      <select id="cp-tipo-doc" value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                        {OPCIONES_TIPO_DOCUMENTO.map((o) => (
                          <option key={o.valor} value={o.valor}>{o.texto}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo
                      id="cp-ci" etiqueta="Número de documento" icono={FaIdCard}
                      placeholder="Ej. 1234567" value={ci} onChange={(e) => setCi(e.target.value)}
                      error={errores['cp-ci']}
                    />
                  </div>

                  <div className="pi-auth__separador"><span>Opcional</span></div>

                  <div className="pi-register-grid">
                    <Campo
                      id="cp-celular" etiqueta="Celular" prefijo="🇧🇴 +591" type="tel" inputMode="numeric"
                      autoComplete="tel-national" placeholder="12345678"
                      value={celular} onChange={(e) => setCelular(soloDigitos(e.target.value))}
                      error={errores['cp-celular']}
                    />
                    <Campo
                      id="cp-nacimiento" etiqueta="Fecha de nacimiento" icono={FaBirthdayCake} type="date" autoComplete="bday"
                      max={new Date().toISOString().split('T')[0]}
                      value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)}
                      error={errores['cp-nacimiento']}
                    />
                  </div>

                  <div className="pi-register-grid">
                    <Campo id="cp-sexo" etiqueta={<><FaVenusMars aria-hidden="true" /> Sexo</>}>
                      <select id="cp-sexo" value={sexo} onChange={(e) => setSexo(e.target.value)}>
                        <option value="">Prefiero no decir</option>
                        {OPCIONES_SEXO.map((o) => (
                          <option key={o.valor} value={o.valor}>{o.texto}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo id="cp-pais" etiqueta={<><FaGlobeAmericas aria-hidden="true" /> País</>}>
                      <select id="cp-pais" value={pais} onChange={(e) => setPais(e.target.value)}>
                        <option value="">Sin especificar</option>
                        {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Campo>
                  </div>

                  <Campo
                    id="cp-ciudad" etiqueta="Ciudad" icono={FaMapMarkerAlt} placeholder="Ej. Cochabamba"
                    value={ciudad} onChange={(e) => setCiudad(e.target.value)}
                  />

                  <div className="input-group">
                    <span className="input-group__etiqueta" id="cp-foto-etiqueta">Foto de perfil</span>
                    <div className="preview-zone">
                      {foto && <img src={foto} alt="Vista previa de tu foto" className="img-preview" />}
                      <Boton
                        variante="secundario" tamano="sm" pildora icono={FaCamera}
                        onClick={() => inputFoto.current?.click()} aria-describedby="cp-foto-etiqueta"
                      >
                        {foto ? 'Cambiar foto' : 'Subir foto'}
                      </Boton>
                      <input ref={inputFoto} type="file" accept="image/*" onChange={handleFotoUpload} hidden />
                    </div>
                  </div>

                  {error && <AvisoFijo tono="error">{error}</AvisoFijo>}

                  <Boton type="submit" tamano="lg" pildora anchoCompleto icono={FaCheck} cargando={enviando}>
                    {enviando ? 'Guardando…' : 'Guardar y continuar'}
                  </Boton>
                </form>
              </div>
            )}
          </main>
        </div>

        <aside className="pi-auth__aside" aria-hidden="true">
          <div className="pi-auth__tagline">
            <p className="pi-auth__eyebrow">QPass</p>
            <h2>Ya casi estás listo para entrar</h2>
          </div>
        </aside>
      </div>
    </div>
  );
}
