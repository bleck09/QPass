import { useState, useMemo, useEffect } from 'react';
import {
  FaCamera, FaSave, FaCheckCircle, FaExclamationTriangle, FaUserShield,
  FaCalendarAlt, FaIdBadge, FaPhone, FaMapMarkerAlt, FaUserEdit,
  FaIdCard, FaBirthdayCake, FaEdit, FaTimes, FaCheck, FaEnvelope, FaQuoteLeft, FaUser
} from 'react-icons/fa';
import { EVENTO_USUARIO_ACTUALIZADO } from '../../layout/MenuLateral';
import { leerSesion, guardarSesion } from '../../api/client.js';
import { ROLE_LABELS } from '../../constants/roles.js';
import api from '../../api/index.js';
import './Perfil.css';

const getIniciales = (nombre = 'Usuario') => nombre.substring(0, 2).toUpperCase();

// El backend devuelve fechaNacimiento como datetime ISO; el <input type="date"> necesita solo la parte yyyy-mm-dd.
const soloFecha = (iso) => (iso ? iso.slice(0, 10) : '');

export default function Perfil() {
  const sesion = leerSesion();
  const [usuario, setUsuarioState] = useState(sesion);

  // Estados de datos
  const [foto, setFoto] = useState(sesion?.foto || '');
  const [celular, setCelular] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [biografia, setBiografia] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

  // Datos NO editables
  const nombre = usuario?.nombre || '';
  const ci = usuario?.ci || '';
  const email = usuario?.email || '';

  // Estados de contraseñas
  const [contraseñaActual, setContraseñaActual] = useState('');
  const [contraseñaNueva, setContraseñaNueva] = useState('');
  const [contraseñaConfirmar, setContraseñaConfirmar] = useState('');
  const [historialPassword, setHistorialPassword] = useState([]);

  // Estados de UI
  const [activeTab, setActiveTab] = useState('cuenta');
  const [isEditing, setIsEditing] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // La sesión solo trae id/nombre/email/rol/foto; el resto del perfil se carga aparte.
  useEffect(() => {
    if (!sesion) return;
    api.usuarios.obtener(sesion.id).then(completo => {
      setUsuarioState(completo);
      setFoto(completo.foto || '');
      setCelular(completo.celular || '');
      setCiudad(completo.ciudad || '');
      setBiografia(completo.biografia || '');
      setFechaNacimiento(soloFecha(completo.fechaNacimiento));
    });
    api.usuarios.historialPassword(sesion.id).then(setHistorialPassword);
  }, [sesion?.id]);

  // Fecha máxima para el calendario (HOY)
  const fechaHoyStr = new Date().toISOString().split('T')[0];

  // LÓGICA CORREGIDA DEL PROGRESO DE PERFIL (Para que llegue a 100% real)
  const { progreso, pasos } = useMemo(() => {
    let score = 25; // 25% Base por registrarse (Nombre, CI, Email)
    const steps = [
      { id: 'registro', label: 'Datos Base', done: true, points: 25 },
      { id: 'foto', label: 'Foto de perfil', done: !!foto, points: 15 },
      { id: 'celular', label: 'Celular (+591)', done: !!celular, points: 15 },
      { id: 'fecha', label: 'Nacimiento', done: !!fechaNacimiento, points: 15 },
      { id: 'ciudad', label: 'Ubicación', done: !!ciudad, points: 15 },
      { id: 'bio', label: 'Biografía', done: !!biografia, points: 15 }
    ];

    if (foto) score += 15;
    if (celular) score += 15;
    if (fechaNacimiento) score += 15;
    if (ciudad) score += 15;
    if (biografia) score += 15;

    return { progreso: score, pasos: steps };
  }, [foto, celular, fechaNacimiento, ciudad, biografia]);

  const circunferencia = 2 * Math.PI * 45;
  const strokeOffset = circunferencia - (progreso / 100) * circunferencia;

  if (!usuario) return null;

  const fechaCreacion = usuario?.createdAt ? soloFecha(usuario.createdAt) : '';

  const handleFotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFoto(reader.result);
    reader.readAsDataURL(file);
  };

  const cancelarEdicion = () => {
    setCelular(usuario?.celular || '');
    setCiudad(usuario?.ciudad || '');
    setBiografia(usuario?.biografia || '');
    setFechaNacimiento(soloFecha(usuario?.fechaNacimiento));
    setIsEditing(false);
  };

  // MANEJO DE SOLO NÚMEROS PARA EL CELULAR
  const handleCelularChange = (e) => {
    const valor = e.target.value;
    const soloNumeros = valor.replace(/\D/g, ''); // Expresión regular que borra letras
    if (soloNumeros.length <= 8) { // Máximo 8 dígitos para Bolivia
      setCelular(soloNumeros);
    }
  };

  const guardarCambios = async () => {
    setMensaje({ texto: '', tipo: '' });

    // VALIDACIÓN: Celular debe tener exactamente 8 dígitos si se llenó
    if (celular && celular.length < 8) {
      setMensaje({ texto: 'El número de celular debe tener exactamente 8 dígitos.', tipo: 'error' });
      return;
    }

    // VALIDACIÓN: Fecha de nacimiento no puede ser del futuro
    if (fechaNacimiento) {
      const fechaIngresada = new Date(fechaNacimiento);
      const fechaHoy = new Date();
      if (fechaIngresada > fechaHoy) {
        setMensaje({ texto: '¡La fecha de nacimiento no puede estar en el futuro!', tipo: 'error' });
        return;
      }
    }

    try {
      const actualizado = await api.usuarios.actualizar(usuario.id, {
        foto,
        fechaNacimiento: fechaNacimiento || undefined,
        celular: celular.trim(),
        ciudad: ciudad.trim(),
        biografia: biografia.trim(),
      });

      setUsuarioState(actualizado);
      guardarSesion({ ...sesion, foto: actualizado.foto });
      window.dispatchEvent(new Event(EVENTO_USUARIO_ACTUALIZADO));

      setIsEditing(false);
      setMensaje({ texto: 'Perfil actualizado exitosamente.', tipo: 'exito' });
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    }
  };

  const guardarSeguridad = async () => {
    if (!contraseñaActual || !contraseñaNueva || !contraseñaConfirmar) {
      setMensaje({ texto: 'Completa todos los campos de contraseña.', tipo: 'error' });
      return;
    }
    if (contraseñaNueva.length < 6) {
      setMensaje({ texto: 'La nueva contraseña debe tener al menos 6 caracteres.', tipo: 'error' });
      return;
    }
    if (contraseñaNueva !== contraseñaConfirmar) {
      setMensaje({ texto: 'La confirmación no coincide con la nueva contraseña.', tipo: 'error' });
      return;
    }

    try {
      await api.usuarios.cambiarPassword(usuario.id, contraseñaActual, contraseñaNueva);
      setContraseñaActual('');
      setContraseñaNueva('');
      setContraseñaConfirmar('');
      setHistorialPassword(await api.usuarios.historialPassword(usuario.id));
      setMensaje({ texto: 'Contraseña actualizada de forma segura.', tipo: 'exito' });
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    }
  };

  return (
    <div className="pi-perfil-page">
      <div className="pi-perfil-cover">
        <div className="pi-perfil-cover-pattern"></div>
      </div>

      <div className="pi-perfil-layout">
        
        <aside className="pi-perfil-sidebar">
          <div className="pi-perfil-avatar-wrapper">
            <div className="pi-perfil-avatar">
              {foto ? <img src={foto} alt={nombre} /> : <span>{getIniciales(nombre || email)}</span>}
            </div>
            {isEditing && (
              <>
                <label htmlFor="pi-perfil-foto" className="pi-perfil-camera-btn" title="Cambiar foto de perfil">
                  <FaCamera />
                </label>
                <input id="pi-perfil-foto" type="file" accept="image/*" onChange={handleFotoUpload} hidden />
              </>
            )}
          </div>

          <h2 className="pi-perfil-sidebar-name">{nombre}</h2>
          
          <div className="pi-perfil-role-badge">
            <FaIdBadge /> {ROLE_LABELS[usuario.rol] || usuario.rol}
          </div>

          <div style={{ fontSize: '13px', color: 'var(--texto-secundario)', marginBottom: '20px', fontWeight: '600' }}>
            <FaCalendarAlt style={{ marginRight: '5px' }} /> Miembro desde: {fechaCreacion}
          </div>

          <div className="pi-perfil-progress-widget">
            <h4>Completa tu perfil</h4>
            <div className="progress-circular-container">
              <svg className="progress-svg" viewBox="0 0 100 100">
                <circle className="progress-bg" cx="50" cy="50" r="45"></circle>
                <circle 
                  className="progress-bar" 
                  cx="50" cy="50" r="45" 
                  style={{ 
                    strokeDasharray: circunferencia, 
                    strokeDashoffset: strokeOffset,
                    stroke: progreso === 100 ? 'var(--verde-recarga)' : 'var(--cian-digital)'
                  }}
                ></circle>
              </svg>
              <div className="progress-text">
                <span className="progress-num">{progreso}%</span>
              </div>
            </div>

            <ul className="progress-steps">
              {pasos.map(paso => (
                <li key={paso.id} className={paso.done ? 'step-done' : 'step-pending'}>
                  {paso.done ? <FaCheck className="step-icon done"/> : <FaTimes className="step-icon pending"/>}
                  <span className="step-label">{paso.label}</span>
                  <span className="step-points">{paso.done ? '' : `+${paso.points}%`}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="pi-perfil-main-card">
          <div className="pi-perfil-tabs">
            <button className={activeTab === 'cuenta' ? 'active' : ''} onClick={() => setActiveTab('cuenta')}>
              <FaUserEdit style={{marginRight: '8px'}}/> Información Personal
            </button>
            <button className={activeTab === 'seguridad' ? 'active' : ''} onClick={() => setActiveTab('seguridad')}>
              <FaUserShield style={{marginRight: '8px'}}/> Seguridad y Acceso
            </button>
          </div>

          <div className="pi-perfil-tab-content">
            {mensaje.texto && (
              <div className={`pi-perfil-alerta ${mensaje.tipo === 'error' ? 'error' : 'exito'}`}>
                {mensaje.tipo === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />} {mensaje.texto}
              </div>
            )}

            {/* PESTAÑA: INFORMACIÓN PERSONAL */}
            {activeTab === 'cuenta' && (
              <div className="animate-fade pi-perfil-info-section">
                
                <div className="pi-perfil-header-action">
                  <h3>Información Personal</h3>
                  {!isEditing ? (
                    <button className="btn-editar-outline" onClick={() => setIsEditing(true)}>
                      <FaEdit /> Edit
                    </button>
                  ) : (
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button className="btn-cancelar-toggle" onClick={cancelarEdicion}>Cancelar</button>
                      <button className="btn-guardar-toggle" onClick={guardarCambios}><FaSave/> Guardar</button>
                    </div>
                  )}
                </div>

                <div className="pi-perfil-form-grid">
                  
                  {/* --- DATOS FIJOS --- */}
                  <div className="pi-perfil-data-block">
                    <span className="data-label"><FaUser/> Nombre Completo {isEditing && <FaIdBadge title="Dato fijo" className="icon-locked"/>}</span>
                    <span className="data-value">{nombre}</span>
                  </div>

                  <div className="pi-perfil-data-block">
                    <span className="data-label"><FaEnvelope/> Correo Electrónico {isEditing && <FaIdBadge title="Dato fijo" className="icon-locked"/>}</span>
                    <span className="data-value">{email}</span>
                  </div>

                  <div className="pi-perfil-data-block">
                    <span className="data-label"><FaIdCard/> Documento de Identidad (CI) {isEditing && <FaIdBadge title="Dato fijo" className="icon-locked"/>}</span>
                    <span className="data-value">{ci}</span>
                  </div>

                  {/* --- DATOS EDITABLES --- */}
                  <div className="pi-perfil-data-block">
                    <span className="data-label"><FaPhone/> Teléfono Celular</span>
                    {isEditing ? (
                      <div className="pi-perfil-phone-wrapper">
                        <span className="phone-prefix">🇧🇴 +591</span>
                        <input 
                          type="text" 
                          value={celular} 
                          onChange={handleCelularChange} 
                          placeholder="12345678" 
                        />
                      </div>
                    ) : (
                      <span className={`data-value ${!celular ? 'empty' : ''}`}>
                        {celular ? `🇧🇴 +591 ${celular}` : 'No registrado'}
                      </span>
                    )}
                  </div>

                  <div className="pi-perfil-data-block">
                    <span className="data-label"><FaBirthdayCake/> Fecha de Nacimiento</span>
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={fechaNacimiento} 
                        onChange={(e) => setFechaNacimiento(e.target.value)} 
                        max={fechaHoyStr} // Bloquea fechas futuras visualmente
                      />
                    ) : (
                      <span className={`data-value ${!fechaNacimiento ? 'empty' : ''}`}>{fechaNacimiento || 'No registrada'}</span>
                    )}
                  </div>

                  <div className="pi-perfil-data-block">
                    <span className="data-label"><FaMapMarkerAlt/> Ubicación / Ciudad</span>
                    {isEditing ? (
                      <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej. Cochabamba, Bolivia" />
                    ) : (
                      <span className={`data-value ${!ciudad ? 'empty' : ''}`}>{ciudad || 'No registrada'}</span>
                    )}
                  </div>

                  <div className="pi-perfil-data-block full-width" style={{marginTop: '10px'}}>
                    <span className="data-label"><FaQuoteLeft/> Biografía</span>
                    {isEditing ? (
                      <textarea value={biografia} onChange={(e) => setBiografia(e.target.value)} rows="3" placeholder="Escribe algo sobre ti..." />
                    ) : (
                      <p className={`data-value-p ${!biografia ? 'empty' : ''}`}>{biografia || 'Sin biografía disponible. Dale a "Edit" para añadir una.'}</p>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* PESTAÑA: SEGURIDAD */}
            {activeTab === 'seguridad' && (
              <div className="pi-perfil-form-grid animate-fade">
                <div className="pi-perfil-info-box full-width">
                  <FaUserShield className="info-icon"/>
                  <div>
                    <h4>Cambio de Contraseña</h4>
                    <p>Por seguridad, necesitas ingresar tu contraseña actual para establecer una nueva.</p>
                  </div>
                </div>

                <div className="pi-perfil-data-block full-width">
                  <span className="data-label">Contraseña Actual</span>
                  <input type="password" value={contraseñaActual} onChange={(e) => setContraseñaActual(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="pi-perfil-data-block">
                  <span className="data-label">Nueva Contraseña</span>
                  <input type="password" value={contraseñaNueva} onChange={(e) => setContraseñaNueva(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="pi-perfil-data-block">
                  <span className="data-label">Confirmar Contraseña</span>
                  <input type="password" value={contraseñaConfirmar} onChange={(e) => setContraseñaConfirmar(e.target.value)} placeholder="Repite la contraseña" />
                </div>
                <div className="full-width" style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end'}}>
                  <button className="btn-guardar-toggle" onClick={guardarSeguridad}>
                    <FaSave style={{marginRight: '5px'}}/> Actualizar Seguridad
                  </button>
                </div>

                <div className="pi-perfil-data-block full-width" style={{marginTop: '10px'}}>
                  <span className="data-label"><FaUserShield/> Historial de cambios de contraseña</span>
                  {historialPassword.length === 0 ? (
                    <p className="data-value-p empty">Todavía no registras ningún cambio de contraseña.</p>
                  ) : (
                    <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                      {historialPassword.map(c => (
                        <li key={c.id} style={{ fontSize: '13px', color: 'var(--texto-secundario)' }}>
                          {new Date(c.createdAt).toLocaleString('es-BO')} — {c.origen === 'recuperacion' ? 'por recuperación con código' : 'cambio manual'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}