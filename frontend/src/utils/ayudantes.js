import { errorObligatorio, errorCorreo, errorContrasenaNueva, limpiarErrores } from './validacion.js';

// Validación del alta de un ayudante (nombre, correo, contraseña temporal).
// Única para "Mis ayudantes" y para el alta rápida desde el detalle del
// puesto. Las claves son los id de los campos: `${prefijo}-nombre`, etc.
export const erroresAyudante = (f, prefijo, { conCorreo = true, conClave = true } = {}) => limpiarErrores({
  [`${prefijo}-nombre`]: errorObligatorio(f.nombre, 'Escribí el nombre del ayudante.'),
  ...(conCorreo ? { [`${prefijo}-email`]: errorCorreo(f.email) } : {}),
  ...(conClave ? { [`${prefijo}-pass`]: errorContrasenaNueva(f.password) } : {}),
});
