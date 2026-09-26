import FotoZoom from './FotoZoom.jsx';
import './FotosDuplicado.css';

/**
 * Fotos de un caso de manilla duplicada: grande, la persona que entró con la
 * copia; chico en la esquina, el dueño real verificado (si hay), para
 * compararlos de un vistazo. Lo usan "Personas por encontrar" y el modal de
 * manilla falsa, así el caso se ve igual en todos lados.
 *
 * @param {string} foto       foto de quien tiene la copia (puede faltar)
 * @param {string} fotoDueno  foto del dueño real verificado (opcional)
 */
export default function FotosDuplicado({ foto, fotoDueno }) {
  return (
    <div className="qp-foto-dup">
      <figure className="qp-foto-dup__copia">
        {foto
          ? <FotoZoom width={180} height={180} src={foto} alt="Persona que entró con la copia" />
          : <span className="qp-foto-dup__sin-foto">Sin foto</span>}
        <figcaption>Tiene la copia</figcaption>
      </figure>
      {fotoDueno && (
        <figure className="qp-foto-dup__dueno">
          <FotoZoom width={64} height={64} src={fotoDueno} alt="Dueño real verificado" />
          <figcaption>Dueño</figcaption>
        </figure>
      )}
    </div>
  );
}
