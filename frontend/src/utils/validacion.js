// Reglas de validación de formularios, ÚNICAS para toda la app (PLAN §2.9):
// mismas reglas y mismos mensajes en login, registro, recuperar, perfil y
// compra. Cada función devuelve el mensaje de error o null si está bien.

export const FORMA_CORREO = /^\S+@\S+\.\S+$/;
export const MIN_CONTRASENA = 6;
// Letras (con acentos/Ñ), espacios, apóstrofes y guiones — sin dígitos ni símbolos.
export const FORMA_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’-]+(\s[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’-]+)*$/;

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

// Nombre/apellido de una persona: obligatorio (salvo que se indique lo
// contrario) y sin dígitos ni símbolos.
export function errorNombre(valor, { obligatorio = true, mensajeObligatorio = 'Escribí el nombre.' } = {}) {
  const v = texto(valor);
  if (!v) return obligatorio ? mensajeObligatorio : null;
  if (!FORMA_NOMBRE.test(v)) return 'El nombre no puede tener números ni símbolos.';
  return null;
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

// Edad mínima para registrarse (mismo criterio que EdadMinima en el backend,
// ver common/decorators/edad-minima.decorator.ts). Opcional: si no viene
// fecha, no hay error (el campo sigue siendo opcional).
const EDAD_MAXIMA_RAZONABLE = 120;
export function errorFechaNacimiento(valor, { minimoAnios = 13 } = {}) {
  const v = texto(valor);
  if (!v) return null;
  const fecha = new Date(`${v}T00:00`);
  if (Number.isNaN(fecha.getTime())) return 'Fecha inválida.';
  const hoy = new Date();
  if (fecha.getTime() > hoy.getTime()) return 'La fecha no puede ser futura.';
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const noLlegoElCumple = hoy.getMonth() < fecha.getMonth() ||
    (hoy.getMonth() === fecha.getMonth() && hoy.getDate() < fecha.getDate());
  if (noLlegoElCumple) edad -= 1;
  if (edad < minimoAnios) return `Tenés que tener al menos ${minimoAnios} años.`;
  if (edad > EDAD_MAXIMA_RAZONABLE) return 'Revisá la fecha de nacimiento.';
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
