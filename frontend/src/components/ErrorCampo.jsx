import { FaExclamationCircle } from 'react-icons/fa';

/*
  Mensaje de error de UN campo, debajo del control dentro de .input-group
  (estilos en styles/forms.css, PLAN_REDISENO §2.5). No es un "Campo" nuevo:
  el campo sigue siendo el .input-group de siempre.

    <div className="input-group">
      <label htmlFor="correo">Correo</label>
      <input id="correo" aria-invalid={!!error} aria-describedby={error ? 'correo-error' : undefined} />
      <ErrorCampo id="correo-error" mensaje={error} />
    </div>

  Sin mensaje no pinta nada.
*/
export default function ErrorCampo({ id, mensaje }) {
  if (!mensaje) return null;
  return (
    <p id={id} className="input-group__error">
      <FaExclamationCircle aria-hidden="true" />
      {mensaje}
    </p>
  );
}
