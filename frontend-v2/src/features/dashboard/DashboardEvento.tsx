/* ============================================================================
 * DashboardEvento — actividad de un evento: KPIs, recargas/devoluciones por
 * operador (con detalle), ventas por negocio, entradas (padrón), personal y
 * actividad reciente. Lo usan el Admin (Dashboard General) y el Cliente
 * (solo su evento aprobado, en modo `soloLectura`).
 * ========================================================================= */

import { useMemo, useState } from 'react';
import { Card, Modal, Podio, Tabs, type Tab } from '@/shared/components/ui';
import { EstadoCargando } from '@/shared/components/feedback';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { PadronAsistentes, useEntradas } from '@/features/entradas';
import { HistorialTransacciones, useTransacciones } from '@/features/transacciones';
import { useVentas } from '@/features/ventas';
import { usePuestos } from '@/features/puestos';
import { useUsuarios } from '@/features/usuarios';
import { PersonalEvento } from './PersonalEvento';
import { ActividadReciente } from './ActividadReciente';
import styles from './DashboardEvento.module.css';

interface GrupoOperador {
  id: number;
  nombre: string;
  count: number;
  total: number;
}

function agruparPorOperador(
  txs: { operador?: { id: number; nombre: string }; operadorId: number; monto: string }[],
): GrupoOperador[] {
  const mapa = new Map<number, GrupoOperador>();
  for (const t of txs) {
    const id = t.operador?.id ?? t.operadorId;
    const prev = mapa.get(id) ?? {
      id,
      nombre: t.operador?.nombre ?? `Operador #${id}`,
      count: 0,
      total: 0,
    };
    prev.count += 1;
    prev.total += Number(t.monto);
    mapa.set(id, prev);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

const TABS: Tab[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'entradas', label: 'Entradas' },
  { id: 'personal', label: 'Personal' },
  { id: 'actividad', label: 'Actividad reciente' },
];

interface Props {
  eventoId: string;
  soloLectura?: boolean;
}

export function DashboardEvento({ eventoId }: Props) {
  const entradas = useEntradas(eventoId);
  const recargas = useTransacciones({ eventoId, tipo: 'recarga' });
  const devoluciones = useTransacciones({ eventoId, tipo: 'devolucion' });
  const ventas = useVentas({ eventoId });
  const puestos = usePuestos(eventoId);
  const usuarios = useUsuarios();

  const [tab, setTab] = useState('resumen');
  const [detalle, setDetalle] = useState<
    { tipo: 'recarga' | 'devolucion'; op: GrupoOperador } | null
  >(null);

  const gruposRecarga = useMemo(
    () => agruparPorOperador(recargas.data ?? []),
    [recargas.data],
  );
  const gruposDevolucion = useMemo(
    () => agruparPorOperador(devoluciones.data ?? []),
    [devoluciones.data],
  );

  const ventasPorNegocio = useMemo(() => {
    const puestoANegocio = new Map((puestos.data ?? []).map((p) => [p.id, p.negocioId]));
    const nombreNegocio = new Map((usuarios.data ?? []).map((u) => [u.id, u.nombre]));
    const mapa = new Map<number, { nombre: string; total: number }>();
    for (const v of ventas.data ?? []) {
      const negId = v.puesto?.negocioId ?? puestoANegocio.get(v.puestoId) ?? 0;
      const prev = mapa.get(negId) ?? {
        nombre: nombreNegocio.get(negId) ?? 'Negocio',
        total: 0,
      };
      prev.total += Number(v.montoTotal);
      mapa.set(negId, prev);
    }
    return [...mapa.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [ventas.data, puestos.data, usuarios.data]);

  const totalRecargas = gruposRecarga.reduce((s, g) => s + g.total, 0);
  const totalDevoluciones = gruposDevolucion.reduce((s, g) => s + g.total, 0);
  const totalVentas = ventasPorNegocio.reduce((s, g) => s + g.total, 0);

  if (
    entradas.isPending ||
    recargas.isPending ||
    devoluciones.isPending ||
    ventas.isPending
  ) {
    return <EstadoCargando filas={5} />;
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.stats}>
        <Card>
          <p className={styles.statLabel}>Entradas confirmadas</p>
          <p className={styles.statValor}>{entradas.data?.length ?? 0}</p>
        </Card>
        <Card>
          <p className={styles.statLabel}>Recargado</p>
          <p className={styles.statValor}>{formatearMoneda(totalRecargas)}</p>
        </Card>
        <Card>
          <p className={styles.statLabel}>Devuelto</p>
          <p className={styles.statValor}>{formatearMoneda(totalDevoluciones)}</p>
        </Card>
        <Card>
          <p className={styles.statLabel}>Vendido en puestos</p>
          <p className={styles.statValor}>{formatearMoneda(totalVentas)}</p>
        </Card>
      </div>

      <Tabs tabs={TABS} activa={tab} onCambiar={setTab}>
        {tab === 'resumen' && (
          <div className={styles.contenedor}>
            <section>
              <h3 className={styles.h3}>Recargas por recargador</h3>
              {gruposRecarga.length === 0 ? (
                <p className={styles.hint}>Sin recargas todavía.</p>
              ) : (
                <ul className={styles.lista}>
                  {gruposRecarga.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        className={styles.filaBtn}
                        onClick={() => setDetalle({ tipo: 'recarga', op: g })}
                      >
                        <span>{g.nombre}</span>
                        <span>
                          {g.count} recargas · <strong>{formatearMoneda(g.total)}</strong>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className={styles.h3}>Devoluciones por operador</h3>
              {gruposDevolucion.length === 0 ? (
                <p className={styles.hint}>Sin devoluciones todavía.</p>
              ) : (
                <ul className={styles.lista}>
                  {gruposDevolucion.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        className={styles.filaBtn}
                        onClick={() => setDetalle({ tipo: 'devolucion', op: g })}
                      >
                        <span>{g.nombre}</span>
                        <span>
                          {g.count} retiros · <strong>{formatearMoneda(g.total)}</strong>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className={styles.h3}>Ventas por negocio</h3>
              {ventasPorNegocio.length === 0 ? (
                <p className={styles.hint}>Sin ventas todavía.</p>
              ) : (
                <Podio
                  items={ventasPorNegocio.map((n) => ({
                    id: n.id,
                    nombre: n.nombre,
                    valor: formatearMoneda(n.total),
                  }))}
                />
              )}
            </section>
          </div>
        )}

        {tab === 'entradas' && <PadronAsistentes eventoId={eventoId} />}
        {tab === 'personal' && <PersonalEvento eventoId={eventoId} />}
        {tab === 'actividad' && <ActividadReciente eventoId={eventoId} />}
      </Tabs>

      <Modal
        abierto={detalle !== null}
        onCerrar={() => setDetalle(null)}
        titulo={
          detalle
            ? `${detalle.tipo === 'recarga' ? 'Recargas' : 'Devoluciones'} de ${detalle.op.nombre}`
            : ''
        }
        acciones={undefined}
      >
        {detalle && (
          <HistorialTransacciones
            eventoId={eventoId}
            tipo={detalle.tipo}
            operadorId={detalle.op.id}
          />
        )}
      </Modal>
    </div>
  );
}
