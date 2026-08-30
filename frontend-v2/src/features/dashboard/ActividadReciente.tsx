/* Últimos movimientos del evento: recargas, devoluciones y ventas, en una
 * sola línea de tiempo. Solo lectura. */

import { useMemo } from 'react';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useTransacciones } from '@/features/transacciones';
import { useVentas } from '@/features/ventas';
import styles from './DashboardEvento.module.css';

const LIMITE = 15;

interface Item {
  id: string;
  cuando: string;
  texto: string;
  monto: string;
}

export function ActividadReciente({ eventoId }: { eventoId: string }) {
  const transacciones = useTransacciones({ eventoId });
  const ventas = useVentas({ eventoId });

  const items = useMemo<Item[]>(() => {
    const deTx: Item[] = (transacciones.data ?? [])
      .filter((t) => t.tipo === 'recarga' || t.tipo === 'devolucion')
      .map((t) => ({
        id: t.id,
        cuando: t.createdAt,
        texto:
          t.tipo === 'recarga'
            ? `Recarga a ${t.entrada?.nombre ?? 'participante'}`
            : `Devolución a ${t.entrada?.nombre ?? 'participante'}`,
        monto: t.monto,
      }));
    const deVentas: Item[] = (ventas.data ?? []).map((v) => ({
      id: v.id,
      cuando: v.createdAt,
      texto: `Venta en ${v.puesto?.nombre ?? 'puesto'}`,
      monto: v.montoTotal,
    }));
    return [...deTx, ...deVentas]
      .sort((a, b) => +new Date(b.cuando) - +new Date(a.cuando))
      .slice(0, LIMITE);
  }, [transacciones.data, ventas.data]);

  if (transacciones.isPending || ventas.isPending) return <EstadoCargando filas={3} />;
  if (transacciones.isError || ventas.isError)
    return (
      <EstadoError
        onReintentar={() => {
          void transacciones.refetch();
          void ventas.refetch();
        }}
      />
    );
  if (items.length === 0) return <EstadoVacio titulo="Sin actividad todavía" />;

  return (
    <ul className={styles.actividad}>
      {items.map((i) => (
        <li key={i.id}>
          <span>{i.texto}</span>
          <span className={styles.actividadMeta}>
            {formatearMoneda(i.monto)} · {formatearFechaHora(i.cuando)}
          </span>
        </li>
      ))}
    </ul>
  );
}
