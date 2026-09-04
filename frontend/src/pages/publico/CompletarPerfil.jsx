import { useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useNavigate } from 'react-router-dom';
import { MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { FaIdCard, FaBirthdayCake, FaMapMarkerAlt, FaCamera, FaCheckCircle } from 'react-icons/fa';
import { ROLE_HOME_PATH } from '../../constants/roles.js';
import { leerSesion, guardarSesion } from '../../api/client.js';
import { EVENTO_USUARIO_ACTUALIZADO } from '../../layout/MenuLateral.jsx';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import api from '../../api/index.js';
import './Registrar.css';

/* ============================================================================
 * Paso obligatorio para las cuentas que se auto-crean al aprobar una compra
 * (ver ComprasService.aprobar): llegan con una contraseña temporal por correo.
 * Acá SÍ o SÍ cambian esa contraseña y cargan su CI (se pide en la puerta para
 * verificar identidad) — el resto de los datos es opcional. MenuLateral.jsx
 * redirige acá mientras sesion.debeCompletarPerfil sea true; esta pantalla no
 * tiene menú lateral para que no se pueda navegar a otro lado sin terminar.
 * ========================================================================= */
export default function CompletarPerfil() {
  useTituloPagina('Completa tu cuenta');
  const navigate = useNavigate();
  const sesion = leerSesion();

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCambiada, setPasswordCambiada] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordCambiada) {
      if (!passwordActual) return setError('Ingresa la contraseña con la que iniciaste sesión.');
      if (passwordNueva.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
      if (passwordNueva !== confirmarPassword) return setError('Las contraseñas nuevas no coinciden.');
    }
    if (!ci.trim()) return setError('El número de carnet es obligatorio.');

    setEnviando(true);
    try {
      // Primero la contraseña: si ya se cambió en un intento anterior (el paso
      // de abajo falló y el usuario reintentó), no se repite — passwordActual
      // ya no serviría porque dejó de ser la actual.
      if (!passwordCambiada) {
        await api.usuarios.cambiarPassword(sesion.id, passwordActual, passwordNueva);
        setPasswordCambiada(true);
      }

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
    <div className="pi-register-wrapper">
      <div className="bg-glow glow-top-left"></div>
      <div className="bg-glow glow-bottom-right"></div>

      <main className="pi-register-content" id="contenido">
        <div className="pi-register-card glass-panel">
          <h1 className="pi-register-title">Completa tu cuenta</h1>
          <p className="pi-register-subtitle">
            Antes de continuar, cambiá la contraseña temporal y cargá tu número de carnet — te lo van
            a pedir en la puerta para verificar tu identidad.
          </p>

          <form onSubmit={handleSubmit} className="pi-register-form">
            {!passwordCambiada ? (
              <div className="pi-register-grid">
                <div className="pi-register-input-group full-width">
                  <label htmlFor="cp-password-actual">Contraseña actual (la temporal) *</label>
                  <div className="pi-register-input-wrapper">
                    <span className="pi-register-icon" aria-hidden="true"><MdLock size={18} /></span>
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

                <div className="pi-register-input-group">
                  <label htmlFor="cp-password-nueva">Contraseña nueva *</label>
                  <div className="pi-register-input-wrapper">
                    <span className="pi-register-icon" aria-hidden="true"><MdLock size={18} /></span>
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
                      className="pi-register-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <MdVisibilityOff size={18} aria-hidden="true" /> : <MdVisibility size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="pi-register-input-group">
                  <label htmlFor="cp-password-confirmar">Confirmar contraseña nueva *</label>
                  <div className="pi-register-input-wrapper">
                    <span className="pi-register-icon" aria-hidden="true"><MdLock size={18} /></span>
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
            ) : (
              <p className="pi-register-success"><FaCheckCircle aria-hidden="true" /> Contraseña actualizada.</p>
            )}

            <div className="pi-register-divider"><span>Tus datos</span></div>

            <div className="pi-register-grid">
              <div className="pi-register-input-group">
                <label htmlFor="cp-ci">Número de carnet (C.I.) *</label>
                <div className="pi-register-input-wrapper">
                  <span className="pi-register-icon" aria-hidden="true"><FaIdCard size={16} /></span>
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

              <div className="pi-register-input-group">
                <label htmlFor="cp-celular">Celular (opcional)</label>
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

              <div className="pi-register-input-group">
                <label htmlFor="cp-nacimiento">Fecha de nacimiento (opcional)</label>
                <div className="pi-register-input-wrapper">
                  <span className="pi-register-icon" aria-hidden="true"><FaBirthdayCake size={16} /></span>
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

              <div className="pi-register-input-group">
                <label htmlFor="cp-ciudad">Ciudad (opcional)</label>
                <div className="pi-register-input-wrapper">
                  <span className="pi-register-icon" aria-hidden="true"><FaMapMarkerAlt size={16} /></span>
                  <input
                    id="cp-ciudad"
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    placeholder="Ej. Cochabamba"
                  />
                </div>
              </div>

              <div className="pi-register-input-group full-width">
                <label htmlFor="cp-foto">Foto de perfil (opcional)</label>
                <div className="pi-register-input-wrapper" style={{ gap: '12px' }}>
                  {foto && <img src={foto} alt="Vista previa" width="40" height="40" style={{ borderRadius: '50%', objectFit: 'cover' }} />}
                  <label className="pi-register-btn-back" style={{ cursor: 'pointer' }}>
                    <FaCamera aria-hidden="true" /> {foto ? 'Cambiar foto' : 'Subir foto'}
                    <input id="cp-foto" type="file" accept="image/*" onChange={handleFotoUpload} hidden />
                  </label>
                </div>
              </div>
            </div>

            {error && <p className="pi-register-error" role="alert">{error}</p>}

            <button type="submit" className="pi-register-btn-submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar y continuar →'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
