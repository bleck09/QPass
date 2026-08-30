import { useCallback, useEffect, useReducer } from 'react';

/*
  Envuelve una llamada asíncrona a la API y expone su ciclo de vida para poder
  pintar los estados OBLIGATORIOS del Manual 8.9: cargando / error + reintentar.

  Esto NO es React Query ni la capa de datos del Anexo B: es un envoltorio mínimo
  de useEffect + try/catch. No hay caché, ni store global, ni invalidación. Cada
  pantalla sigue pidiendo sus datos con api.x.y() como hasta ahora; lo único que
  aporta este hook es el trío { cargando, error, recargar } para no repetir el
  mismo boilerplate en 20 archivos.

  Se usa useReducer (no varios useState): dispatch() SÍ está permitido dentro de
  un efecto por la regla react-hooks/set-state-in-effect.

  Parámetros
    fnCarga        función async SIN argumentos que devuelve los datos. Tiene que
                   ser estable: envolvela en useCallback con sus dependencias
                   (eventoId, sesion.id, etc.).
    opciones.inicial  valor de `data` antes del primer resultado (default null).
    opciones.activo   si es false NO dispara la carga (p. ej. todavía no hay id);
                      al pasar a true, carga.

  Devuelve { data, setData, cargando, error, recargar }.
    - recargar() vuelve a ejecutar fnCarga: para el botón "Reintentar" y para
      refrescar tras crear / editar / borrar.
    - setData(valor | fn) actualiza `data` en local, sin ir al servidor, para
      las actualizaciones optimistas que la pantalla ya hacía con su setState
      (p. ej. quitar una fila de la lista tras borrarla).
*/
function reducer(estado, accion) {
  switch (accion.tipo) {
    case 'cargando':
      return { ...estado, cargando: true, error: null };
    case 'ok':
      return { data: accion.data, cargando: false, error: null };
    case 'fallo':
      return { ...estado, cargando: false, error: accion.error };
    case 'inactivo':
      return { ...estado, cargando: false };
    case 'set':
      return {
        ...estado,
        data: typeof accion.data === 'function' ? accion.data(estado.data) : accion.data,
      };
    default:
      return estado;
  }
}

export function useApi(fnCarga, { inicial = null, activo = true } = {}) {
  const [estado, dispatch] = useReducer(reducer, {
    data: inicial,
    cargando: activo,
    error: null,
  });

  // Para el botón "Reintentar" y los refrescos manuales (contexto de evento, no
  // de efecto): puede llamar setState libremente.
  const recargar = useCallback(async () => {
    if (!activo) return;
    dispatch({ tipo: 'cargando' });
    try {
      dispatch({ tipo: 'ok', data: await fnCarga() });
    } catch (error) {
      dispatch({ tipo: 'fallo', error });
    }
  }, [fnCarga, activo]);

  // Carga automática al montar y cuando cambian fnCarga / activo. La petición
  // que quede "vieja" por un cambio de deps o un desmontaje se descarta.
  useEffect(() => {
    if (!activo) {
      dispatch({ tipo: 'inactivo' });
      return undefined;
    }
    let cancelado = false;
    dispatch({ tipo: 'cargando' });
    fnCarga()
      .then((data) => { if (!cancelado) dispatch({ tipo: 'ok', data }); })
      .catch((error) => { if (!cancelado) dispatch({ tipo: 'fallo', error }); });
    return () => { cancelado = true; };
  }, [fnCarga, activo]);

  const setData = useCallback((valorOFn) => dispatch({ tipo: 'set', data: valorOFn }), []);

  return {
    data: estado.data,
    setData,
    cargando: estado.cargando,
    error: estado.error,
    recargar,
  };
}
