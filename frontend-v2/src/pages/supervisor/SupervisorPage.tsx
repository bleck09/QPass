import { useState } from 'react';
import { Tabs, type Tab } from '@/shared/components/ui';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { ControlAccesoPanel } from './ControlAccesoPanel';
import { EntregarManillasPanel } from './EntregarManillasPanel';

const TABS: Tab[] = [
  { id: 'acceso', label: 'Control de acceso' },
  { id: 'manillas', label: 'Entregar manillas' },
];

export function SupervisorPage() {
  useTituloPagina('Control de acceso');
  const [tab, setTab] = useState('acceso');

  return (
    <Tabs tabs={TABS} activa={tab} onCambiar={setTab}>
      {tab === 'acceso' && <ControlAccesoPanel />}
      {tab === 'manillas' && <EntregarManillasPanel />}
    </Tabs>
  );
}
