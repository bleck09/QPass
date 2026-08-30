/* ============================================================================
 * AdminPanelPage (/admin) — Dashboard General. Elegís un evento y ves su
 * actividad: entradas, recargas por recargador, devoluciones por operador y
 * ventas por negocio (con podio). Abajo, accesos rápidos a lo pendiente.
 * ========================================================================= */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Podio } from '@/shared/components/ui';
import { EstadoCargando } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { RUTAS } from '@/shared/constants/rutas';
import { SelectorEvento, useEventos } from '@/features/eventos';
import { useEntradas } from '@/features/entradas';
import { useTransacciones } from '@/features/transacciones';
import { useVentas } from '@/features/ventas';
import { useUsuarios } from '@/features/usuarios';
import { usePuestos } from '@/features/puestos';
import { useSolicitudes } from '@/features/solicitudes-evento';
import { useCompras } from '@/features/compras';
import { useIncidencias } from '@/features/incidencias';
import { useReportesEntrada } from '@/features/reportes-entrada';
import styles from './AdminPanelPage.module.css';

function agruparPorOperador(
  txs: { operador?: { id: number; nombre: string }; monto: string }[],
) {
  const mapa = new Map<number, { nombre: string; count: number; total: number }>();
  for (const t of txs) {
    const id = t.operador?.id ?? 0;
    const prev = mapa.get(id) ?? { nombre: t.operador?.nombre ?? '—', count: 0, total: 0 };
    prev.count += 1;
    prev.total += Number(t.monto);
    mapa.set(id, prev);
  }
  return [...mapa.entries()].map(([id, v]) => ({ id, ...v }));
}

export function AdminPanelPage() {
  useTituloPagina('Dashboard General');

  const eventos = useEventos();
  const [eventoId, setEventoId] = useState('');

  const entradas = useEntradas(eventoId);
  const recargas = useTransacciones({ eventoId, tipo: 'recarga' });
  const devoluciones = useTransacciones({ eventoId, tipo: 'devolucion' });
  const ventas = useVentas({ eventoId });
  const puestos = usePuestos(eventoId);
  const usuarios = useUsuarios();

  const solicitudes = useSolicitudes('pendiente');
  const compras = useCompras();
  const incidencias = useIncidencias({ estado: 'pendiente' });
  const reportes = useReportesEntrada({ estado: 'pendiente' });

  const gruposRecarga = useMemo(
    () => agruparPorOperador(recargas.data ?? []),
    [recargas.data],
  );
  const gruposDevolucion = useMemo(
    () => agruparPorOperador(devoluciones.data ?? []),
    [devoluciones.data],
  );

  const ventasPorNegocio = useMemo(() => {
    const puestoANegocio = new Map(
      (puestos.data ?? []).map((p) => [p.id, p.negocioId]),
    );
    const nombreNegocio = new Map(
      (usuarios.data ?? []).map((u) => [u.id, u.nombre]),
    );
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

  const comprasPendientes =
    compras.data?.filter((c) => c.estado === 'pendiente').length ?? 0;

  const cargandoEvento =
    eventoId &&
    (entradas.isPending ||
      recargas.isPending ||
      devoluciones.isPending ||
      ventas.isPending);

  return (
    <div className={styles.pagina}>
      <div className={styles.selector}>
        <SelectorEvento
          value={eventoId}
          onChange={setEventoId}
          soloActivos={false}
        />
      </div>

      {!eventoId && (
        <p className={styles.hint}>
          Elegí un evento para ver su actividad, o revisá lo pendiente más abajo.
        </p>
      )}

      {eventoId && cargandoEvento && <EstadoCargando filas={4} />}

      {eventoId && !cargandoEvento && (
        <>
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

          <section>
            <h2 className={styles.h2}>Recargas por recargador</h2>
            {gruposRecarga.length === 0 ? (
              <p className={styles.hint}>Sin recargas todavía.</p>
            ) : (
              <ul className={styles.lista}>
                {gruposRecarga.map((g) => (
                  <li key={g.id}>
                    <span>{g.nombre}</span>
                    <span>
                      {g.count} recargas ·{' '}
                      <strong>{formatearMoneda(g.total)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className={styles.h2}>Devoluciones por operador</h2>
            {gruposDevolucion.length === 0 ? (
              <p className={styles.hint}>Sin devoluciones todavía.</p>
            ) : (
              <ul className={styles.lista}>
                {gruposDevolucion.map((g) => (
                  <li key={g.id}>
                    <span>{g.nombre}</span>
                    <span>
                      {g.count} retiros ·{' '}
                      <strong>{formatearMoneda(g.total)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className={styles.h2}>Ventas por negocio</h2>
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
        </>
      )}

      <section>
        <h2 className={styles.h2}>Pendiente de resolver</h2>
        <div className={styles.accesos}>
          {[
            {
              ruta: RUTAS.ADMIN_SOLICITUDES,
              label: 'Solicitudes de evento',
              n: solicitudes.data?.length,
            },
            {
              ruta: RUTAS.ADMIN_COMPRAS,
              label: 'Compras por aprobar',
              n: comprasPendientes,
            },
            {
              ruta: RUTAS.ADMIN_INCIDENCIAS,
              label: 'Incidencias de recarga',
              n: incidencias.data?.length,
            },
            {
              ruta: RUTAS.ADMIN_REPORTES,
              label: 'Reportes de datos',
              n: reportes.data?.length,
            },
          ].map((a) => (
            <Link key={a.ruta} to={a.ruta} className={styles.acceso}>
              <Card>
                <p className={styles.statLabel}>{a.label}</p>
                <p className={styles.statValor}>{a.n ?? '—'}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {eventos.data && eventos.data.length === 0 && (
        <p className={styles.hint}>
          Todavía no hay eventos.{' '}
          <Link to={RUTAS.ADMIN_EVENTOS} className={styles.enlace}>
            Crear el primero
          </Link>
          .
        </p>
      )}
    </div>
  );
}
