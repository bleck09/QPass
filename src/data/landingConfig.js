// --- CONFIGURACIÓN DE LA LANDING PAGE POR EVENTO ---
// La clave global `pi_landing_config` es la que lee App.jsx (landing pública /evento,
// no se toca). Para el primer evento del catálogo (el que hoy es "el" evento público),
// se hereda su valor actual y se mantiene espejado en cada guardado, para que /evento
// siga reflejando en vivo las ediciones de esta página exactamente como hoy. Otros
// eventos (nuevos) parten de la configuración por defecto, de forma independiente.
import { leerEventos } from './eventosAdmin';

export const CLAVE_LANDING_GLOBAL = 'pi_landing_config';
const claveEvento = (eventoId) => `pi_landing_config__${eventoId}`;
const primerEventoId = () => leerEventos()[0]?.id;

export const leerConfig = (eventoId, seedFallback) => {
  const guardadoEvento = localStorage.getItem(claveEvento(eventoId));
  if (guardadoEvento) return JSON.parse(guardadoEvento);

  if (eventoId === primerEventoId()) {
    const guardadoGlobal = localStorage.getItem(CLAVE_LANDING_GLOBAL);
    const semilla = guardadoGlobal ? JSON.parse(guardadoGlobal) : seedFallback;
    localStorage.setItem(claveEvento(eventoId), JSON.stringify(semilla));
    return semilla;
  }
  return seedFallback;
};

export const guardarConfig = (eventoId, config) => {
  localStorage.setItem(claveEvento(eventoId), JSON.stringify(config));
  if (eventoId === primerEventoId()) {
    localStorage.setItem(CLAVE_LANDING_GLOBAL, JSON.stringify(config));
  }
};
