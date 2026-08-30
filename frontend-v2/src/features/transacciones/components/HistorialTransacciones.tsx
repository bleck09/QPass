/* ============================================================================
 * HistorialTransacciones — recargas o devoluciones que hizo un operador en un
 * evento. El backend no filtra por operador, así que se cruza en el cliente.
 * ========================================================================= */

import { useMemo } from 'react';
import { Table, Td, Th } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useTransacciones, type TipoTransaccion } from '../transacciones';
import styles from './HistorialTransacciones.module.css';

interface Props {
  eventoId: string;
  tipo: Extract<TipoTransaccion, 'recarga' | 'devolucion'>;
  operadorId: number;
}

export function HistorialTransacciones({ eventoId, tipo, operadorId }: Props) {
  const { data, isPending, isError, refetch } = useTransacciones({ eventoId, tipo });

  const mios = useMemo(
    () =>
      (data ?? [])
        .filter((t) => t.operadorId === operadorId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [data, operadorId],
  );

  if (isPending) return <EstadoCargando filas={4} />;
  if (isError) return <EstadoError onReintentar={refetch} />;
  if (mios.length === 0) return <EstadoVacio titulo="Todavía no registraste movimientos" />;

  const total = mios.reduce((s, t) => s + Number(t.monto), 0);

  return (
    <div>
      <p className={styles.resumen}>
        {mios.length} movimiento{mios.length === 1 ? '' : 's'} · total{' '}
        <strong>{formatearMoneda(total)}</strong>
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Participante</Th>
            <Th numerico>Monto</Th>
          </tr>
        </thead>
        <tbody>
          {mios.map((t) => (
            <tr key={t.id}>
              <Td>{formatearFechaHora(t.createdAt)}</Td>
              <Td>{t.entrada?.nombre ?? '—'}</Td>
              <Td numerico>{formatearMoneda(t.monto)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
