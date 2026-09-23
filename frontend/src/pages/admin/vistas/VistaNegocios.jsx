import { FaTrophy, FaExchangeAlt, FaCoins, FaShoppingBag, FaListUl } from 'react-icons/fa';
import Tabla from '../../../components/Tabla.jsx';
import Boton from '../../../components/Boton.jsx';
import Insignia from '../../../components/Insignia.jsx';
import Podio from './Podio.jsx';

/*
  Usuarios Negocio del panel de Admin: podio + ventas por negocio + top de
  clientes, y al abrir un negocio, sus ventas (con anular, §5.3).
*/
export default function VistaNegocios({
  negocioAbierto,
  negocios,
  topClientes,
  totalConsumoClientes,
  soloLectura,
  onAbrir,
  onVerVenta,
  onAnularVenta,
  onVerCliente,
}) {
  if (negocioAbierto) {
    return (
      <section className="pi-dash-seccion">
        <div className="pi-dash-detalle-header">
          <h3 className="pi-dash-seccion-titulo">{negocioAbierto.nombre}</h3>
          <span className="pi-dash-detalle-total">
            Ventas totales: <strong>{negocioAbierto.ventasTotal} pts</strong> · {negocioAbierto.ayudantes} ayudante(s)
          </span>
        </div>
        <Tabla
          columnas={['Hora', 'Cliente', 'Ayudante', 'Productos', 'Monto', { texto: 'Acciones', srOnly: true }]}
          datos={negocioAbierto.ventas}
          vacio="Este negocio no tiene ventas."
          renderFila={(t, i) => (
            <tr key={t.id || i} className={t.anulada ? 'pi-dash-fila-anulada' : ''}>
              <td>{t.hora}</td>
              <td>{t.cliente}</td>
              <td>{t.ayudante}</td>
              <td>
                <ul className="pi-dash-items-lista">
                  {t.items.map(it => <li key={it.id}><strong>{it.cantidad}×</strong> {it.nombreProducto}</li>)}
                </ul>
              </td>
              <td className="pi-dash-monto-celda">
                <FaShoppingBag color="var(--coral-compra)" aria-hidden="true" /> {t.monto} pts
              </td>
              <td className="td-derecha">
                <div className="btn-acciones">
                  <Boton variante="secundario" tamano="sm" onClick={() => onVerVenta(t)}>Detalle</Boton>
                  {t.anulada
                    ? <Insignia tono="danger">Anulada</Insignia>
                    : !soloLectura && (
                      <Boton variante="peligro-suave" tamano="sm" onClick={() => onAnularVenta(t)}>Anular</Boton>
                    )}
                </div>
              </td>
            </tr>
          )}
        />
      </section>
    );
  }

  return (
    <section className="pi-dash-seccion">
      <h3 className="pi-dash-seccion-titulo">Usuarios Negocio</h3>

      <div className="pi-dash-total-destacado">
        <FaCoins color="var(--ok-text)" aria-hidden="true" />
        Consumo total de todos los clientes: <strong>{totalConsumoClientes} pts</strong>
      </div>

      <h4 className="pi-dash-subtitulo">
        <FaTrophy color="var(--coral-compra)" aria-hidden="true" /> Top Negocios por Ventas
      </h4>
      <Podio lista={negocios} valorKey="ventasTotal" unidad="pts" />

      <Tabla
        columnas={['Negocio', 'Ventas Totales', 'Ayudantes Asignados', { texto: 'Acciones', srOnly: true }]}
        datos={negocios}
        vacio="Aún no hay ventas de negocios en este evento."
        renderFila={(n) => (
          <tr key={n.id}>
            <td>{n.nombre}</td>
            <td className="pi-dash-monto-celda">
              <FaShoppingBag color="var(--coral-compra)" aria-hidden="true" /> {n.ventasTotal} pts
            </td>
            <td>{n.ayudantes}</td>
            <td>
              <Boton variante="secundario" tamano="sm" icono={FaExchangeAlt} onClick={() => onAbrir(n.id)}>
                Ver ventas
              </Boton>
            </td>
          </tr>
        )}
      />

      <h4 className="pi-dash-subtitulo pi-dash-subtitulo-espaciado">
        <FaTrophy color="var(--cian-digital)" aria-hidden="true" /> Top Clientes por Consumo
      </h4>
      <Tabla
        columnas={['Cliente', { texto: 'Compras', align: 'center' }, { texto: 'Unidades', align: 'center' }, 'Consumo Total', { texto: 'Acciones', srOnly: true }]}
        datos={topClientes}
        vacio="Aún no hay consumo de clientes en este evento."
        renderFila={(c) => (
          <tr key={c.id}>
            <td>{c.nombre}</td>
            <td className="td-centro">{c.compras}</td>
            <td className="td-centro">{c.unidades}</td>
            <td className="pi-dash-monto-celda">{c.total} pts</td>
            <td>
              <Boton variante="secundario" tamano="sm" icono={FaListUl} onClick={() => onVerCliente(c)}>
                Ver compras
              </Boton>
            </td>
          </tr>
        )}
      />
    </section>
  );
}
