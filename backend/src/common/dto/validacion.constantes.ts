/* ============================================================================
 * src/common/dto/validacion.constantes.ts
 *
 * Única fuente de verdad para los límites de longitud y patrones que se
 * repiten en varios DTOs (nombre de persona, contraseña, URLs, notas...).
 * Antes cada DTO tenía su propio número mágico (@MaxLength(80) acá,
 * @MaxLength(80) allá) y hasta la regex de nombre estaba duplicada en dos
 * archivos — cualquier cambio futuro (ej. subir el tope de nombre) obligaba a
 * tocar N archivos y encontrarlos todos a mano. Ahora se cambia una vez acá.
 * ========================================================================= */

export const mensajeMaxLength = (max: number) =>
  `No puede tener más de ${max} caracteres`;

// --- Nombre de persona (titular, invitado, apellidos) ---------------------
// Letras (con acentos/Ñ), espacios, apóstrofe y guion — sin dígitos ni
// símbolos. Mismo patrón que FORMA_NOMBRE en frontend/src/utils/validacion.js.
export const FORMA_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’-]+(\s[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’-]+)*$/;
export const MENSAJE_NOMBRE = 'El nombre no puede tener números ni símbolos';
export const MAX_NOMBRE = 80;

// --- Contraseña -------------------------------------------------------------
// bcrypt trunca en silencio todo lo que pasa de 72 bytes: sin este tope, dos
// contraseñas distintas que compartan esos primeros 72 caracteres terminarían
// generando el mismo hash.
export const MAX_PASSWORD = 72;
export const MENSAJE_MAX_PASSWORD = `La contraseña no puede tener más de ${MAX_PASSWORD} caracteres`;

// --- Genéricos reusados en varios módulos -----------------------------------
export const MAX_EMAIL = 180;
export const MAX_TITULO = 120; // nombre de evento, lugar, título de landing...
export const MAX_URL = 500; // fotos/logos/comprobantes subidos a /uploads
export const MAX_NOMBRE_ARCHIVO = 255;
export const MAX_NOTA = 500; // motivo, observación, nota, biografía, sanción...
export const MAX_DESCRIPCION_LARGA = 2000; // descripción de solicitud de evento
export const MAX_TEXTO_LANDING = 5000; // "informacion" de la página pública
export const MAX_COLOR = 30; // "#RRGGBB" o similar
export const MAX_DOCUMENTO = 30; // CI o número de pasaporte
export const MAX_CELULAR = 20;
export const MAX_ETIQUETA_CORTA = 50; // categoría de producto/puesto, turno
export const MAX_PREFIJO_QR = 10;
export const MAX_VERSION_TERMINOS = 30;
export const MAX_BENEFICIO_ITEM = 200;
export const MAX_CANTIDAD_BENEFICIOS = 30;
export const MAX_VALOR_CORREGIDO = 180; // ReporteEntrada: nombre/correo/celular corregido
