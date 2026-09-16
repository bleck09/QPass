import Modal from './Modal.jsx';
import './DetalleVentaModal.css';

/*
  Detalle de UNA venta (productos, cantidades, precio unitario, subtotal).
  Compartido por Ayudante (historial), Usuario Negocio (últimas ventas) y Admin
  (dashboard por evento) para que el detalle se vea igual en todos lados.

  Props:
    venta    { fecha, cliente?, documento?, puesto?, ayudante?, anulada?,
               motivoAnulacion?, monto, items: [{ nombreProducto, cantidad, precioUnitario }] }
    fmt      (n) => string   formateador del monto (default "N pts").
    onCerrar () => void
    acciones nodo opcional (botón Anular, etc.) al pie.
*/
const fmtPts = (n) => `${Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })} pts`;

export default function DetalleVentaModal({ venta, fmt = fmtPts, onCerrar, acciones = null }) {
  const items = venta.items || [];
  const unidades = items.reduce((s, i) => s + Number(i.cantidad), 0);
  const fecha = venta.fecha ? new Date(venta.fecha) : null;
  const datos = [
    ['Cliente', venta.cliente],
    ['Documento', venta.documento],
    ['Puesto', venta.puesto],
    ['Ayudante', venta.ayudante],
    ['Fecha', fecha?.toLocaleDateString('es-BO')],
    ['Hora', fecha?.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })],
  ].filter(([, v]) => v != null && v !== '');

  return (
    <Modal titulo="Detalle de venta" onCerrar={onCerrar} tamano="lg">
      <div className="qp-dventa">
        {venta.anulada && (
          <p className="qp-dventa__anulada">
            Venta anulada{venta.motivoAnulacion ? ` — ${venta.motivoAnulacion}` : ''}. No cuenta en los totales.
          </p>
        )}

        <dl className="qp-dventa__datos">
          {datos.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="qp-dventa__scroll">
          <table className="qp-dventa__tabla">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col" className="num">Cantidad</th>
                <th scope="col" className="num">Precio unit.</th>
                <th scope="col" className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="qp-dventa__vacio">Esta venta no tiene productos registrados.</td></tr>
              ) : items.map((i, idx) => (
                <tr key={i.id ?? idx}>
                  <td>{i.nombreProducto}</td>
                  <td className="num"><span className="qp-dventa__cant">× {i.cantidad}</span></td>
                  <td className="num">{fmt(i.precioUnitario)}</td>
                  <td className="num">{fmt(Number(i.precioUnitario) * Number(i.cantidad))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="num">{unidades} {unidades === 1 ? 'unidad' : 'unidades'}</td>
                <td />
                <td className="num qp-dventa__total">{fmt(venta.monto)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {acciones && <div className="qp-dventa__acciones">{acciones}</div>}
      </div>
    </Modal>
  );
}
