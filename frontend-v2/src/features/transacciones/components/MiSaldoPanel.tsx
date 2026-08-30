/* ============================================================================
 * MiSaldoPanel — saldo actual e historial de movimientos del usuario en sesión.
 * El saldo se toma del `saldoResultante` del último movimiento del ledger
 * (Anexo C): es el valor autoritativo, no se recalcula en el cliente.
 * ========================================================================= */

import { useMemo } from 'react';
import { Card, Table, Td, Th } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useTransacciones, type TipoTransaccion } from '../transacciones';
import styles from './MiSaldoPanel.module.css';

const ETIQUETA: Record<TipoTransaccion, string> = {
  recarga: 'Recarga de saldo',
  consumo: 'Consumo en puesto',
  venta: 'Venta',
  devolucion: 'Devolución',
  ajuste: 'Ajuste',
};

/** Movimientos que suman al saldo del usuario. El resto resta. */
const SUMA: Record<TipoTransaccion, boolean> = {
  recarga: true,
  ajuste: true,
  consumo: false,
  venta: false,
  devolucion: false,
};

export function MiSaldoPanel({ usuarioId }: { usuarioId: number }) {
  const { data, isPending, isError, refetch } = useTransacciones({ usuarioId });

  const { movimientos, saldoActual, totalIngresado, totalGastado } = useMemo(() => {
    const orden = [...(data ?? [])].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
    return {
      movimientos: orden,
      saldoActual: orden[0]?.saldoResultante ?? '0',
      totalIngresado: orden
        .filter((t) => SUMA[t.tipo])
        .reduce((s, t) => s + Number(t.monto), 0),
      totalGastado: orden
        .filter((t) => !SUMA[t.tipo])
        .reduce((s, t) => s + Number(t.monto), 0),
    };
  }, [data]);

  if (isPending) return <EstadoCargando filas={4} />;
  if (isError)
    return <EstadoError mensaje="No pudimos cargar tu saldo." onReintentar={refetch} />;

  return (
    <div className={styles.panel}>
      <div className={styles.stats}>
        <Card>
          <p className={styles.statLabel}>Saldo disponible</p>
          <p className={styles.statValor}>{formatearMoneda(saldoActual)}</p>
        </Card>
        <Card>
          <p className={styles.statLabel}>Total recargado</p>
          <p className={styles.statValor}>{formatearMoneda(totalIngresado)}</p>
        </Card>
        <Card>
          <p className={styles.statLabel}>Total gastado</p>
          <p className={styles.statValor}>{formatearMoneda(totalGastado)}</p>
        </Card>
      </div>

      <section>
        <h3 className={styles.h3}>Mis movimientos</h3>
        {movimientos.length === 0 ? (
          <EstadoVacio titulo="Todavía no tienes movimientos" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Movimiento</Th>
                <Th>Detalle</Th>
                <Th numerico>Monto</Th>
                <Th>Fecha</Th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((t) => {
                const suma = SUMA[t.tipo];
                return (
                  <tr key={t.id}>
                    <Td>{ETIQUETA[t.tipo]}</Td>
                    <Td>{t.nota ?? t.entrada?.nombre ?? '—'}</Td>
                    <Td numerico>
                      <span className={suma ? styles.mas : styles.menos}>
                        {suma ? '+' : '−'}
                        {formatearMoneda(t.monto)}
                      </span>
                    </Td>
                    <Td>{formatearFechaHora(t.createdAt)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
