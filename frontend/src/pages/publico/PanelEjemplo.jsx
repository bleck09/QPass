import { FaTicketAlt, FaMoneyBillWave, FaWallet, FaShoppingBag, FaStore } from 'react-icons/fa';
import { useRevelar } from '../../utils/useRevelar.js';
import { useContador } from '../../utils/useContador.js';
import './PanelEjemplo.css';

// Todo es de EJEMPLO (la maqueta lo dice en pantalla): muestra qué tipo de
// dato ve el organizador, no cifras reales de QPass.
const KPIS = [
  { icono: FaTicketAlt, etiqueta: 'Entradas vendidas', valor: 1248, sufijo: ' / 1.500' },
  { icono: FaMoneyBillWave, etiqueta: 'Ingresos por entradas', valor: 124800, prefijo: 'Bs ' },
  { icono: FaWallet, etiqueta: 'Recargas en el evento', valor: 42300, prefijo: 'Bs ' },
  { icono: FaShoppingBag, etiqueta: 'Consumos en puestos', valor: 36950, prefijo: 'Bs ' },
];

const VENTAS_SEMANA = [
  { etiqueta: 'Sem 1', valor: 96 },
  { etiqueta: 'Sem 2', valor: 142 },
  { etiqueta: 'Sem 3', valor: 188 },
  { etiqueta: 'Sem 4', valor: 231 },
  { etiqueta: 'Sem 5', valor: 305 },
  { etiqueta: 'Sem 6', valor: 286 },
];

const TOP_PUESTOS = [
  { nombre: 'Bar Central', valor: 9840 },
  { nombre: 'Hamburguesas La Esquina', valor: 7210 },
  { nombre: 'Merch Oficial', valor: 4560 },
];

const numero = new Intl.NumberFormat('es-BO');

function Kpi({ icono: Icono, etiqueta, valor, prefijo = '', sufijo = '', activo, marca }) {
  const actual = useContador(valor, activo);
  return (
    <div className="qp-panel__kpi">
      {marca && <span className="qp-panel__marca" aria-hidden="true">{marca}</span>}
      <span className="qp-panel__kpi-etq"><Icono aria-hidden="true" /> {etiqueta}</span>
      <strong>{prefijo}{numero.format(actual)}<small>{sufijo}</small></strong>
    </div>
  );
}

/**
 * Maqueta del panel del organizador para la landing. Los números (1, 2, 3)
 * que flotan sobre la maqueta se corresponden con la explicación que la
 * acompaña en OrganizadoresSection.
 */
export default function PanelEjemplo() {
  const [ref, visible] = useRevelar();
  const maxSemana = Math.max(...VENTAS_SEMANA.map((v) => v.valor));
  const maxPuesto = TOP_PUESTOS[0].valor;

  return (
    <figure ref={ref} className={`qp-panel${visible ? ' es-visible' : ''}`} aria-label="Ejemplo del panel del organizador">
      <div className="qp-panel__barra">
        <span className="qp-panel__puntos" aria-hidden="true"><i /><i /><i /></span>
        <span className="qp-panel__titulo">Festival de Ejemplo · Panel del organizador</span>
        <span className="qp-panel__vivo"><i aria-hidden="true" /> En vivo</span>
      </div>

      <div className="qp-panel__cuerpo">
        <div className="qp-panel__kpis">
          {KPIS.map((k, i) => (
            <Kpi key={k.etiqueta} {...k} activo={visible} marca={i === 0 ? '1' : null} />
          ))}
        </div>

        <div className="qp-panel__graficos">
          <div className="qp-panel__tarjeta">
            <span className="qp-panel__marca" aria-hidden="true">2</span>
            <span className="qp-panel__sub">Entradas vendidas por semana</span>
            <div className="qp-panel__columnas" role="list">
              {VENTAS_SEMANA.map((s, i) => (
                <div
                  key={s.etiqueta}
                  role="listitem"
                  tabIndex={0}
                  className="qp-panel__col"
                  style={{ '--alto': `${(s.valor / maxSemana) * 100}%`, '--i': i }}
                  aria-label={`${s.etiqueta}: ${s.valor} entradas`}
                >
                  <span className="qp-panel__tip">{s.valor}</span>
                  <span className="qp-panel__col-barra" />
                  <span className="qp-panel__col-etq">{s.etiqueta}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="qp-panel__tarjeta">
            <span className="qp-panel__marca" aria-hidden="true">3</span>
            <span className="qp-panel__sub"><FaStore aria-hidden="true" /> Top puestos por ventas</span>
            <ol className="qp-panel__ranking">
              {TOP_PUESTOS.map((p, i) => (
                <li key={p.nombre} style={{ '--ancho': `${(p.valor / maxPuesto) * 100}%`, '--i': i }}>
                  <span className="qp-panel__rank-fila">
                    <span>{p.nombre}</span>
                    <b>Bs {numero.format(p.valor)}</b>
                  </span>
                  <span className="qp-panel__rank-pista"><span /></span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <figcaption className="qp-panel__nota">Datos de ejemplo</figcaption>
    </figure>
  );
}
