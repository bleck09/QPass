import type { Evento } from './types/eventos.types';

/** Evento vigente: su fechaFin todavía no pasó. */
export function esVigente(evento: Pick<Evento, 'fechaFin'>): boolean {
  return new Date(evento.fechaFin) >= new Date();
}

/** Evento.imagen es opcional; sin placeholder cualquier <img> se ve rota. */
export const IMAGEN_EVENTO_PLACEHOLDER =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

export function imagenEvento(evento?: Pick<Evento, 'imagen'> | null): string {
  return evento?.imagen || IMAGEN_EVENTO_PLACEHOLDER;
}
