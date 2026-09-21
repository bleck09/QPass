import { useEffect, useState } from 'react';

const calcular = (fecha) => {
  const ms = Math.max(0, new Date(fecha).getTime() - Date.now());
  return {
    dias: Math.floor(ms / 86400000),
    horas: Math.floor((ms / 3600000) % 24),
    minutos: Math.floor((ms / 60000) % 60),
    segundos: Math.floor((ms / 1000) % 60),
    terminada: ms === 0,
  };
};

/**
 * Cuenta regresiva hasta `fecha`, actualizada cada segundo. Con `fecha`
 * vacía devuelve null. Al llegar a cero deja de actualizarse.
 */
export function useCuentaRegresiva(fecha) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!fecha) return;
    const id = setInterval(() => {
      if (new Date(fecha).getTime() <= Date.now()) clearInterval(id);
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [fecha]);

  return fecha ? calcular(fecha) : null;
}
