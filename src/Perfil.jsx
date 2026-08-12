import { useState } from 'react';
import {
  FaCamera, FaSave, FaLock, FaCheckCircle, FaExclamationTriangle
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

  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [foto, setFoto] = useState(usuario?.foto || '');

  const [contraseñaActual, setContraseñaActual] = useState('');
  const [contraseñaNueva, setContraseñaNueva] = useState('');
  const [contraseñaConfirmar, setContraseñaConfirmar] = useState('');

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // tipo: 'exito' | 'error'

  if (!usuario) {
    return null; // MenuLateral ya redirige a /login si no hay sesión
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
    setMensaje({ texto: 'Perfil actualizado con éxito.', tipo: 'exito' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  return (
    <div className="pi-perfil-container">
      <h2>Mi Perfil</h2>

      <div className="pi-perfil-card">
        <div className="pi-perfil-avatar-seccion">
          <div className="pi-perfil-avatar">
            {foto
              ? <img src={foto} alt={nombre} />
              : <span>{getIniciales(nombre || usuario.email)}</span>}
          </div>
          <label htmlFor="pi-perfil-foto" className="pi-perfil-btn-foto">
            <FaCamera /> Cambiar foto
          </label>
          <input id="pi-perfil-foto" type="file" accept="image/*" onChange={handleFotoUpload} hidden />
        </div>

        <div className="pi-perfil-datos">
          <div className="pi-perfil-form-group">
            <label>Nombre completo</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div className="pi-perfil-form-group">
            <label>Correo electrónico</label>
            <input type="email" value={usuario.email} disabled />
          </div>

          <div className="pi-perfil-form-group">
            <label>Rol</label>
            <input type="text" value={usuario.rol} disabled />
          </div>
        </div>
      </div>

      <div className="pi-perfil-card">
        <h3><FaLock color="var(--indigo-profundo)" /> Cambiar contraseña</h3>
        <p className="pi-perfil-nota">Deja estos campos vacíos si no quieres cambiar tu contraseña.</p>

        <div className="pi-perfil-form-group">
          <label>Contraseña actual</label>
          <input
            type="password"
            value={contraseñaActual}
            onChange={(e) => setContraseñaActual(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="pi-perfil-passwords-grid">
          <div className="pi-perfil-form-group">
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={contraseñaNueva}
              onChange={(e) => setContraseñaNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="pi-perfil-form-group">
            <label>Confirmar nueva contraseña</label>
            <input
              type="password"
              value={contraseñaConfirmar}
              onChange={(e) => setContraseñaConfirmar(e.target.value)}
              placeholder="Repite la nueva contraseña"
            />
          </div>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`pi-perfil-alerta ${mensaje.tipo === 'error' ? 'error' : 'exito'}`}>
          {mensaje.tipo === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />} {mensaje.texto}
        </div>
      )}

      <button className="pi-perfil-btn-guardar" onClick={guardarCambios}>
        <FaSave /> Guardar cambios
      </button>
    </div>
  );
}
