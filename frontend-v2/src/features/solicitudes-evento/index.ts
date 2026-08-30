/* Punto de entrada público de la feature solicitudes-evento. */
export { SolicitudForm } from './components/SolicitudForm';
export { SolicitudCard } from './components/SolicitudCard';
export { SolicitudTabla } from './components/SolicitudTabla';
export { SolicitudDetalle } from './components/SolicitudDetalle';
export { SolicitudEstadoBadge } from './components/SolicitudEstadoBadge';
export {
  useSolicitudes,
  useSolicitud,
  useCrearSolicitud,
  useActualizarSolicitud,
  useAprobarSolicitud,
  useRechazarSolicitud,
  SOLICITUDES_KEYS,
} from './hooks/useSolicitudes';
export type {
  SolicitudEvento,
  EstadoSolicitud,
  CrearSolicitudDto,
  ActualizarSolicitudDto,
  Actividad,
  ItemCronograma,
} from './types/solicitudes.types';
