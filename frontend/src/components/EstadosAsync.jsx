import { FaExclamationTriangle, FaRedo, FaInbox } from 'react-icons/fa';
import Boton from './Boton.jsx';
import './EstadosAsync.css';

/*
  Estados visuales de una vista que carga datos — Manual 8.9 y
  PLAN_REDISENO.txt §2.6 ("toda vista muestra cargando / vacío / error").

  <EstadoCarga>  -> esqueleto (skeleton) mientras llega la primera respuesta.
  <EstadoError>  -> mensaje neutro + botón "Reintentar" cuando la petición falla.
  <EstadoVacio>  -> no hay nada que mostrar: ícono, título, texto y una acción
                    sugerida. Nunca una lista en blanco ni "No hay datos" suelto.
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
    <div className="estado-bloque estado-bloque--error" role="alert">
      <FaExclamationTriangle className="estado-bloque-icono" aria-hidden="true" />
      <p className="estado-bloque-titulo">{titulo}</p>
      <p className="estado-bloque-mensaje">{mensaje}</p>
      {onReintentar && (
        <Boton variante="secundario" icono={FaRedo} onClick={onReintentar} className="estado-bloque-accion">
          Reintentar
        </Boton>
      )}
    </div>
  );
}

/*
  <EstadoVacio
    icono={FaTicketAlt}
    titulo="Todavía no tenés entradas"
    mensaje="Cuando compres, van a aparecer acá."
    accion={<Boton onClick={...}>Ver eventos</Boton>}   // opcional
    compacto                                              // menos alto (dentro de tarjetas)
  />
*/
export function EstadoVacio({ icono: Icono = FaInbox, titulo, mensaje, accion, compacto = false }) {
  return (
    <div className={`estado-bloque estado-bloque--vacio${compacto ? ' estado-bloque--compacto' : ''}`}>
      <span className="estado-bloque-ilustracion" aria-hidden="true"><Icono /></span>
      {titulo && <p className="estado-bloque-titulo">{titulo}</p>}
      {mensaje && <p className="estado-bloque-mensaje">{mensaje}</p>}
      {accion && <div className="estado-bloque-accion">{accion}</div>}
    </div>
  );
}
