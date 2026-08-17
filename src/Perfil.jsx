import { useState } from 'react';
import {
  FaCamera, FaSave, FaCheckCircle, FaExclamationTriangle, FaUserShield
} from 'react-icons/fa';
import { EVENTO_USUARIO_ACTUALIZADO } from './MenuLateral';
import './Perfil.css';

const leerUsuarioGuardado = () => {
  const guardado = localStorage.getItem('usuarioProyectoIngresos');
  return guardado ? JSON.parse(guardado) : null;
};

const getIniciales = (nombre = 'Usuario') => nombre.substring(0, 2).toUpperCase();

export default function Perfil() {
  const [usuario, setUsuarioState] = useState(leerUsuarioGuardado);

  // Estados de datos
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [foto, setFoto] = useState(usuario?.foto || '');

  // Estados de contraseñas
  const [contraseñaActual, setContraseñaActual] = useState('');
  const [contraseñaNueva, setContraseñaNueva] = useState('');
  const [contraseñaConfirmar, setContraseñaConfirmar] = useState('');

  // Estados de UI
  const [activeTab, setActiveTab] = useState('cuenta'); // 'cuenta' | 'seguridad'
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  if (!usuario) {
    return null; 
  }

  const handleFotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFoto(reader.result);
    reader.readAsDataURL(file);
  };

  const guardarCambios = () => {
    setMensaje({ texto: '', tipo: '' });

    if (!nombre.trim()) {
      setMensaje({ texto: 'El nombre no puede estar vacío.', tipo: 'error' });
      return;
    }

    const quiereCambiarContraseña = contraseñaActual || contraseñaNueva || contraseñaConfirmar;
    let nuevaPass = usuario.pass;

    if (quiereCambiarContraseña) {
      if (contraseñaActual !== usuario.pass) {
        setMensaje({ texto: 'La contraseña actual no es correcta.', tipo: 'error' });
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
      nuevaPass = contraseñaNueva;
    }

    const usuarioActualizado = { ...usuario, nombre: nombre.trim(), foto, pass: nuevaPass };
    localStorage.setItem('usuarioProyectoIngresos', JSON.stringify(usuarioActualizado));
    window.dispatchEvent(new Event(EVENTO_USUARIO_ACTUALIZADO));

    setUsuarioState(usuarioActualizado);
    setContraseñaActual('');
    setContraseñaNueva('');
    setContraseñaConfirmar('');
    setMensaje({ texto: 'Perfil actualizado exitosamente.', tipo: 'exito' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  return (
    <div className="pi-perfil-page">
      
      {/* 1. PORTADA (COVER) */}
      <div className="pi-perfil-cover">
        <div className="pi-perfil-cover-pattern"></div>
      </div>

      {/* 2. CONTENEDOR PRINCIPAL SUPERPUESTO */}
      <div className="pi-perfil-layout">
        
        {/* COLUMNA IZQUIERDA: RESUMEN DEL USUARIO */}
        <aside className="pi-perfil-sidebar">
          <div className="pi-perfil-avatar-wrapper">
            <div className="pi-perfil-avatar">
              {foto 
                ? <img src={foto} alt={nombre} /> 
                : <span>{getIniciales(nombre || usuario.email)}</span>
              }
            </div>
            {/* Botón Flotante para cambiar foto */}
            <label htmlFor="pi-perfil-foto" className="pi-perfil-camera-btn" title="Cambiar foto de perfil">
              <FaCamera />
            </label>
            <input id="pi-perfil-foto" type="file" accept="image/*" onChange={handleFotoUpload} hidden />
          </div>

          <h2 className="pi-perfil-sidebar-name">{usuario.nombre || 'Usuario'}</h2>
          <p className="pi-perfil-sidebar-role">{usuario.rol} de QPass</p>

          <div className="pi-perfil-sidebar-stats">
            <div className="stat-row">
              <span>Estado de cuenta</span>
              <span className="stat-value text-green">Activo</span>
            </div>
            <div className="stat-row">
              <span>Último acceso</span>
              <span className="stat-value">Hoy</span>
            </div>
          </div>
        </aside>

        {/* COLUMNA DERECHA: FORMULARIOS Y TABS */}
        <main className="pi-perfil-main-card">
          
          {/* Navegación por Pestañas */}
          <div className="pi-perfil-tabs">
            <button 
              className={activeTab === 'cuenta' ? 'active' : ''} 
              onClick={() => setActiveTab('cuenta')}
            >
              Ajustes de Cuenta
            </button>
            <button 
              className={activeTab === 'seguridad' ? 'active' : ''} 
              onClick={() => setActiveTab('seguridad')}
            >
              Seguridad y Contraseña
            </button>
          </div>

          <div className="pi-perfil-tab-content">
            
            {mensaje.texto && (
              <div className={`pi-perfil-alerta ${mensaje.tipo === 'error' ? 'error' : 'exito'}`}>
                {mensaje.tipo === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />} {mensaje.texto}
              </div>
            )}

            {/* PESTAÑA: AJUSTES DE CUENTA */}
            {activeTab === 'cuenta' && (
              <div className="pi-perfil-form-grid animate-fade">
                <div className="pi-perfil-form-group full-width">
                  <label>Nombre Completo</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    placeholder="Tu nombre y apellido"
                  />
                </div>

                <div className="pi-perfil-form-group">
                  <label>Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={usuario.email} 
                    disabled 
                    className="input-disabled"
                  />
                </div>

                <div className="pi-perfil-form-group">
                  <label>Rol Asignado</label>
                  <input 
                    type="text" 
                    value={usuario.rol} 
                    disabled 
                    className="input-disabled"
                  />
                </div>
              </div>
            )}

            {/* PESTAÑA: SEGURIDAD Y CONTRASEÑA */}
            {activeTab === 'seguridad' && (
              <div className="pi-perfil-form-grid animate-fade">
                
                <div className="pi-perfil-info-box full-width">
                  <FaUserShield className="info-icon"/>
                  <div>
                    <h4>Protección de Cuenta</h4>
                    <p>Si deseas actualizar tu contraseña, ingresa tu contraseña actual para verificar tu identidad y luego define una nueva (mínimo 6 caracteres).</p>
                  </div>
                </div>

                <div className="pi-perfil-form-group full-width">
                  <label>Contraseña Actual</label>
                  <input
                    type="password"
                    value={contraseñaActual}
                    onChange={(e) => setContraseñaActual(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="pi-perfil-form-group">
                  <label>Nueva Contraseña</label>
                  <input
                    type="password"
                    value={contraseñaNueva}
                    onChange={(e) => setContraseñaNueva(e.target.value)}
                    placeholder="Nueva contraseña"
                  />
                </div>

                <div className="pi-perfil-form-group">
                  <label>Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    value={contraseñaConfirmar}
                    onChange={(e) => setContraseñaConfirmar(e.target.value)}
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pi-perfil-footer">
            <button className="pi-perfil-btn-guardar" onClick={guardarCambios}>
              <FaSave /> Guardar Cambios
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}