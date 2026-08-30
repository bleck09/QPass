/* ============================================================================
 * DevolucionPage (/devolucion) — el encargado elige uno de sus eventos
 * asignados y trabaja sobre él: registrar retiros y ver su historial.
 * ========================================================================= */

import { useState } from 'react';
import { Tabs, type Tab } from '@/shared/components/ui';
import { EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { ROLES } from '@/shared/constants/roles';
import { useSesion } from '@/features/auth';
import { SelectorEventoAsignado } from '@/features/eventos';
import { HistorialTransacciones } from '@/features/transacciones';
import { RegistrarRetiroPanel } from './RegistrarRetiroPanel';
import styles from './DevolucionPage.module.css';

const TABS: Tab[] = [
  { id: 'retiro', label: 'Registrar retiro' },
  { id: 'historial', label: 'Historial' },
];

export function DevolucionPage() {
  useTituloPagina('Devoluciones');
  const { usuario } = useSesion();

  const [eventoId, setEventoId] = useState('');
  const [tab, setTab] = useState('retiro');

  return (
    <div className={styles.contenedor}>
      <div className={styles.selector}>
        <SelectorEventoAsignado
          usuarioId={usuario?.id}
          rol={ROLES.DEVOLUCION}
          value={eventoId}
          onChange={setEventoId}
        />
      </div>

      {!eventoId ? (
        <EstadoVacio
          titulo="Elige un evento asignado"
          descripcion="Solo puedes registrar retiros en los eventos donde el administrador te asignó."
        />
      ) : (
        <Tabs tabs={TABS} activa={tab} onCambiar={setTab}>
          {tab === 'retiro' && <RegistrarRetiroPanel eventoId={eventoId} />}
          {tab === 'historial' && usuario && (
            <HistorialTransacciones
              eventoId={eventoId}
              tipo="devolucion"
              operadorId={usuario.id}
            />
          )}
        </Tabs>
      )}
    </div>
  );
}
