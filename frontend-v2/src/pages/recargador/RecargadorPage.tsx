/* ============================================================================
 * RecargadorPage (/recargador) — el recargador elige uno de sus eventos
 * asignados y trabaja sobre él: recargar, ver su historial y sus incidencias.
 * ========================================================================= */

import { useMemo, useState } from 'react';
import { Tabs, type Tab } from '@/shared/components/ui';
import { EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { ROLES } from '@/shared/constants/roles';
import { useSesion } from '@/features/auth';
import { SelectorEventoAsignado } from '@/features/eventos';
import { HistorialTransacciones } from '@/features/transacciones';
import { useIncidencias } from '@/features/incidencias';
import { RecargarPanel } from './RecargarPanel';
import { IncidenciasRecargadorPanel } from './IncidenciasRecargadorPanel';
import styles from './RecargadorPage.module.css';

export function RecargadorPage() {
  useTituloPagina('Recargar saldo');
  const { usuario } = useSesion();

  const [eventoId, setEventoId] = useState('');
  const [tab, setTab] = useState('recargar');

  const incidencias = useIncidencias(eventoId ? { eventoId } : {});
  const pendientes = useMemo(
    () =>
      (incidencias.data ?? []).filter(
        (i) => i.recargadorId === usuario?.id && i.estado === 'pendiente',
      ).length,
    [incidencias.data, usuario?.id],
  );

  const tabs: Tab[] = [
    { id: 'recargar', label: 'Recargar' },
    { id: 'historial', label: 'Historial' },
    { id: 'incidencias', label: pendientes > 0 ? `Incidencias (${pendientes})` : 'Incidencias' },
  ];

  return (
    <div className={styles.contenedor}>
      <div className={styles.selector}>
        <SelectorEventoAsignado
          usuarioId={usuario?.id}
          rol={ROLES.RECARGADOR}
          value={eventoId}
          onChange={setEventoId}
        />
      </div>

      {!eventoId ? (
        <EstadoVacio
          titulo="Elige un evento asignado"
          descripcion="Solo puedes recargar en los eventos donde el administrador te asignó."
        />
      ) : (
        <Tabs tabs={tabs} activa={tab} onCambiar={setTab}>
          {tab === 'recargar' && <RecargarPanel eventoId={eventoId} />}
          {tab === 'historial' && usuario && (
            <HistorialTransacciones
              eventoId={eventoId}
              tipo="recarga"
              operadorId={usuario.id}
            />
          )}
          {tab === 'incidencias' && usuario && (
            <IncidenciasRecargadorPanel eventoId={eventoId} recargadorId={usuario.id} />
          )}
        </Tabs>
      )}
    </div>
  );
}
