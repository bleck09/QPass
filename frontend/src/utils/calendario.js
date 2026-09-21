// "Agregar al calendario" para la página pública de un evento: link directo a
// Google Calendar y archivo .ics (Apple, Outlook y el resto de calendarios).

/** Fecha en formato UTC compacto de iCalendar: 20260215T230000Z. */
const aUtcCompacto = (fecha) => new Date(fecha).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Si el evento no trae fin, se asume una duración de 4 h para que el
// calendario no lo cree como un evento de "0 minutos".
const finDe = (evento) => evento.fechaFin || new Date(new Date(evento.fecha).getTime() + 4 * 3600e3);

export function urlGoogleCalendar(evento, url) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: evento.nombre,
    dates: `${aUtcCompacto(evento.fecha)}/${aUtcCompacto(finDe(evento))}`,
    location: evento.lugar || '',
    details: `Entradas y más información: ${url}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Escapa texto para un campo de iCalendar (RFC 5545 §3.3.11). */
const escaparIcs = (texto = '') => String(texto).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export function descargarIcs(evento, url) {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QPass//Eventos//ES',
    'BEGIN:VEVENT',
    `UID:${evento.id}@qpass`,
    `DTSTAMP:${aUtcCompacto(new Date())}`,
    `DTSTART:${aUtcCompacto(evento.fecha)}`,
    `DTEND:${aUtcCompacto(finDe(evento))}`,
    `SUMMARY:${escaparIcs(evento.nombre)}`,
    `LOCATION:${escaparIcs(evento.lugar)}`,
    `DESCRIPTION:${escaparIcs(`Entradas y más información: ${url}`)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `${evento.nombre.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.ics`;
  enlace.click();
  // Se libera después: revocar en el mismo tick puede cortar la descarga.
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}
