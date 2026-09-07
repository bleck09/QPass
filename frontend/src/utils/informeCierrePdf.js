import jsPDF from 'jspdf';

// Informe de cierre de un evento, de cara al cliente organizador (spec §2.3).
// Una sola hoja A4, sin datos personales de asistentes. Recibe el payload de
// api.dashboard.clienteEvento(id) más el nombre del evento.

const bs = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const pct = (frac) => `${(Number(frac || 0) * 100).toFixed(1)} %`;
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-BO') : '—');

export function exportarInformeCierre(nombreEvento, data) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 48; // margen
  const ancho = doc.internal.pageSize.getWidth();
  let y = M;

  const titulo = (txt, size = 13) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(20, 24, 45);
    doc.text(txt, M, y);
    y += size + 8;
  };
  const fila = (etiqueta, valor) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 66, 82);
    doc.text(etiqueta, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 24, 45);
    doc.text(String(valor), ancho - M, y, { align: 'right' });
    y += 18;
  };
  const separador = () => {
    doc.setDrawColor(220, 224, 232);
    doc.line(M, y, ancho - M, y);
    y += 16;
  };
  const tabla = (headers, filas, anchos) => {
    const xs = [];
    let acc = M;
    anchos.forEach((w) => { xs.push(acc); acc += w * (ancho - 2 * M); });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(110, 118, 132);
    headers.forEach((h, i) => {
      const alignRight = i > 0;
      doc.text(h, alignRight ? xs[i] + anchos[i] * (ancho - 2 * M) - 4 : xs[i], y, alignRight ? { align: 'right' } : undefined);
    });
    y += 6;
    doc.setDrawColor(220, 224, 232);
    doc.line(M, y, ancho - M, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(40, 46, 62);
    filas.forEach((r) => {
      r.forEach((celda, i) => {
        const alignRight = i > 0;
        doc.text(String(celda), alignRight ? xs[i] + anchos[i] * (ancho - 2 * M) - 4 : xs[i], y, alignRight ? { align: 'right' } : undefined);
      });
      y += 16;
    });
    y += 8;
  };

  // --- Cabecera ---
  titulo('Informe de cierre', 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(40, 46, 62);
  doc.text(nombreEvento || 'Evento', M, y);
  y += 16;
  doc.setFontSize(9);
  doc.setTextColor(110, 118, 132);
  doc.text(
    `${fecha(data.evento?.fecha)} – ${fecha(data.evento?.fechaFin)}   ·   generado el ${new Date().toLocaleString('es-BO')}`,
    M,
    y,
  );
  y += 22;
  separador();

  // --- Resumen ---
  const v = data.venta || {};
  const o = data.operacion || {};
  titulo('Resumen');
  fila('Entradas confirmadas / cupo', `${v.confirmadasTotal ?? 0} / ${v.cupoTotal ?? 0}   (${pct(v.ocupacion)})`);
  fila('Compras pendientes de aprobación', v.reservadasPendientes ?? 0);
  fila('Recaudado por entradas', bs(v.recaudado));
  fila('Asistieron / confirmadas', `${o.asistieron ?? 0} / ${v.confirmadasTotal ?? 0}   (${pct(o.tasaAsistencia)})`);
  fila('Consumo total en el evento', bs(o.consumoTotal));
  fila('Consumo promedio por asistente', bs(o.consumoPromedio));
  y += 6;
  separador();

  // --- Por categoría ---
  if ((v.porCategoria || []).length) {
    titulo('Ventas por categoría');
    tabla(
      ['Categoría', 'Vendidas / Cupo', 'Precio', 'Ingreso'],
      v.porCategoria.map((c) => [c.nombre, `${c.confirmadas} / ${c.cupo}`, bs(c.precio), bs(c.ingreso)]),
      [0.4, 0.24, 0.16, 0.2],
    );
  }

  // --- Top puestos ---
  if ((o.topPuestos || []).length) {
    titulo('Puestos por ventas');
    tabla(
      ['Puesto', 'Ventas', 'Ingresos'],
      o.topPuestos.map((p) => [p.nombre, p.ventas, bs(p.ingresos)]),
      [0.56, 0.2, 0.24],
    );
  }

  // --- Pie ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 156, 170);
  doc.text('Generado por QPass', M, doc.internal.pageSize.getHeight() - 28);

  const slug = (nombreEvento || 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`informe-cierre-${slug}.pdf`);
}
