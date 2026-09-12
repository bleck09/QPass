import { FaDoorOpen, FaRestroom, FaMusic, FaBolt, FaUserShield, FaMapPin } from 'react-icons/fa';

/**
 * Catálogo fijo de tipos de ElementoMapa (cuadros del plano que NO son un
 * negocio — ver Puesto). Lo comparten Mapa.jsx (Admin, crea/edita) y la
 * landing pública del evento (solo lectura), para que ícono/etiqueta salgan
 * siempre iguales en los dos lados.
 */
export const TIPOS_ELEMENTO_MAPA = [
  { valor: 'entrada', etiqueta: 'Entrada', Icono: FaDoorOpen },
  { valor: 'banos', etiqueta: 'Baños', Icono: FaRestroom },
  { valor: 'escenario', etiqueta: 'Escenario', Icono: FaMusic },
  { valor: 'recargador', etiqueta: 'Recargador', Icono: FaBolt },
  { valor: 'supervisor', etiqueta: 'Supervisor', Icono: FaUserShield },
  { valor: 'otro', etiqueta: 'Otro', Icono: FaMapPin },
];

export function tipoElementoInfo(tipo) {
  return TIPOS_ELEMENTO_MAPA.find((t) => t.valor === tipo) ?? TIPOS_ELEMENTO_MAPA[TIPOS_ELEMENTO_MAPA.length - 1];
}
