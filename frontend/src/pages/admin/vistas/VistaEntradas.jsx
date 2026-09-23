import { FaCheckCircle, FaHourglassHalf, FaSignOutAlt } from 'react-icons/fa';
import Tabla from '../../../components/Tabla.jsx';
import Buscador from '../../../components/Buscador.jsx';
import Insignia from '../../../components/Insignia.jsx';
import { ciDeEntrada } from '../../../utils/eventos.js';

// Estado de ingreso de un participante, con la Insignia GLOBAL (antes:
// .pi-dash-badge-ok / -pend / -salio propias de esta pantalla).
const ESTADO = {
  salio: { tono: 'neutro', icono: FaSignOutAlt, texto: 'Salió' },
  ingresado: { tono: 'ok', icono: FaCheckCircle, texto: 'Ingresó' },
  pendiente: { tono: 'warn', icono: FaHourglassHalf, texto: 'Pendiente' },
};

export default function VistaEntradas({ titulo, busqueda, onBuscar, entradas }) {
  return (
    <section className="pi-dash-seccion">
      <h3 className="pi-dash-seccion-titulo">{titulo}</h3>

      <Buscador
        valor={busqueda}
        onCambio={onBuscar}
        placeholder="Buscar por nombre o documento…"
        etiqueta="Buscar por nombre o documento"
      />

      <Tabla
        columnas={['Participante', 'Documento', 'Entrada', 'Estado']}
        datos={entradas}
        vacio="No se encontraron participantes."
        renderFila={(p) => {
          const est = ESTADO[p.estadoIngreso] ?? ESTADO.pendiente;
          return (
            <tr key={p.id}>
              <td>
                <div className="pi-dash-fila-persona">
                  {p.foto && <img width="32" height="32" src={p.foto} alt="" className="pi-dash-mini-avatar" />}
                  <span>{p.nombre}</span>
                </div>
              </td>
              <td>{ciDeEntrada(p) || '—'}</td>
              <td>{p.categoriaTicket?.nombre || '—'}</td>
              <td><Insignia tono={est.tono} icono={est.icono}>{est.texto}</Insignia></td>
            </tr>
          );
        }}
      />
    </section>
  );
}
