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
  const latMedia = (Math.min(...lats) + Math.max(...lats)) / 2;
  // A esta latitud, un grado de longitud mide menos metros que uno de
  // latitud — sin esto el contorno saldría estirado horizontalmente.
  const factorEquirect = Math.cos((latMedia * Math.PI) / 180) || 1;

  // Coordenadas locales "crudas" (proporcionales a metros), todavía con la
  // orientación real que tuvo el contorno al dibujarlo en el mapa (cualquier
  // ángulo del compás — ningún terreno queda perfectamente norte-sur).
  const crudos = contorno.map(([lat, lng]) => [lng * factorEquirect, lat]);

  // Endereza el contorno: gira todo para que su lado más largo quede
  // horizontal. Sin esto, un recinto más o menos rectangular en la realidad
  // se ve como un rombo torcido en el plano, según hacia dónde haya quedado
  // orientado en el mapa real — acá no importa el norte, importa que se vea
  // como un plano normal.
  let mejorAngulo = 0;
  let mejorLargo = -1;
  for (let i = 0; i < crudos.length; i++) {
    const [x1, y1] = crudos[i];
    const [x2, y2] = crudos[(i + 1) % crudos.length];
    const largo = Math.hypot(x2 - x1, y2 - y1);
    if (largo > mejorLargo) {
      mejorLargo = largo;
      mejorAngulo = Math.atan2(y2 - y1, x2 - x1);
    }
  }
  const cos = Math.cos(-mejorAngulo);
  const sin = Math.sin(-mejorAngulo);
  const girados = crudos.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);

  const xs = girados.map(([x]) => x);
  const ys = girados.map(([, y]) => y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const anchoCrudo = xMax - xMin;
  const altoCrudo = yMax - yMin;
  const ladoMayorCrudo = Math.max(anchoCrudo, altoCrudo) || 1;
  const escala = (LADO_MAXIMO - 2 * MARGEN) / ladoMayorCrudo;

  const puntos = girados.map(([x, y]) => [
    MARGEN + (x - xMin) * escala,
    // El eje Y de pantalla crece hacia abajo -> se invierte para que no
    // quede espejado.
    MARGEN + (yMax - y) * escala,
  ]);

  return {
    ancho: Math.max(LADO_MINIMO, anchoCrudo * escala + 2 * MARGEN),
    alto: Math.max(LADO_MINIMO, altoCrudo * escala + 2 * MARGEN),
    puntos,
  };
}
