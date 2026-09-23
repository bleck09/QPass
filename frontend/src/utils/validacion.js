// Reglas de validación de formularios, ÚNICAS para toda la app (PLAN §2.9):
// mismas reglas y mismos mensajes en login, registro, recuperar, perfil y
// compra. Cada función devuelve el mensaje de error o null si está bien.

export const FORMA_CORREO = /^\S+@\S+\.\S+$/;
export const MIN_CONTRASENA = 6;

const texto = (v) => (v ?? '').trim();

export function errorCorreo(valor) {
  const v = texto(valor);
  if (!v) return 'Escribí tu correo electrónico.';
  if (!FORMA_CORREO.test(v)) return 'Revisá el correo: debe ser como nombre@correo.com';
  return null;
}

export function errorObligatorio(valor, mensaje = 'Este dato es obligatorio.') {
  return texto(valor) ? null : mensaje;
}

export function errorContrasenaNueva(valor) {
  if (!valor) return 'Escribí una contraseña.';
  if (valor.length < MIN_CONTRASENA) return `Tiene que tener al menos ${MIN_CONTRASENA} caracteres.`;
  return null;
}

export function errorConfirmacion(valor, original) {
  if (!valor) return 'Repetí la contraseña.';
  if (valor !== original) return 'Las contraseñas no coinciden.';
  return null;
}

// Celular boliviano: 8 dígitos. Opcional salvo que se pida lo contrario.
export function errorCelular(valor, { obligatorio = false } = {}) {
  const v = texto(valor);
  if (!v) return obligatorio ? 'Escribí tu celular.' : null;
  if (!/^\d{8}$/.test(v)) return 'El celular tiene que tener 8 dígitos.';
  return null;
}

// Deja solo los números y como mucho `max` (para el onChange del celular).
export const soloDigitos = (valor, max = 8) => valor.replace(/\D/g, '').slice(0, max);

// { campo: mensaje } sin los campos que están bien.
export const limpiarErrores = (errores) =>
  Object.fromEntries(Object.entries(errores).filter(([, m]) => m));

// Lleva el foco al primer campo con error, en el orden de `orden` (ids).
export function enfocarPrimero(errores, orden) {
  const id = orden.find((campo) => errores[campo]);
  if (id) document.getElementById(id)?.focus();
}
