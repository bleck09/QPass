import QRCode from 'qrcode';
import { zipSync, strToU8 } from 'fflate';
import { ETIQUETA, aNombreArchivo } from './qrPdf';

/* ============================================================================
   Exporta las manillas como SVG vectorial (no bitmap) para cortar/grabar
   directo en LightBurn: nada de "Trace Image" ni de tipear el código a mano
   en Tools > Create QR Code.

   Por color, para que LightBurn arme las capas solo al importar:
   - rojo  (COLOR_CORTE)  = troquel + ranuras -> capa de Corte.
   - negro (COLOR_GRABADO)= el QR             -> capa de Grabado/Fill.
   - gris  (COLOR_REFERENCIA) = texto de referencia (no se graba: es solo para
     ubicar la manilla mientras la hoja está entera); queda en su propia capa
     así se puede apagar la salida de esa capa antes de correr el trabajo.

   El QR no se dibuja con QRCode.toDataURL (eso es lo que genera el bitmap que
   LightBurn ve como un bloque negro con ruido): se usa QRCode.create(), que
   da la matriz de módulos, y se arma un <path> con rectángulos reales, uno
   por corrida de módulos oscuros en cada fila.
   ========================================================================= */

const MM_POR_CM = 10;
// Mismas medidas que el troquel del PDF (qrPdf.js), pasadas de cm a mm: LightBurn
// trabaja internamente en mm sin importar la unidad que tengas elegida en la UI.
const E = Object.fromEntries(
  Object.entries(ETIQUETA).map(([k, v]) => [k, v * MM_POR_CM]),
);

const COLOR_CORTE = '#ff0000';
const COLOR_GRABADO = '#000000';
const COLOR_REFERENCIA = '#999999';

// Cada hoja (un .svg) mide como una plancha del material: hoy A4, en mm.
const HOJA_ANCHO = 210;
const HOJA_ALTO = 297;
const MARGEN_HOJA = 10;

// Igual que margin:1 en QRCode.toDataURL del PDF: una fila de "silencio" alrededor.
const MARGEN_MODULOS = 1;

const redondear = (n) => Math.round(n * 1000) / 1000;

/** Path con un rect por cada corrida horizontal de módulos oscuros (bastante
 * más liviano que un rect por módulo, y LightBurn lo importa como una sola
 * forma en vez de cientos). */
const pathQr = (codigo, ladoMm) => {
  const { modules } = QRCode.create(codigo, { errorCorrectionLevel: 'M' });
  const size = modules.size;
  const total = size + MARGEN_MODULOS * 2;
  const m = ladoMm / total;
  let d = '';
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!modules.get(row, col)) { col++; continue; }
      const inicio = col;
      while (col < size && modules.get(row, col)) col++;
      const anchoRect = (col - inicio) * m;
      const x = (inicio + MARGEN_MODULOS) * m;
      const y = (row + MARGEN_MODULOS) * m;
      d += `M${redondear(x)} ${redondear(y)}h${redondear(anchoRect)}v${redondear(m)}h${redondear(-anchoRect)}z`;
    }
  }
  return d;
};

/** Una etiqueta (troquel + ranuras + QR + texto de referencia) como fragmento SVG. */
const tarjetaSvg = (x, y, codigo) => {
  const { ancho, alto, radio, qrAncho, qrAlto, aberturaLargo, aberturaGrosor, textoFuera } = E;
  const offsetX = x + (ancho - qrAncho) / 2;
  const offsetY = y + (alto - qrAlto) / 2;
  const margenVertical = (alto - qrAlto) / 2;
  const aberturaX = x + (ancho - aberturaLargo) / 2;
  const centroArriba = y + margenVertical / 2;
  const centroAbajo = y + alto - margenVertical / 2;

  const ranura = (centro) => `<rect x="${redondear(aberturaX)}" y="${redondear(centro - aberturaGrosor / 2)}" `
    + `width="${redondear(aberturaLargo)}" height="${redondear(aberturaGrosor)}" `
    + `rx="${redondear(aberturaGrosor / 2)}" ry="${redondear(aberturaGrosor / 2)}" `
    + `fill="none" stroke="${COLOR_CORTE}" stroke-width="0.1"/>`;

  const corte = `<rect x="${redondear(x)}" y="${redondear(y)}" width="${redondear(ancho)}" height="${redondear(alto)}" `
    + `rx="${redondear(radio)}" ry="${redondear(radio)}" fill="none" stroke="${COLOR_CORTE}" stroke-width="0.1"/>`
    + ranura(centroArriba) + ranura(centroAbajo);

  const qr = `<path transform="translate(${redondear(offsetX)},${redondear(offsetY)})" `
    + `d="${pathQr(codigo, qrAncho)}" fill="${COLOR_GRABADO}" stroke="none"/>`;

  const texto = `<text x="${redondear(x + ancho / 2)}" y="${redondear(y + alto + textoFuera * 0.7)}" `
    + `text-anchor="middle" font-size="2.2" fill="${COLOR_REFERENCIA}">${codigo}</text>`;

  return corte + qr + texto;
};

const envolverHoja = (cuerpo) => `<?xml version="1.0" encoding="UTF-8"?>
`
  + `<svg xmlns="http://www.w3.org/2000/svg" width="${HOJA_ANCHO}mm" height="${HOJA_ALTO}mm" `
  + `viewBox="0 0 ${HOJA_ANCHO} ${HOJA_ALTO}">
${cuerpo}
</svg>`;

/**
 * Arma una hoja por cada tanda de etiquetas que entra, imponiéndolas en
 * grilla igual que el PDF. Devuelve un array de strings SVG (una hoja = un
 * archivo = una plancha en la láser). Cede el hilo cada cierta cantidad para
 * no congelar la pestaña con lotes grandes.
 */
export const construirSvgsQr = async (codigos, onProgreso) => {
  const pasoX = E.ancho + E.separacion;
  const altoFila = E.alto + E.textoFuera;
  const pasoY = altoFila + E.separacion;

  const hojas = [];
  let cuerpo = '';
  let x = MARGEN_HOJA;
  let y = MARGEN_HOJA;

  for (let i = 0; i < codigos.length; i++) {
    if (x + E.ancho > HOJA_ANCHO - MARGEN_HOJA) {
      x = MARGEN_HOJA;
      y += pasoY;
    }
    if (y + altoFila > HOJA_ALTO - MARGEN_HOJA) {
      hojas.push(envolverHoja(cuerpo));
      cuerpo = '';
      x = MARGEN_HOJA;
      y = MARGEN_HOJA;
    }

    cuerpo += tarjetaSvg(x, y, codigos[i].codigo);
    x += pasoX;

    onProgreso?.(i + 1, codigos.length);
    if (i % 25 === 24) await new Promise((r) => setTimeout(r, 0));
  }
  if (cuerpo) hojas.push(envolverHoja(cuerpo));

  return hojas;
};

/**
 * Arma las hojas y baja UN solo `<evento>-qr.zip` que, al descomprimirlo, deja
 * la carpeta `<evento>-qr/` con `hoja-01.svg`, `hoja-02.svg`… Cada hoja se abre
 * en LightBurn (File > Import) con el troquel, las ranuras y el QR ya
 * vectoriales, en sus capas por color: se corta una, se cambia la plancha y se
 * abre la siguiente, sin mover nada a mano.
 *
 * Una sola descarga por clic: antes salía un .svg por hoja con varios
 * `a.click()` seguidos, y el navegador los bloqueaba como "descargas
 * múltiples" (y desde ahí no dejaba bajar nada más).
 */
export const descargarSvgsQr = async (codigos, onProgreso, evento) => {
  const hojas = await construirSvgsQr(codigos, onProgreso);
  const carpeta = `${aNombreArchivo(evento?.nombre)}-qr`;
  const archivos = Object.fromEntries(
    hojas.map((svg, i) => [`${carpeta}/hoja-${String(i + 1).padStart(2, '0')}.svg`, strToU8(svg)]),
  );

  const url = URL.createObjectURL(new Blob([zipSync(archivos, { level: 6 })], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${carpeta}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return hojas.length;
};
