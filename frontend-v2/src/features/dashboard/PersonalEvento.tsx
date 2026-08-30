/* Personal asignado a un evento, agrupado por rol. */

import { useMemo } from 'react';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { ROL_LABEL, type Rol } from '@/shared/constants/roles';
import { useAsignaciones } from '@/features/asignaciones';
import styles from './DashboardEvento.module.css';

export function PersonalEvento({ eventoId }: { eventoId: string }) {
  const { data, isPending, isError, refetch } = useAsignaciones(eventoId);

  const porRol = useMemo(() => {
    const mapa = new Map<Rol, { nombre: string; email: string }[]>();
    for (const a of data ?? []) {
      const lista = mapa.get(a.rol) ?? [];
      lista.push({ nombre: a.usuario?.nombre ?? `#${a.usuarioId}`, email: a.usuario?.email ?? '' });
      mapa.set(a.rol, lista);
    }
    return [...mapa.entries()];
  }, [data]);

  if (isPending) return <EstadoCargando filas={2} />;
  if (isError) return <EstadoError onReintentar={refetch} />;
  if (porRol.length === 0)
    return <EstadoVacio titulo="Sin personal asignado a este evento" />;

  return (
    <div className={styles.personalGrid}>
      {porRol.map(([rol, personas]) => (
        <div key={rol} className={styles.personalRol}>
          <p className={styles.personalRolTitulo}>
            {ROL_LABEL[rol]} ({personas.length})
          </p>
          <ul className={styles.personalLista}>
            {personas.map((p) => (
              <li key={p.email || p.nombre}>
                {p.nombre}
                {p.email && <span className={styles.personalMail}> · {p.email}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
