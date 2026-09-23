// Validación de los datos de cada entrada (nombre, correo, celular).
// Única para "Comprar entradas" y "Revisar mi solicitud": mismas reglas y
// mismos mensajes en los dos lados (PLAN_REDISENO §2.9).

import { FORMA_CORREO } from './validacion.js';

const texto = (v) => (v ?? '').trim();

/**
 * Devuelve { [idEntrada]: { nombre?, correo?, celular? } } con el mensaje
 * de cada campo que está mal. Una entrada sin errores no aparece.
 *
 * - Nombre y correo: obligatorios; el correo con forma de correo.
 * - Celular: obligatorio solo para invitados (el del titular es opcional).
 * - El correo no se repite DENTRO de una misma jornada (la misma persona sí
 *   puede tener una entrada la noche 1 y otra la noche 2).
 *
 * @param {Array} entradas
 * @param {(entrada) => any} jornadaDe  clave de jornada de la entrada
 */
export function erroresEntradas(entradas, jornadaDe = () => null) {
  const errores = {};
  const marcar = (id, campo, mensaje) => {
    errores[id] = { ...errores[id], [campo]: errores[id]?.[campo] ?? mensaje };
  };

  const porJornada = new Map();
  entradas.forEach((e) => {
    const correo = texto(e.correo).toLowerCase();
    if (!texto(e.nombre)) marcar(e.id, 'nombre', 'Escribe el nombre completo.');
    if (!correo) marcar(e.id, 'correo', 'Escribe el correo electrónico.');
    else if (!FORMA_CORREO.test(correo)) marcar(e.id, 'correo', 'Revisa el correo: debe ser como nombre@correo.com');
    if (!e.isTitular && !texto(e.celular)) marcar(e.id, 'celular', 'Escribe el celular del invitado.');

    if (correo) {
      const clave = `${jornadaDe(e) ?? 'sin-jornada'}|${correo}`;
      porJornada.set(clave, [...(porJornada.get(clave) ?? []), e.id]);
    }
  });

  porJornada.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => marcar(id, 'correo', 'Este correo ya está en otra entrada de la misma jornada.'));
  });

  return errores;
}

export const hayErrores = (errores) => Object.keys(errores).length > 0;

// Campos de una entrada, en el orden de la pantalla. soloInvitado: en tu
// propia entrada el nombre y el correo son los de tu cuenta (no se editan).
export const CAMPOS_ENTRADA = [
  { campo: 'nombre', etiqueta: 'Nombre completo', type: 'text', autoComplete: 'name', placeholder: 'Ej: Ana López', soloInvitado: true },
  { campo: 'correo', etiqueta: 'Correo electrónico', type: 'email', autoComplete: 'email', placeholder: 'Para enviar su acceso', soloInvitado: true },
  { campo: 'celular', etiqueta: 'Celular (WhatsApp)', type: 'tel', inputMode: 'numeric', autoComplete: 'tel-national', placeholder: 'Ej: 71234567' },
];

export const idCampoEntrada = (prefijo, campo, entradaId) => `${prefijo}-${campo}-${entradaId}`;

// Lleva el foco al primer campo con error (en el orden de la pantalla).
export function enfocarPrimerError(entradas, errores, prefijo) {
  const primera = entradas.find((e) => errores[e.id]);
  if (!primera) return;
  const { campo } = CAMPOS_ENTRADA.find((c) => errores[primera.id][c.campo]);
  document.getElementById(idCampoEntrada(prefijo, campo, primera.id))?.focus();
}
