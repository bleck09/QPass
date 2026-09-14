import { useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useNavigate } from 'react-router-dom';
import { MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { FaIdCard, FaBirthdayCake, FaMapMarkerAlt, FaCamera, FaLock, FaUserCheck } from 'react-icons/fa';
import { ROLE_HOME_PATH } from '../../constants/roles.js';
import { leerSesion, guardarSesion } from '../../api/client.js';
import { EVENTO_USUARIO_ACTUALIZADO } from '../../layout/MenuLateral.jsx';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import api from '../../api/index.js';
import './auth.css';
import './Registrar.css';

const TOTAL_PASOS = 2;

/* ============================================================================
 * Paso obligatorio para las cuentas que se auto-crean al aprobar una compra
 * (ver ComprasService.aprobar): llegan con una contraseña temporal por correo.
 * Acá SÍ o SÍ cambian esa contraseña y cargan su CI (se pide en la puerta para
 * verificar identidad) — el resto de los datos es opcional. MenuLateral.jsx
 * redirige acá mientras sesion.debeCompletarPerfil sea true; esta pantalla no
 * tiene menú lateral para que no se pueda navegar a otro lado sin terminar.
 *
 * Dos pasos (como Registrar): 1) seguridad, 2) datos. Reusa el mismo shell de
 * las pantallas de acceso: pi-auth__* vive en auth.css, pi-register-grid/
 * divider/phone-wrapper en Registrar.css.
 * ========================================================================= */
export default function CompletarPerfil() {
  useTituloPagina('Completa tu cuenta');
  const navigate = useNavigate();
  const sesion = leerSesion();

  // 1 = Seguridad (cambiar contraseña temporal) · 2 = Tus datos (CI + opcionales)
  const [step, setStep] = useState(1);

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [ci, setCi] = useState('');
  const [celular, setCelular] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [foto, setFoto] = useState('');

  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Nada que completar: no debería haber llegado acá (MenuLateral ya lo manda
  // a login si no hay sesión). Defensivo, no navegación normal.
  if (!sesion) return null;

  const handleCelularChange = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '');
    if (soloNumeros.length <= 8) setCelular(soloNumeros);
  };

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
    if (!passwordActual) return setError('Ingresa la contraseña con la que iniciaste sesión.');
    if (passwordNueva.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
    if (passwordNueva !== confirmarPassword) return setError('Las contraseñas nuevas no coinciden.');

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
    if (!ci.trim()) return setError('El número de carnet es obligatorio.');

    setEnviando(true);
    try {
      const actualizado = await api.usuarios.actualizar(sesion.id, {
        ci: ci.trim(),
        celular: celular || undefined,
        fechaNacimiento: fechaNacimiento || undefined,
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

            {/* Progreso */}
            <div className="pi-auth__progress" aria-hidden="true">
              {Array.from({ length: TOTAL_PASOS }, (_, i) => (
                <span key={i} className={i + 1 <= step ? 'is-on' : ''} />
              ))}
              <span className="pi-auth__progress-label">Paso {step} de {TOTAL_PASOS}</span>
            </div>

            {/* ===== PASO 1: SEGURIDAD ===== */}
            {step === 1 && (
              <div className="animate-fade">
                <div className="pi-auth__step-icon"><FaLock size={26} aria-hidden="true" /></div>
                <h1 className="pi-auth__title">Cambia tu contraseña</h1>
                <p className="pi-auth__subtitle">
                  Te llegó una contraseña temporal por correo. Antes de continuar, cambiala por una que solo sepas vos.
                </p>

                <form onSubmit={handlePaso1} className="pi-auth__form">
                  <div className="pi-auth__field">
                    <label htmlFor="cp-password-actual">Contraseña actual (la temporal)</label>
                    <div className="pi-auth__control">
                      <span className="pi-auth__icon" aria-hidden="true"><MdLock size={18} /></span>
                      <input
                        id="cp-password-actual"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={passwordActual}
                        onChange={(e) => setPasswordActual(e.target.value)}
                        placeholder="La que te llegó por correo"
                        required
                      />
                    </div>
                  </div>

                  <div className="pi-register-grid">
                    <div className="pi-auth__field">
                      <label htmlFor="cp-password-nueva">Contraseña nueva</label>
                      <div className="pi-auth__control">
                        <span className="pi-auth__icon" aria-hidden="true"><MdLock size={18} /></span>
                        <input
                          id="cp-password-nueva"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={passwordNueva}
                          onChange={(e) => setPasswordNueva(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          required
                        />
                        <button
                          type="button"
                          className="pi-auth__ghost-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                          aria-pressed={showPassword}
                        >
                          {showPassword ? <MdVisibilityOff size={18} aria-hidden="true" /> : <MdVisibility size={18} aria-hidden="true" />}
                        </button>
                      </div>
                    </div>

                    <div className="pi-auth__field">
                      <label htmlFor="cp-password-confirmar">Confirmar contraseña nueva</label>
                      <div className="pi-auth__control">
                        <span className="pi-auth__icon" aria-hidden="true"><MdLock size={18} /></span>
                        <input
                          id="cp-password-confirmar"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirmarPassword}
                          onChange={(e) => setConfirmarPassword(e.target.value)}
                          placeholder="Repetila"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {error && <p className="pi-auth__error" role="alert">{error}</p>}

                  <button type="submit" className="pi-auth__submit" disabled={enviando}>
                    {enviando ? 'Guardando…' : 'Continuar →'}
                  </button>
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

                <form onSubmit={handlePaso2} className="pi-auth__form">
                  <div className="pi-auth__field">
                    <label htmlFor="cp-ci">Número de carnet (C.I.)</label>
                    <div className="pi-auth__control">
                      <span className="pi-auth__icon" aria-hidden="true"><FaIdCard size={16} /></span>
                      <input
                        id="cp-ci"
                        type="text"
                        inputMode="numeric"
                        value={ci}
                        onChange={(e) => setCi(e.target.value)}
                        placeholder="Ej. 1234567"
                        required
                      />
                    </div>
                  </div>

                  <div className="pi-register-divider"><span>Opcional</span></div>

                  <div className="pi-register-grid">
                    <div className="pi-auth__field">
                      <label htmlFor="cp-celular">Celular</label>
                      <div className="pi-register-phone-wrapper">
                        <div className="phone-country-dropdown" aria-hidden="true">
                          <span className="flag">🇧🇴</span>
                          <span className="code">+591</span>
                        </div>
                        <input
                          id="cp-celular"
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
                      <label htmlFor="cp-nacimiento">Fecha de nacimiento</label>
                      <div className="pi-auth__control">
                        <span className="pi-auth__icon" aria-hidden="true"><FaBirthdayCake size={16} /></span>
                        <input
                          id="cp-nacimiento"
                          type="date"
                          autoComplete="bday"
                          value={fechaNacimiento}
                          onChange={(e) => setFechaNacimiento(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pi-auth__field">
                    <label htmlFor="cp-ciudad">Ciudad</label>
                    <div className="pi-auth__control">
                      <span className="pi-auth__icon" aria-hidden="true"><FaMapMarkerAlt size={16} /></span>
                      <input
                        id="cp-ciudad"
                        type="text"
                        value={ciudad}
                        onChange={(e) => setCiudad(e.target.value)}
                        placeholder="Ej. Cochabamba"
                      />
                    </div>
                  </div>

                  <div className="pi-auth__field">
                    <label htmlFor="cp-foto">Foto de perfil</label>
                    <div className="preview-zone">
                      {foto && <img src={foto} alt="Vista previa" className="img-preview" />}
                      <label htmlFor="cp-foto" className="pi-auth__link" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <FaCamera aria-hidden="true" /> {foto ? 'Cambiar foto' : 'Subir foto'}
                      </label>
                      <input id="cp-foto" type="file" accept="image/*" onChange={handleFotoUpload} hidden />
                    </div>
                  </div>

                  {error && <p className="pi-auth__error" role="alert">{error}</p>}

                  <button type="submit" className="pi-auth__submit" disabled={enviando}>
                    {enviando ? 'Guardando…' : 'Guardar y continuar →'}
                  </button>
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
