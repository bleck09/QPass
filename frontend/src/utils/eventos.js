// Evento vence cuando fechaFin ya pasó.
export const esVigente = (evento) => new Date(evento.fechaFin) >= new Date();

// Estado "de cara al operador", derivado de fechas + flags del backend:
//  - archivado  : Evento.archivadoEn != null  -> cierre definitivo, solo lectura
//  - finalizado : Evento.estado === 'finalizado' (cron/cierre manual), o ya pasó fechaFin
//  - en_curso   : ya empezó (ahora >= fecha) y todavía no terminó
//  - proximo    : todavía no empieza
export const ESTADO_EVENTO = {
  proximo:    { label: 'Próximo',    clase: 'ev-proximo' },
  en_curso:   { label: 'En curso',   clase: 'ev-en-curso' },
  finalizado: { label: 'Finalizado', clase: 'ev-finalizado' },
  archivado:  { label: 'Archivado',  clase: 'ev-archivado' },
};

export function estadoEvento(evento) {
  if (!evento) return 'proximo';
  if (evento.archivadoEn) return 'archivado';
  const ahora = Date.now();
  if (evento.estado === 'finalizado' || ahora > new Date(evento.fechaFin).getTime()) {
    return 'finalizado';
  }
  if (ahora >= new Date(evento.fecha).getTime()) return 'en_curso';
  return 'proximo';
}

// Evento.imagen es opcional — Admin puede crear un evento sin subir ninguna. Sin esto, cualquier
// <img>/backgroundImage con evento.imagen vacío se ve rota/en blanco.
export const IMAGEN_EVENTO_PLACEHOLDER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
export const imagenEvento = (evento) => evento?.imagen || IMAGEN_EVENTO_PLACEHOLDER;

// evento.fecha ahora es un DateTime real (no un string ya formateado), así que hay que
// formatearlo para mostrarlo en la UI.
export const formatearFecha = (fechaISO, conHora = true) => {
  if (!fechaISO) return '';
  const fecha = new Date(fechaISO);
  const opciones = conHora
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return fecha.toLocaleString('es-BO', opciones);
};
