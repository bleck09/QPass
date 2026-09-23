import Tabla from '../../../components/Tabla.jsx';

export default function VistaSupervisores({ supervisores, ingresaron }) {
  return (
    <section className="pi-dash-seccion">
      <h3 className="pi-dash-seccion-titulo">Supervisores</h3>
      <p className="pi-dash-incidencias-nota">
        El sistema no registra qué supervisor gestionó cada ingreso individual; en total,
        <strong> {ingresaron}</strong> persona(s) ya ingresaron a este evento.
      </p>

      <Tabla
        columnas={['Nombre', 'Correo']}
        datos={supervisores}
        vacio="No hay supervisores asignados a este evento."
        renderFila={(s) => (
          <tr key={s.id}>
            <td>{s.nombre}</td>
            <td>{s.email}</td>
          </tr>
        )}
      />
    </section>
  );
}
