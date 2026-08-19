// --- MAPA DEL RECINTO POR EVENTO ---
// La clave global `pi_mapa_puestos` es la que lee App.jsx (landing pública /evento,
// no se toca). Para el primer evento del catálogo (el que hoy es "el" evento público),
// se hereda su valor actual y se mantiene espejado en cada guardado, para que /evento
// siga reflejando en vivo las ediciones del mapa exactamente como hoy. Otros eventos
// (nuevos) parten de un plano vacío e independiente.
import { leerEventos } from './eventosAdmin';

export const CLAVE_MAPA_GLOBAL = 'pi_mapa_puestos';
const claveEvento = (eventoId) => `pi_mapa_puestos__${eventoId}`;
const primerEventoId = () => leerEventos()[0]?.id;

export const leerPuestos = (eventoId, seedFallback) => {
  const guardadoEvento = localStorage.getItem(claveEvento(eventoId));
  if (guardadoEvento) return JSON.parse(guardadoEvento);

  if (eventoId === primerEventoId()) {
    const guardadoGlobal = localStorage.getItem(CLAVE_MAPA_GLOBAL);
    const semilla = guardadoGlobal ? JSON.parse(guardadoGlobal) : seedFallback;
    localStorage.setItem(claveEvento(eventoId), JSON.stringify(semilla));
    return semilla;
  }
  return [];
};

export const guardarPuestos = (eventoId, lista) => {
  localStorage.setItem(claveEvento(eventoId), JSON.stringify(lista));
  if (eventoId === primerEventoId()) {
    localStorage.setItem(CLAVE_MAPA_GLOBAL, JSON.stringify(lista));
  }
};
