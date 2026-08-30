/* ============================================================================
 * AdminPanelPage (/admin) — resumen: pendientes por resolver y accesos rápidos.
 * ========================================================================= */

import { Link } from 'react-router-dom';
import { Card } from '@/shared/components/ui';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { RUTAS } from '@/shared/constants/rutas';
import { useEventos } from '@/features/eventos';
import { useSolicitudes } from '@/features/solicitudes-evento';
import { useCompras } from '@/features/compras';
import { useIncidencias } from '@/features/incidencias';
import { useReportesEntrada } from '@/features/reportes-entrada';
import styles from './AdminPanelPage.module.css';

export function AdminPanelPage() {
  useTituloPagina('Panel');

  const eventos = useEventos();
  const solicitudes = useSolicitudes('pendiente');
  const compras = useCompras();
  const incidencias = useIncidencias({ estado: 'pendiente' });
  const reportes = useReportesEntrada({ estado: 'pendiente' });

  const comprasPendientes =
    compras.data?.filter((c) => c.estado === 'pendiente').length ?? 0;

  const tarjetas = [
    {
      ruta: RUTAS.ADMIN_SOLICITUDES,
      label: 'Solicitudes de evento',
      valor: solicitudes.data?.length,
      nota: 'pendientes',
    },
    {
      ruta: RUTAS.ADMIN_COMPRAS,
      label: 'Compras por aprobar',
      valor: comprasPendientes,
      nota: 'pendientes',
    },
    {
      ruta: RUTAS.ADMIN_INCIDENCIAS,
      label: 'Incidencias de recarga',
      valor: incidencias.data?.length,
      nota: 'sin resolver',
    },
    {
      ruta: RUTAS.ADMIN_REPORTES,
      label: 'Reportes de datos',
      valor: reportes.data?.length,
      nota: 'sin corregir',
    },
    {
      ruta: RUTAS.ADMIN_EVENTOS,
      label: 'Eventos',
      valor: eventos.data?.filter((e) => e.estado === 'activo').length,
      nota: 'activos',
    },
    {
      ruta: RUTAS.ADMIN_USUARIOS,
      label: 'Usuarios',
      valor: undefined,
      nota: 'gestionar cuentas',
    },
  ];

  return (
    <div className={styles.grid}>
      {tarjetas.map((t) => (
        <Link key={t.ruta} to={t.ruta} className={styles.enlace}>
          <Card>
            <p className={styles.label}>{t.label}</p>
            <p className={styles.valor}>{t.valor ?? '—'}</p>
            <p className={styles.nota}>{t.nota}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
