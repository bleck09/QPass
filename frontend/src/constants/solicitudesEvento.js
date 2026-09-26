import { FaCheckCircle, FaHourglassHalf, FaExclamationTriangle, FaPen } from 'react-icons/fa';

/*
  Estados de una solicitud de evento (enum EstadoSolicitudEvento del backend).
  Único lugar con su etiqueta, tono de Insignia e ícono: lo usan la pantalla
  del cliente (Mi Propuesta) y la bandeja de Admin (Solicitudes de eventos).

  pendiente -> aprobado | rechazado            (finales)
  pendiente -> cambios_solicitados -> pendiente (el cliente corrige y reenvía)
*/
export const ESTADO_SOLICITUD = {
  pendiente: { tono: 'warn', icono: FaHourglassHalf, texto: 'Pendiente', plural: 'Pendientes' },
  cambios_solicitados: { tono: 'info', icono: FaPen, texto: 'Cambios pedidos', plural: 'Esperando cambios' },
  aprobado: { tono: 'ok', icono: FaCheckCircle, texto: 'Aprobada', plural: 'Aprobadas' },
  rechazado: { tono: 'danger', icono: FaExclamationTriangle, texto: 'Rechazada', plural: 'Rechazadas' },
};

// El cliente puede editar (y reenviar) mientras no esté resuelta.
export const solicitudEditable = (estado) => estado === 'pendiente' || estado === 'cambios_solicitados';

// Campos que el backend devuelve pero NO acepta al crear/editar (el DTO los rechaza).
export const CAMPOS_SOLO_LECTURA = [
  'id', 'clienteId', 'estado', 'motivoRechazo', 'eventoId', 'resueltoPorId', 'resueltoEn',
  'createdAt', 'updatedAt', 'comentarioCambios', 'cambiosPedidosEn', 'reenviadaEn',
  'cliente', 'resueltoPor', 'evento',
];

// Se dispara (window) al aprobar / rechazar / pedir cambios: el menú lateral
// vuelve a contar las pendientes sin esperar a cambiar de pantalla.
export const EVENTO_SOLICITUDES_CAMBIARON = 'qpass-solicitudes-evento-cambiaron';

// "hace 3 días" / "hace 5 h" / "recién"
export function haceCuanto(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return min < 2 ? 'recién' : `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

// Duración entre inicio y fin: "6 h", "2 días", "1 día y 4 h".
export function duracionEvento(inicio, fin) {
  const h = Math.round((new Date(fin) - new Date(inicio)) / 3600000);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  const resto = h % 24;
  return `${d} ${d === 1 ? 'día' : 'días'}${resto ? ` y ${resto} h` : ''}`;
}

// Filas con contenido (el formulario deja filas vacías para completar).
export const filasCronograma = (s) => (s.cronograma ?? []).filter((c) => c.hora || c.actividad);
export const filasActividades = (s) => (s.actividades ?? []).filter((a) => a.titulo || a.descripcion);

// Configuración para <VistaPreviaPagina> a partir de una solicitud (o del
// formulario que la está editando).
export function configPreviaDe(s) {
  return {
    titulo: s.nombreEvento,
    informacion: s.descripcion,
    imagen: s.imagenPortada,
    imagenAjuste: s.imagenAjuste ?? null,
    colorPrimario: s.colorPrimario,
    colorBoton: s.colorBoton,
    colorFondo: s.colorFondo,
    colorTextoTitulo: s.colorTextoTitulo,
    colorTextoP: s.colorTextoP,
    actividades: filasActividades(s),
    cronograma: filasCronograma(s),
  };
}
