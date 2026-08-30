import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import './EstadosAsync.css';

/*
  Estados visuales para el ciclo de carga de datos — Manual 8.9
  ("toda vista que carga datos muestra cargando / vacío / error").

  <EstadoCarga>  -> esqueleto (skeleton) mientras llega la primera respuesta.
  <EstadoError>  -> mensaje neutro + botón "Reintentar" cuando la petición falla.

  El estado "vacío" ya lo maneja cada lista con su propio texto; estos dos
  cubren los que faltaban.
*/

// filas: cuántas barras de esqueleto dibujar (aprox. altura del contenido real).
export function EstadoCarga({ filas = 4, etiqueta = 'Cargando…' }) {
  return (
    <div className="estado-carga" role="status" aria-live="polite">
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="estado-carga-barra" aria-hidden="true" />
      ))}
    </div>
  );
}

export function EstadoError({
  onReintentar,
  titulo = 'No se pudieron cargar los datos',
  mensaje = 'Revisa tu conexión e inténtalo de nuevo.',
}) {
  return (
    <div className="estado-error" role="alert">
      <FaExclamationTriangle className="estado-error-icono" aria-hidden="true" />
      <p className="estado-error-titulo">{titulo}</p>
      <p className="estado-error-mensaje">{mensaje}</p>
      {onReintentar && (
        <button type="button" className="estado-error-btn" onClick={onReintentar}>
          <FaRedo aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  );
}
