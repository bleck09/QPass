import { FaTrophy, FaExchangeAlt } from 'react-icons/fa';
import Tabla from '../../../components/Tabla.jsx';
import Boton from '../../../components/Boton.jsx';
import Podio from './Podio.jsx';

/*
  Recargadores y Encargados de Devolución son la MISMA pantalla: podio + tabla
  de operadores, y al abrir uno, la lista de sus movimientos. Antes estaban
  copiadas una debajo de la otra en Admin.jsx (PLAN §2.9: nada repetido).

    <VistaOperadores
      titulo="Recargadores" tituloPodio="Top Recargadores"
      lista={recargadoresOrdenados} abierto={recargadorAbierto}
      claveTotal="totalRecargado" claveMovimientos="recargas"
      etiquetaTotal="Total recargado" columnaTotal="Total Recargado"
      textoVer="Ver recargas" vacioLista="Aún no hay recargas en este evento."
      vacioDetalle="Este recargador no tiene recargas."
      icono={FaCoins} colorIcono="var(--ok-text)"
      onAbrir={abrirItem}
    />

  `abierto` es el operador abierto (o null para ver la lista).
*/
export default function VistaOperadores({
  titulo,
  tituloPodio,
  lista,
  abierto,
  claveTotal,
  claveMovimientos,
  etiquetaTotal,
  columnaTotal,
  columnaNombre,
  textoVer,
  vacioLista,
  vacioDetalle,
  icono: Icono,
  colorIcono,
  onAbrir,
}) {
  const monto = (valor) => (
    <span className="pi-dash-monto-celda">
      <Icono color={colorIcono} aria-hidden="true" /> {valor} pts
    </span>
  );

  if (abierto) {
    return (
      <section className="pi-dash-seccion">
        <div className="pi-dash-detalle-header">
          <h3 className="pi-dash-seccion-titulo">{abierto.nombre}</h3>
          <span className="pi-dash-detalle-total">
            {etiquetaTotal}: <strong>{abierto[claveTotal]} pts</strong>
          </span>
        </div>
        <Tabla
          columnas={['Hora', 'Participante', 'Monto']}
          datos={abierto[claveMovimientos]}
          vacio={vacioDetalle}
          renderFila={(t, i) => (
            <tr key={i}>
              <td>{t.hora}</td>
              <td>{t.participante}</td>
              <td>{monto(t.monto)}</td>
            </tr>
          )}
        />
      </section>
    );
  }

  return (
    <section className="pi-dash-seccion">
      <h3 className="pi-dash-seccion-titulo">{titulo}</h3>

      <h4 className="pi-dash-subtitulo">
        <FaTrophy color="var(--coral-compra)" aria-hidden="true" /> {tituloPodio}
      </h4>
      <Podio lista={lista} valorKey={claveTotal} unidad="pts" />

      <Tabla
        columnas={[columnaNombre, columnaTotal, { texto: 'Acciones', srOnly: true }]}
        datos={lista}
        vacio={vacioLista}
        renderFila={(op) => (
          <tr key={op.id}>
            <td>{op.nombre}</td>
            <td>{monto(op[claveTotal])}</td>
            <td>
              <Boton variante="secundario" tamano="sm" icono={FaExchangeAlt} onClick={() => onAbrir(op.id)}>
                {textoVer}
              </Boton>
            </td>
          </tr>
        )}
      />
    </section>
  );
}
