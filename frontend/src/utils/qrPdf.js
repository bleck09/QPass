import QRCode from 'qrcode';
import jsPDF from 'jspdf';

// 96px = 1 pulgada: la misma referencia que usa el formulario para convertir cm -> px.
const PX_POR_CM = 96 / 2.54;

// Dibuja el QR en el propio navegador (sin red) y devuelve un data URL PNG.
export const generarDataUrlQr = (qr) => QRCode.toDataURL(qr.codigo, {
  width: Math.max(qr.ancho || 180, qr.alto || 180),
  margin: 1,
});

// Arma un único PDF con todos los códigos recibidos. Procesa de a uno y cede el hilo
// cada cierta cantidad para no congelar la pestaña con lotes grandes (miles de códigos),
// y avisa el progreso mediante onProgreso(actual, total) para poder mostrarlo en la UI.
export const construirPdfQr = async (codigos, onProgreso) => {
  // compress: true activa FlateEncode para las imágenes embebidas. Sin esto, jsPDF
  // guarda cada QR sin comprimir (bitmap crudo), y con miles de códigos el PDF se
  // vuelve gigante (cientos de MB) aunque cada QR individual sea un PNG chico.
  const doc = new jsPDF({ unit: 'cm', compress: true });
  const margen = 1;
  const espacioTexto = 0.4;
  const gap = 0.4;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let x = margen;
  let y = margen;
  let alturaFila = 0;

  for (let i = 0; i < codigos.length; i++) {
    const qr = codigos[i];
    const anchoCm = (qr.ancho || 180) / PX_POR_CM;
    const altoCm = (qr.alto || 180) / PX_POR_CM;

    if (x + anchoCm > pageWidth - margen) {
      x = margen;
      y += alturaFila + espacioTexto + gap;
      alturaFila = 0;
    }
    if (y + altoCm + espacioTexto > pageHeight - margen) {
      doc.addPage();
      x = margen;
      y = margen;
      alturaFila = 0;
    }

    const dataUrl = await generarDataUrlQr(qr);
    doc.addImage(dataUrl, 'PNG', x, y, anchoCm, altoCm);
    doc.setFontSize(7);
    doc.text(qr.codigo, x, y + altoCm + 0.3, { maxWidth: anchoCm });

    x += anchoCm + gap;
    alturaFila = Math.max(alturaFila, altoCm);

    onProgreso?.(i + 1, codigos.length);
    if (i % 25 === 24) await new Promise((r) => setTimeout(r, 0));
  }

  doc.save(`codigos-qr-${Date.now()}.pdf`);
};
