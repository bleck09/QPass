import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import './Avisos.css';

/*
  Avisos flotantes (toasts) — la ÚNICA forma de dar feedback después de una
  acción en toda la app (ver PLAN_REDISENO.txt §2.5). Reemplaza los
  setMensaje + setTimeout que tenía cada pantalla.

  Uso:
    const avisos = useAvisos();
    avisos.exito('Cambios guardados');
    avisos.error(err.message);
    avisos.info('Quitaste una entrada', { accion: { texto: 'Deshacer', onClick: deshacer } });

  Opciones: { titulo, accion: { texto, onClick }, duracion (ms) }.
  - Éxito/info duran 4,5 s; error 7 s. Se pausan con el mouse o el foco.
  - El aviso se cierra cuando termina la animación de su barra de tiempo:
    pausar la barra (animation-play-state) pausa también el cierre, sin
    timers que sincronizar.
  - Los avisos van dentro de una región aria-live: el lector de pantalla
    los anuncia sin mover el foco. Los errores usan role="alert".
*/

const AvisosContext = createContext(null);

const DURACION = { exito: 4500, info: 4500, error: 7000 };
const ICONO = { exito: FaCheckCircle, info: FaInfoCircle, error: FaExclamationTriangle };
const MAX_VISIBLES = 4;

let siguienteId = 1;

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const saliendoRef = useRef(new Set());

  const cerrar = useCallback((id) => {
    if (saliendoRef.current.has(id)) return;
    saliendoRef.current.add(id);
    // Primero la animación de salida; después se saca de la lista.
    setAvisos((lista) => lista.map((a) => (a.id === id ? { ...a, saliendo: true } : a)));
    setTimeout(() => {
      saliendoRef.current.delete(id);
      setAvisos((lista) => lista.filter((a) => a.id !== id));
    }, 250);
  }, []);

  const mostrar = useCallback((tipo, mensaje, opciones = {}) => {
    const id = siguienteId++;
    const aviso = {
      id,
      tipo,
      mensaje,
      titulo: opciones.titulo,
      accion: opciones.accion,
      duracion: opciones.duracion ?? DURACION[tipo],
    };
    // Tope de avisos a la vez: los más viejos se van.
    setAvisos((lista) => [...lista, aviso].slice(-MAX_VISIBLES));
    return id;
  }, []);

  const api = useMemo(() => ({
    exito: (mensaje, opciones) => mostrar('exito', mensaje, opciones),
    error: (mensaje, opciones) => mostrar('error', mensaje, opciones),
    info: (mensaje, opciones) => mostrar('info', mensaje, opciones),
    cerrar,
  }), [mostrar, cerrar]);

  return (
    <AvisosContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="qp-avisos" aria-live="polite" aria-relevant="additions">
          {avisos.map((a) => {
            const Icono = ICONO[a.tipo];
            return (
              <div
                key={a.id}
                className={`qp-aviso qp-aviso--${a.tipo}${a.saliendo ? ' saliendo' : ''}`}
                role={a.tipo === 'error' ? 'alert' : 'status'}
                style={{ '--duracion': `${a.duracion}ms` }}
              >
                <Icono className="qp-aviso-ic" aria-hidden="true" />
                <div className="qp-aviso-txt">
                  {a.titulo && <strong>{a.titulo}</strong>}
                  <span>{a.mensaje}</span>
                </div>
                {a.accion && (
                  <button
                    type="button"
                    className="qp-aviso-accion"
                    onClick={() => { a.accion.onClick?.(); cerrar(a.id); }}
                  >
                    {a.accion.texto}
                  </button>
                )}
                <button type="button" className="qp-aviso-cerrar" onClick={() => cerrar(a.id)} aria-label="Cerrar aviso">
                  <FaTimes aria-hidden="true" />
                </button>
                <span className="qp-aviso-tiempo" aria-hidden="true" onAnimationEnd={() => cerrar(a.id)} />
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </AvisosContext.Provider>
  );
}

// Si algún componente se renderiza fuera del provider (tests, previews), los
// avisos no rompen la pantalla: simplemente no se muestran.
const SIN_PROVIDER = { exito: () => {}, error: () => {}, info: () => {}, cerrar: () => {} };

// eslint-disable-next-line react-refresh/only-export-components
export function useAvisos() {
  return useContext(AvisosContext) ?? SIN_PROVIDER;
}
