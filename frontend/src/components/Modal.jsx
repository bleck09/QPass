import { useId } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import { useModal } from '../utils/useModal.js';
import './Modal.css';

/*
  Modal accesible REUTILIZABLE — reemplaza los diálogos genéricos que estaban
  copiados a mano página por página (overlay + tarjeta + role="dialog" +
  aria-modal + ESC + foco atrapado + bloqueo de scroll + botón cerrar). NO es
  capa de datos (Anexo B): es un primitivo de presentación, igual que
  ConfirmarModal / EstadosAsync. El comportamiento vive en utils/useModal.js.

  El estado abierto/cerrado lo maneja la página con render condicional: si no se
  renderiza <Modal>, no hay modal (mismo patrón que antes: `{abierto && (...)}`).

  Los modales con LOOK propio (tarjeta del QR, vista previa de landing...) no usan
  este componente: conservan su markup y solo llaman a useModal() para el
  comportamiento.

  Uso:
    {escaneando && (
      <Modal titulo="Escanear manilla" onCerrar={() => setEscaneando(false)} tamano="sm">
        <EscanerQr ... />
      </Modal>
    )}

  Props:
    titulo            string | nodo    encabezado (<h2>) + aria-labelledby.
    onCerrar          () => void        se llama con ESC, clic en el backdrop y la X.
    tamano            'sm'|'md'|'lg'|'xl'   ancho máx. de la tarjeta (default 'md').
    className         string           clase extra en la tarjeta, para estilos del
                                       contenido específico de esa página.
    ocultarCerrar     bool             esconde la X (flujos sin salida manual).
    cerrarEnBackdrop  bool = true       si es false, el clic fuera NO cierra.
*/
export default function Modal({
  titulo,
  onCerrar,
  tamano = 'md',
  className = '',
  ocultarCerrar = false,
  cerrarEnBackdrop = true,
  children,
}) {
  const ref = useModal(true, onCerrar);
  const tituloId = useId();
  const conHeader = titulo != null || !ocultarCerrar;

  // Portal al <body>: si un ancestro tiene transform/filter/overflow (ej. una
  // animación de entrada), un position:fixed quedaría atrapado y recortado
  // dentro de ese contenedor en vez de cubrir toda la pantalla.
  return createPortal(
    <div
      className="qp-modal-overlay"
      onClick={cerrarEnBackdrop ? onCerrar : undefined}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={`qp-modal qp-modal--${tamano}${className ? ` ${className}` : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo != null ? tituloId : undefined}
      >
        {conHeader && (
          <div className="qp-modal__header">
            {titulo != null ? (
              <h2 id={tituloId} className="qp-modal__titulo">
                {titulo}
              </h2>
            ) : (
              <span />
            )}
            {!ocultarCerrar && (
              <button
                type="button"
                className="qp-modal__cerrar"
                onClick={onCerrar}
                aria-label="Cerrar"
              >
                <FaTimes aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div className="qp-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
