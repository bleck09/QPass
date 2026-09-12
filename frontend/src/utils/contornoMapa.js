/* ============================================================================
 * src/utils/contornoMapa.js
 *
 * El contorno del recinto (Evento.contornoMapa) se dibuja sobre un mapa real
 * en Mapa.jsx ("modo Contorno") y se guarda como vértices geográficos reales
 * [[lat,lng], ...]. Pero el lienzo donde se ubican los Puesto/ElementoMapa
 * (Mapa.jsx "modo Plano" y la landing pública en App.jsx) sigue siendo un
 * plano 2D en px, igual que antes — no queremos recalcular proyecciones
 * geográficas en cada arrastre. `proyectarContorno` hace esa conversión UNA
 * vez, y la comparten ambas pantallas para que dibujen exactamente la misma
 * forma.
 *
 * Es una proyección equirrectangular simple (corrige el achatado este-oeste
 * según la latitud): de sobra para el tamaño de un recinto, no sirve para
 * medir distancias reales.
 * ========================================================================= */

const LADO_MAXIMO = 1000; // px del lado más largo del recinto proyectado
const LADO_MINIMO = 320; // piso para que un contorno muy angosto no colapse
const MARGEN = 40; // aire alrededor de la forma dentro del lienzo

/**
 * `contorno`: [[lat,lng], ...] con al menos 3 vértices (si no, no hay forma
 * válida que proyectar). Devuelve `null` en ese caso — el llamador cae al
 * lienzo por defecto. Si hay forma, devuelve `{ ancho, alto, puntos }` en px,
 * listos para dibujar un `<polygon>` SVG y para dimensionar el contenedor.
 */
export function proyectarContorno(contorno) {
  if (!Array.isArray(contorno) || contorno.length < 3) return null;

  const lats = contorno.map(([lat]) => lat);
  const lngs = contorno.map(([, lng]) => lng);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);
  const latMedia = (latMin + latMax) / 2;
  // A esta latitud, un grado de longitud mide menos metros que uno de
  // latitud — sin esto el contorno saldría estirado horizontalmente.
  const factorEquirect = Math.cos((latMedia * Math.PI) / 180) || 1;

  const anchoCrudo = (lngMax - lngMin) * factorEquirect;
  const altoCrudo = latMax - latMin;
  const ladoMayorCrudo = Math.max(anchoCrudo, altoCrudo) || 1;
  const escala = (LADO_MAXIMO - 2 * MARGEN) / ladoMayorCrudo;

  const puntos = contorno.map(([lat, lng]) => [
    MARGEN + (lng - lngMin) * factorEquirect * escala,
    // El eje Y de pantalla crece hacia abajo; la latitud crece hacia el
    // norte -> se invierte para que el contorno no salga espejado.
    MARGEN + (latMax - lat) * escala,
  ]);

  return {
    ancho: Math.max(LADO_MINIMO, anchoCrudo * escala + 2 * MARGEN),
    alto: Math.max(LADO_MINIMO, altoCrudo * escala + 2 * MARGEN),
    puntos,
  };
}
