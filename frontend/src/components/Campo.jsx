import ErrorCampo from './ErrorCampo.jsx';
import InputContrasena from './InputContrasena.jsx';

/*
  Arma UN campo con el .input-group GLOBAL de forms.css: label, control
  (con ícono / prefijo opcional), ayuda y error en línea. No trae estilos
  propios: es solo para no repetir las mismas 15 líneas en cada pantalla
  (PLAN §2.9 / §2.10). Los estilos se mejoran en forms.css.

    <Campo id="email" etiqueta="Correo" icono={FaEnvelope} type="email"
           value={email} onChange={…} error={errores.email} />
    <Campo id="clave" etiqueta="Contraseña" contrasena value={…} onChange={…} />
    <Campo id="cel" etiqueta="Celular" prefijo="🇧🇴 +591" type="tel" … />

  etiquetaExtra: nodo a la derecha del label (p. ej. "¿Olvidaste tu contraseña?").
  children: en lugar del <input> (un <select>, etc.); lleva el `id` a mano.
  Cualquier otra prop pasa al <input>.
*/
export default function Campo({
  id,
  etiqueta,
  icono: Icono,
  prefijo,
  ayuda,
  error,
  etiquetaExtra,
  contrasena = false,
  className = '',
  children,
  ...input
}) {
  const idAyuda = ayuda ? `${id}-ayuda` : null;
  const idError = error ? `${id}-error` : null;
  const aria = {
    'aria-invalid': !!error,
    'aria-describedby': [idAyuda, idError].filter(Boolean).join(' ') || undefined,
  };

  let control;
  if (children) {
    control = children;
  } else if (contrasena) {
    control = <InputContrasena id={id} {...(Icono ? { icono: Icono } : {})} {...aria} {...input} />;
  } else if (Icono || prefijo) {
    control = (
      <div
        className="input-group__control"
        style={prefijo ? { '--prefijo-ancho': `${String(prefijo).length * 0.55}rem` } : undefined}
      >
        {Icono && <Icono className="input-group__icono" aria-hidden="true" />}
        {prefijo && <span className="input-group__prefijo" aria-hidden="true">{prefijo}</span>}
        <input id={id} {...aria} {...input} />
      </div>
    );
  } else {
    control = <input id={id} {...aria} {...input} />;
  }

  return (
    <div className={`input-group ${className}`.trim()}>
      {etiquetaExtra ? (
        <div className="input-group__cabecera">
          <label htmlFor={id}>{etiqueta}</label>
          {etiquetaExtra}
        </div>
      ) : (
        <label htmlFor={id}>{etiqueta}</label>
      )}
      {control}
      {ayuda && <p id={idAyuda} className="input-group__ayuda">{ayuda}</p>}
      <ErrorCampo id={idError} mensaje={error} />
    </div>
  );
}
