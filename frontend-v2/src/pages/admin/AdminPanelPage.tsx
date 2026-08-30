/* ============================================================================
 * AdminPanelPage (/admin) — Dashboard General. Elegís un evento y ves su
 * actividad (DashboardEvento). Abajo, accesos rápidos a lo pendiente.
 * ========================================================================= */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/components/ui';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { RUTAS } from '@/shared/constants/rutas';
import { SelectorEvento, useEventos } from '@/features/eventos';
import { DashboardEvento } from '@/features/dashboard';
import { useSolicitudes } from '@/features/solicitudes-evento';
import { useCompras } from '@/features/compras';
import { useIncidencias } from '@/features/incidencias';
import { useReportesEntrada } from '@/features/reportes-entrada';
import styles from './AdminPanelPage.module.css';

export function AdminPanelPage() {
  useTituloPagina('Dashboard General');

  const eventos = useEventos();
  const [eventoId, setEventoId] = useState('');

  const solicitudes = useSolicitudes('pendiente');
  const compras = useCompras();
  const incidencias = useIncidencias({ estado: 'pendiente' });
  const reportes = useReportesEntrada({ estado: 'pendiente' });

  const comprasPendientes =
    compras.data?.filter((c) => c.estado === 'pendiente').length ?? 0;

  return (
    <div className={styles.pagina}>
      <div className={styles.selector}>
        <SelectorEvento value={eventoId} onChange={setEventoId} soloActivos={false} />
      </div>

      {!eventoId ? (
        <p className={styles.hint}>
          Elegí un evento para ver su actividad, o revisá lo pendiente más abajo.
        </p>
      ) : (
        <DashboardEvento eventoId={eventoId} />
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
