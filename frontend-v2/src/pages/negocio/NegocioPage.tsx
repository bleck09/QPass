/* ============================================================================
 * NegocioPage (/negocio) — el Usuario Negocio elige uno de sus eventos
 * asignados y administra sus puestos, ve su dashboard de ventas y su billetera.
 * ========================================================================= */

import { useState } from 'react';
import { EncabezadoPagina, Tabs, type Tab } from '@/shared/components/ui';
import { EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { ROLES } from '@/shared/constants/roles';
import { useSesion } from '@/features/auth';
import { SelectorEventoAsignado } from '@/features/eventos';
import { DashboardNegocio } from '@/features/ventas';
import { MiSaldoPanel } from '@/features/transacciones';
import { MisPuestosPanel } from './MisPuestosPanel';
import styles from './NegocioPage.module.css';

const TABS: Tab[] = [
  { id: 'puestos', label: 'Mis puestos' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'billetera', label: 'Mi billetera' },
];

export function NegocioPage() {
  useTituloPagina('Mi negocio');
  const { usuario } = useSesion();
  const [eventoId, setEventoId] = useState('');
  const [tab, setTab] = useState('puestos');

  return (
    <>
      <EncabezadoPagina descripcion="Elige un evento para administrar tus puestos, ver tus ventas y tu billetera." />

      <div className={styles.selector}>
        <SelectorEventoAsignado
          usuarioId={usuario?.id}
          rol={ROLES.USUARIO_NEGOCIO}
          value={eventoId}
          onChange={setEventoId}
        />
      </div>

      {!eventoId ? (
        <EstadoVacio titulo="Elige un evento asignado para empezar" />
      ) : (
        <Tabs tabs={TABS} activa={tab} onCambiar={setTab}>
          {tab === 'puestos' && (
            <MisPuestosPanel eventoId={eventoId} negocioId={usuario?.id} />
          )}
          {tab === 'dashboard' && usuario && (
            <DashboardNegocio eventoId={eventoId} negocioId={usuario.id} />
          )}
          {tab === 'billetera' && usuario && <MiSaldoPanel usuarioId={usuario.id} />}
        </Tabs>
      )}
    </>
  );
}
