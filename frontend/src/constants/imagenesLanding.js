// Fotos de la landing (secciones informativas y fondos).
//
// Son fotos de stock de Unsplash (licencia libre) descargadas a
// assets/landing: así la página no depende de un CDN externo. Están todas
// acá para poder cambiarlas por fotos propias de eventos QPass sin tocar los
// componentes.
import celularConcierto from '../assets/landing/celular-concierto.jpg';
import publicoManos from '../assets/landing/publico-manos.jpg';
import cobroMostrador from '../assets/landing/cobro-mostrador.jpg';
import foodTruck from '../assets/landing/food-truck.jpg';
import brindis from '../assets/landing/brindis.jpg';
import confeti from '../assets/landing/confeti.jpg';
import escenario from '../assets/landing/escenario.jpg';
import fondoConcierto from '../assets/landing/fondo-concierto.jpg';
import fondoBengalas from '../assets/landing/fondo-bengalas.jpg';
import fondoEquipoLaptops from '../assets/landing/fondo-equipo-laptops.jpg';
import fondoTunelNeon from '../assets/landing/fondo-tunel-neon.jpg';

export const IMAGENES_LANDING = {
  celularConcierto,
  publicoManos,
  cobroMostrador,
  foodTruck,
  brindis,
  confeti,
  escenario,
};

// Fondos de la landing: van cambiando según la sección que se está leyendo
// (ver FondoLanding.jsx). `null` = fondo sin foto (aurora de marca).
// La foto de concierto abre y cierra la página (hero y contacto/pie).
// Las del medio son a propósito de TEMA y COLOR distintos: al 25% de opacidad
// sobre azul noche, cuatro fotos de "público en un concierto" se veían iguales.
export const FONDOS_LANDING = {
  inicio: fondoConcierto,
  servicios: null,
  asistentes: fondoBengalas,        // bengalas, tonos ámbar
  organizadores: fondoEquipoLaptops, // equipo planificando con laptops
  pasados: fondoTunelNeon,          // túnel de luces neón rosa
  contacto: fondoConcierto,
};
