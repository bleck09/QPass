/* ============================================================================
 * ContadorRegresivo — cuenta atrás hasta una fecha. Respeta
 * prefers-reduced-motion: si el usuario pidió menos movimiento, actualiza cada
 * minuto y oculta los segundos, en vez de parpadear cada segundo.
 * El texto para lectores de pantalla va en el aria-label; los bloques visuales
 * quedan aria-hidden para no anunciarse en cada tick.
 * ========================================================================= */

import { useEffect, useState } from 'react';
import styles from './ContadorRegresivo.module.css';

interface Restante {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
  llego: boolean;
}

function calcular(objetivo: number): Restante {
  const ms = Math.max(0, objetivo - Date.now());
  return {
    dias: Math.floor(ms / 86_400_000),
    horas: Math.floor((ms / 3_600_000) % 24),
    minutos: Math.floor((ms / 60_000) % 60),
    segundos: Math.floor((ms / 1000) % 60),
    llego: ms === 0,
  };
}

const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  /** Fecha objetivo en ISO 8601. */
  fecha: string;
  /** Variante compacta (para la tarjeta de "mi próxima entrada"). */
  compacto?: boolean;
}

export function ContadorRegresivo({ fecha, compacto = false }: Props) {
  const objetivo = new Date(fecha).getTime();
  const reducir = prefiereMenosMovimiento();
  const [t, setT] = useState<Restante>(() => calcular(objetivo));

  useEffect(() => {
    if (Number.isNaN(objetivo)) return;
    setT(calcular(objetivo));
    const id = setInterval(() => setT(calcular(objetivo)), reducir ? 60_000 : 1000);
    return () => clearInterval(id);
  }, [objetivo, reducir]);

  if (Number.isNaN(objetivo)) return null;
  if (t.llego) return <p className={styles.llego}>¡Hoy es el evento!</p>;

  const bloques = [
    { n: t.dias, l: 'días' },
    { n: t.horas, l: 'hrs' },
    { n: t.minutos, l: 'min' },
    ...(reducir ? [] : [{ n: t.segundos, l: 'seg' }]),
  ];

  const resumen = `Faltan ${t.dias} días, ${t.horas} horas y ${t.minutos} minutos para el evento`;

  return (
    <div
      className={compacto ? styles.compacto : styles.contador}
      role="group"
      aria-label={resumen}
    >
      {bloques.map((b) => (
        <div key={b.l} className={styles.bloque} aria-hidden="true">
          <span className={styles.num}>{String(b.n).padStart(2, '0')}</span>
          <span className={styles.lbl}>{b.l}</span>
        </div>
      ))}
    </div>
  );
}
