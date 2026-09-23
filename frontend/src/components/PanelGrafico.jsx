import { useState } from 'react';
import { FaChartArea, FaTable, FaChartBar } from 'react-icons/fa';
import Tabla from './Tabla.jsx';
import Pestanas from './Pestanas.jsx';
import { EstadoVacio } from './EstadosAsync.jsx';
import './PanelGrafico.css';

/*
  Marco de un gráfico con su alternativa en tabla (accesible: quien no puede
  leer el gráfico ve los mismos datos en tabla). Único para los dashboards de
  Admin y del organizador (antes cada uno tenía su propio "Ver tabla").

    <PanelGrafico titulo="Recaudación por día" vacio="Sin datos en el rango."
                  tabla={{ columnas, datos, renderFila }}>
      <ResponsiveContainer>…</ResponsiveContainer>
    </PanelGrafico>

  vacio: texto cuando no hay datos. alto: alto del gráfico (defecto 260px).
*/
export default function PanelGrafico({ titulo, vacio, tabla, alto, children }) {
  const [modo, setModo] = useState('grafico');
  const sinDatos = !tabla.datos || tabla.datos.length === 0;
  return (
    <div className="qp-panel-grafico">
      <div className="qp-panel-grafico__cab">
        <h4>{titulo}</h4>
        {!sinDatos && (
          <Pestanas
            etiqueta={`Ver "${titulo}" como`}
            activo={modo}
            onCambio={setModo}
            items={[
              { id: 'grafico', etiqueta: 'Ver gráfico', icono: FaChartArea, soloIcono: true },
              { id: 'tabla', etiqueta: 'Ver tabla', icono: FaTable, soloIcono: true },
            ]}
          />
        )}
      </div>
      {sinDatos ? (
        <EstadoVacio compacto icono={FaChartBar} titulo={vacio} />
      ) : modo === 'tabla' ? (
        <div className="qp-panel-grafico__tabla">
          <Tabla columnas={tabla.columnas} datos={tabla.datos} renderFila={tabla.renderFila} porPagina={0} />
        </div>
      ) : (
        <div className="qp-panel-grafico__cuerpo" style={alto ? { '--alto-grafico': alto } : undefined}>{children}</div>
      )}
    </div>
  );
}
