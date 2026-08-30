import { useCallback, useEffect, useRef, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useFocoModal } from '../utils/useFocoModal.js';
import './ConfirmarModal.css';

/*
  Reemplazo accesible de window.confirm() y window.prompt() — Manual 3.3
  (diálogos de confirmación) y 8.6 (modales). Los diálogos nativos bloquean el
  hilo, no se pueden estilar ni traducir y algunos navegadores los suprimen tras
  varios usos. Esto NO es capa de datos (Anexo B): es un componente de presentación.

  El foco entra al diálogo, queda atrapado y vuelve al disparador (useFocoModal).
  El foco inicial cae en "Cancelar": la opción segura para acciones destructivas.

  Uso confirmación (devuelve true / false):
    const [confirmar, DialogoConfirmar] = useConfirmar();
    const ok = await confirmar({ mensaje: 'Se eliminará.', textoConfirmar: 'Eliminar', peligroso: true });
    if (!ok) return;

  Uso con nota (reemplaza window.prompt; devuelve el texto, o null si canceló):
    const motivo = await confirmar({
      titulo: '¿Rechazar la solicitud?',
      mensaje: 'El cliente verá este motivo.',
      campoNota: { etiqueta: 'Motivo del rechazo', placeholder: '...', requerido: true },
      textoConfirmar: 'Rechazar',
      peligroso: true,
    });
    if (motivo === null) return;

    return (<>  ...jsx...  {DialogoConfirmar}  </>);
*/
export function useConfirmar() {
  // null cuando está cerrado; { opciones, resolver } mientras está abierto.
  const [estado, setEstado] = useState(null);
  const [nota, setNota] = useState('');
  const modalRef = useRef(null);
  const abierto = estado !== null;

  useFocoModal(modalRef, abierto);

  // Bloqueo de scroll del fondo mientras el diálogo está abierto (Manual 8.6).
  useEffect(() => {
    if (!abierto) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const confirmar = useCallback((opciones = {}) => {
    setNota('');
    return new Promise((resolver) => setEstado({ opciones, resolver }));
  }, []);

  const responder = (valor) => {
    setEstado((actual) => {
      actual?.resolver(valor);
      return null;
    });
  };

  const o = estado?.opciones ?? {};
  const conNota = !!o.campoNota;
  const valorCancelar = conNota ? null : false;
  const confirmarDeshabilitado = conNota && o.campoNota.requerido && nota.trim() === '';

  const dialogo = abierto ? (
    <div className="confirmar-overlay" onClick={() => responder(valorCancelar)}>
      <div
        ref={modalRef}
        tabIndex={-1}
        className="confirmar-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') responder(valorCancelar); }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        aria-describedby="confirmar-mensaje"
      >
        <div
          className={`confirmar-icono${o.peligroso ? ' es-peligroso' : ''}`}
          aria-hidden="true"
        >
          <FaExclamationTriangle />
        </div>
        <h2 id="confirmar-titulo" className="confirmar-titulo">
          {o.titulo || '¿Confirmar acción?'}
        </h2>
        <p id="confirmar-mensaje" className="confirmar-mensaje">{o.mensaje}</p>

        {conNota && (
          <div className="confirmar-campo">
            <label htmlFor="confirmar-nota">{o.campoNota.etiqueta || 'Nota'}</label>
            <textarea
              id="confirmar-nota"
              className="confirmar-nota"
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={o.campoNota.placeholder || ''}
              required={!!o.campoNota.requerido}
            />
          </div>
        )}

        <div className="confirmar-acciones">
          <button
            type="button"
            className="confirmar-btn confirmar-btn-cancelar"
            onClick={() => responder(valorCancelar)}
          >
            {o.textoCancelar || 'Cancelar'}
          </button>
          <button
            type="button"
            className={`confirmar-btn confirmar-btn-ok${o.peligroso ? ' es-peligroso' : ''}`}
            onClick={() => responder(conNota ? nota : true)}
            disabled={confirmarDeshabilitado}
          >
            {o.textoConfirmar || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [confirmar, dialogo];
}
