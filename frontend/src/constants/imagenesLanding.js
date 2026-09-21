// Fotos de las secciones informativas de la landing (Asistentes / Organizadores).
//
// Son fotos de stock de Unsplash (licencia libre) servidas desde su CDN, igual
// que el fondo de la landing. Están todas acá para poder cambiarlas por fotos
// propias de eventos QPass sin tocar los componentes.
const unsplash = (id, ancho = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${ancho}&q=70`;

export const IMAGENES_LANDING = {
  celularConcierto: unsplash('1501281668745-f7f57925c3b4'),
  publicoManos: unsplash('1540039155733-5bb30b53aa14'),
  cobroMostrador: unsplash('1556742049-0cfed4f6a45d'),
  foodTruck: unsplash('1565123409695-7b5ef63a2efb', 600),
  brindis: unsplash('1541532713592-79a0317b6b77', 600),
  confeti: unsplash('1492684223066-81342ee5ff30', 1600),
  escenario: unsplash('1470229722913-7c0e2dbbafd3', 600),
};

// Fondos de la landing: van cambiando según la sección que se está leyendo
// (ver FondoLanding.jsx). `null` = fondo sin foto (aurora de marca).
// La foto original de concierto abre y cierra la página (hero y contacto/pie).
// Las del medio son a propósito de TEMA y COLOR distintos: al 25% de opacidad
// sobre azul noche, cuatro fotos de "público en un concierto" se veían iguales.
const FOTO_CONCIERTO = 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80';

export const FONDOS_LANDING = {
  inicio: FOTO_CONCIERTO,
  servicios: null,
  asistentes: unsplash('1467810563316-b5476525c0f9', 1920),    // bengalas, tonos ámbar
  organizadores: unsplash('1522202176988-66273c2fd55f', 1920), // equipo planificando con laptops
  pasados: unsplash('1566737236500-c8ac43014a67', 1920),       // túnel de luces neón rosa
  contacto: FOTO_CONCIERTO,
};
