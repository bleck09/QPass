import { useState } from 'react';
import { FaEye, FaEyeSlash, FaLock } from 'react-icons/fa';
import Boton from './Boton.jsx';

/*
  Input de contraseña con botón "ver / ocultar" (PLAN §2.10: se repetía en
  Login, Registrar, Recuperar y Completar perfil). Va DENTRO del .input-group
  de siempre; el label y el ErrorCampo los pone la pantalla:

    <div className="input-group">
      <label htmlFor="clave">Contraseña</label>
      <InputContrasena id="clave" value={clave} onChange={…} autoComplete="current-password" />
      <ErrorCampo … />
    </div>

  icono: ícono de adelante (candado por defecto; null = sin ícono).
  Cualquier otra prop (value, onChange, aria-*, required…) pasa al <input>.
*/
export default function InputContrasena({ icono: Icono = FaLock, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-group__control">
      {Icono && <Icono className="input-group__icono" aria-hidden="true" />}
      <input type={visible ? 'text' : 'password'} {...props} />
      <Boton
        variante="fantasma"
        tamano="sm"
        className="input-group__accion"
        icono={visible ? FaEyeSlash : FaEye}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      />
    </div>
  );
}
