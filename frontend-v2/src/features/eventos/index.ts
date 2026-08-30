/* Punto de entrada público de la feature eventos. */
export { EventoCard } from './components/EventoCard';
export { EventoForm } from './components/EventoForm';
export { EventoEstadoBadge } from './components/EventoEstadoBadge';
export { SelectorEvento } from './components/SelectorEvento';
export {
  useEventos,
  useEvento,
  useCrearEvento,
  useActualizarEvento,
  useCerrarEvento,
  EVENTOS_KEYS,
} from './hooks/useEventos';
export type {
  Evento,
  EstadoEvento,
  CrearEventoDto,
  ActualizarEventoDto,
} from './types/eventos.types';
