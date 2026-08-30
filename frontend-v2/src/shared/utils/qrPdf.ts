/* ============================================================================
 * Genera un PDF con los códigos QR de un evento, en cuadrícula, listo para
 * imprimir y recortar. Usa qrcode (data URL) + jsPDF.
 * ========================================================================= */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface CodigoImprimible {
  codigo: string;
  numero: number;
}

const MARGEN = 10; // mm
const COLS = 4;
const FILAS = 5;

export async function descargarQrPdf(
  codigos: CodigoImprimible[],
  nombreEvento: string,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const celdaW = (ancho - 2 * MARGEN) / COLS;
  const celdaH = (alto - 2 * MARGEN) / FILAS;
  const porPagina = COLS * FILAS;

  for (let i = 0; i < codigos.length; i++) {
    if (i > 0 && i % porPagina === 0) doc.addPage();
    const enPagina = i % porPagina;
    const col = enPagina % COLS;
    const fila = Math.floor(enPagina / COLS);
    const x = MARGEN + col * celdaW;
    const y = MARGEN + fila * celdaH;

    const dataUrl = await QRCode.toDataURL(codigos[i].codigo, {
      margin: 1,
      width: 300,
    });
    const qrLado = Math.min(celdaW, celdaH) - 12;
    doc.addImage(dataUrl, 'PNG', x + (celdaW - qrLado) / 2, y + 2, qrLado, qrLado);
    doc.setFontSize(8);
    doc.text(codigos[i].codigo, x + celdaW / 2, y + celdaH - 5, { align: 'center' });
  }

  doc.save(`QR-${nombreEvento.replace(/[^\w-]+/g, '_')}.pdf`);
}
