import QRCode from 'qrcode';
import jsPDF from 'jspdf';

// 96px = 1 pulgada: la misma referencia que usa el formulario para convertir cm -> px.
const PX_POR_CM = 96 / 2.54;

/* ============================================================================
   MEDIDAS DE LA ETIQUETA (en cm) — todo el troquel sale de acá.
   La manilla es una tarjeta con dos ranuras (arriba y abajo) por donde pasa
   la tela que la sujeta a la muñeca.
   ============================================================================ */
// Manilla de 2.4 x 3 cm: QR cuadrado de 2 x 2 cm y TODO el material de 0.2 cm.
//   A lo ancho: 0.2 + QR 2 + 0.2 = 2.4  (y la ranura: 0.2 + 2.0 + 0.2)
//   A lo alto:  0.2 + ranura 0.1 + 0.2 + QR 2 + 0.2 + ranura 0.1 + 0.2 = 3
// Antes era 3 x 5 cm con el QR estirado a 2 x 3 (menos legible y ocupaba casi
// el doble de hoja).
export const ETIQUETA = {
  ancho: 2.4,
  alto: 3,
  radio: 0.3,        // esquinas redondeadas
  qrAncho: 2,        // QR cuadrado: igual ancho que alto
  qrAlto: 2,
  aberturaLargo: 2,     // lo que mide la ranura a lo largo (deja 0.2 cm de material a cada lado)
  aberturaGrosor: 0.1,  // lo que mide de lado a lado: pasa una sola tela fina
  separacion: 0.3,      // aire entre etiquetas al imponerlas en la hoja
  textoFuera: 0.5,      // franja debajo del troquel donde se imprime el codigo
};

// Dibuja el QR en el propio navegador (sin red) y devuelve un data URL PNG.
export const generarDataUrlQr = (qr) => QRCode.toDataURL(qr.codigo, {
  width: Math.max(qr.ancho || 180, qr.alto || 180),
  margin: 1,
});

/** Nombre de archivo legible: sin acentos ni signos raros, y acotado. */
const aNombreArchivo = (texto) => (texto || 'evento')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita tildes
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase()
  .slice(0, 40) || 'evento';

/**
 * Dibuja UNA etiqueta con su troquel en (x, y).
 *
 * El QR (cuadrado, ETIQUETA.qrAncho x qrAlto) va centrado. El codigo en texto
 * va FUERA del troquel (debajo), asi la pulsera ya cortada queda limpia y el
 * texto solo sirve como referencia en la hoja impresa.
 */
const dibujarEtiqueta = (doc, x, y, dataUrl, codigo) => {
  const { ancho, alto, radio, qrAncho, qrAlto, aberturaLargo, aberturaGrosor } = ETIQUETA;

  // Contorno de corte.
  doc.setDrawColor(150);
  doc.setLineWidth(0.02);
  doc.roundedRect(x, y, ancho, alto, radio, radio, 'S');

  // El QR es lo unico que va DENTRO del troquel, centrado. Es cuadrado: con un
  // QR chico, estirarlo (como antes, 2 x 3) hace que algunos lectores fallen.
  doc.addImage(
    dataUrl, 'PNG',
    x + (ancho - qrAncho) / 2,
    y + (alto - qrAlto) / 2,
    qrAncho, qrAlto,
  );

  // El codigo va FUERA del troquel, en la franja de abajo: sirve para ubicar
  // la manilla mientras la hoja esta entera, pero al cortar no queda impreso
  // en la pulsera.
  doc.setFontSize(7);
  doc.setTextColor(90);
  doc.text(codigo, x + ancho / 2, y + alto + 0.33, {
    align: 'center',
    maxWidth: ancho,
  });

  // Aberturas para la tela, ARRIBA y ABAJO (no en los laterales): a los lados
  // el QR deja solo 0.2 cm de margen, no entra una ranura. Arriba y abajo el
  // margen es de 0.5 cm; la ranura de 0.1 va centrada ahi y deja 2 mm de
  // material a cada lado (hacia el QR y hacia el borde).
  const margenVertical = (alto - qrAlto) / 2;
  const aberturaX = x + (ancho - aberturaLargo) / 2;
  const centroArriba = y + margenVertical / 2;
  const centroAbajo = y + alto - margenVertical / 2;

  doc.setDrawColor(90);
  doc.setLineWidth(0.03);
  for (const centro of [centroArriba, centroAbajo]) {
    doc.roundedRect(
      aberturaX,
      centro - aberturaGrosor / 2,
      aberturaLargo,
      aberturaGrosor,
      aberturaGrosor / 2,
      aberturaGrosor / 2,
      'S',
    );
  }
};

/**
 * Arma un único PDF con todas las etiquetas recibidas, imponiéndolas en la hoja.
 * Procesa de a una y cede el hilo cada cierta cantidad para no congelar la
 * pestaña con lotes grandes (miles de códigos), y avisa el progreso mediante
 * onProgreso(actual, total) para poder mostrarlo en la UI.
 *
 * `evento` (opcional: { nombre }) solo se usa para nombrar el archivo.
 */
export const construirPdfQr = async (codigos, onProgreso, evento) => {
  // compress: true activa FlateEncode para las imágenes embebidas. Sin esto, jsPDF
  // guarda cada QR sin comprimir (bitmap crudo), y con miles de códigos el PDF se
  // vuelve gigante (cientos de MB) aunque cada QR individual sea un PNG chico.
  const doc = new jsPDF({ unit: 'cm', compress: true });
  const margen = 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const pasoX = ETIQUETA.ancho + ETIQUETA.separacion;
  // El codigo se imprime debajo del troquel, asi que la fila ocupa el alto de
  // la etiqueta MAS esa franja.
  const altoFila = ETIQUETA.alto + ETIQUETA.textoFuera;
  const pasoY = altoFila + ETIQUETA.separacion;

  let x = margen;
  let y = margen;

  for (let i = 0; i < codigos.length; i++) {
    const qr = codigos[i];

    if (x + ETIQUETA.ancho > pageWidth - margen) {
      x = margen;
      y += pasoY;
    }
    if (y + altoFila > pageHeight - margen) {
      doc.addPage();
      x = margen;
      y = margen;
    }

    const dataUrl = await generarDataUrlQr(qr);
    dibujarEtiqueta(doc, x, y, dataUrl, qr.codigo);

    x += pasoX;

    onProgreso?.(i + 1, codigos.length);
    if (i % 25 === 24) await new Promise((r) => setTimeout(r, 0));
  }

  // Nombre con fecha y evento en vez de un timestamp: en una carpeta con varias
  // tandas, `codigos-qr-1731...pdf` no dice de que evento es ninguna.
  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  doc.save(`qr-${aNombreArchivo(evento?.nombre)}-${fecha}.pdf`);
};

export { PX_POR_CM };
