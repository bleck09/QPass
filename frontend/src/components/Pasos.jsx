import { FaCheck } from 'react-icons/fa';
import './Pasos.css';

/*
  Indicador de pasos ÚNICO (PLAN_REDISENO §2.2, tarea 0.7). Reemplaza las
  4 versiones propias: asistente de eventos (pi-fev__stepper), compra
  (pi-cmp-pasos), registro / completar perfil (pi-auth__progress) y la
  navegación "Preparar el evento" (pi-ges-tab con número).

    <Pasos
      pasos={[{ id: 'datos', titulo: 'Datos', detalle: 'Nombre y lugar', icono: FaInfo }, …]}
      actual={1}                 // índice o id del paso actual
      onIr={(i, paso) => …}      // opcional: los pasos se pueden tocar
      variante="riel"            // 'riel' (círculos sobre una línea) | 'compacto' (pastillas)
      etiqueta="Pasos de la compra"
    />

  Estado de cada paso: paso.estado ('listo' | 'pendiente' | 'falta' |
  'opcional') si viene; si no, los anteriores al actual son 'listo'.
  'falta' = requisito sin hacer (se marca en ámbar y late). El actual lleva
  aria-current="step". Un paso listo muestra un tilde.
  paso.contador: número chico al lado (p. ej. solicitudes pendientes).
*/
export default function Pasos({ pasos, actual, onIr, variante = 'riel', etiqueta, className = '' }) {
  const iActual = typeof actual === 'number' ? actual : pasos.findIndex((p) => p.id === actual);
  const avance = pasos.length > 1 ? Math.max(0, iActual) / (pasos.length - 1) : 0;

  return (
    <ol
      className={`qp-pasos qp-pasos--${variante}${onIr ? ' qp-pasos--navegable' : ''} ${className}`.trim()}
      aria-label={etiqueta}
      style={{ '--pasos': pasos.length, '--avance': avance }}
    >
      {pasos.map((paso, i) => {
        const esActual = i === iActual;
        const estado = paso.estado ?? (i < iActual ? 'listo' : 'pendiente');
        const Icono = paso.icono;
        const marca = estado === 'listo' && !esActual
          ? <FaCheck aria-hidden="true" />
          : Icono && variante === 'riel' ? <Icono aria-hidden="true" /> : i + 1;

        const contenido = (
          <>
            <span className="qp-paso__marca" aria-hidden={typeof marca !== 'number' || undefined}>{marca}</span>
            <span className="qp-paso__texto">
              <strong>{paso.titulo}</strong>
              {paso.detalle && <small>{paso.detalle}</small>}
              {estado === 'opcional' && <small className="qp-paso__opcional">opcional</small>}
            </span>
            {paso.contador > 0 && <span key={paso.contador} className="qp-paso__contador">{paso.contador}</span>}
            <span className="sr-only">
              {esActual ? ' (paso actual)' : estado === 'listo' ? ' (listo)' : estado === 'falta' ? ' (falta hacerlo)' : estado === 'opcional' ? '' : ' (pendiente)'}
            </span>
          </>
        );

        const clases = `qp-paso qp-paso--${estado}${esActual ? ' qp-paso--actual' : ''}`;
        return (
          <li key={paso.id ?? i} className={clases} aria-current={esActual ? 'step' : undefined}>
            {onIr ? (
              <button type="button" className="qp-paso__boton" onClick={() => onIr(i, paso)} disabled={paso.deshabilitado}>
                {contenido}
              </button>
            ) : (
              <span className="qp-paso__boton">{contenido}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
