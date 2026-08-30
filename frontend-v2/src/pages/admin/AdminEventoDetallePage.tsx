/* ============================================================================
 * AdminEventoDetallePage (/admin/eventos/:id) — configuración de un evento:
 * categorías de ticket, códigos QR, personal y landing pública.
 * ========================================================================= */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tabs, type Tab } from '@/shared/components/ui';
import { EstadoCargando, EstadoError } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { RUTAS } from '@/shared/constants/rutas';
import { useEvento } from '@/features/eventos';
import { CategoriaTicketPanel } from '@/features/categorias-ticket';
import { CodigosQrPanel } from '@/features/codigos-qr';
import { AsignacionesPanel } from '@/features/asignaciones';
import { LandingConfigPanel } from '@/features/landing-config';
import { MapaRecintoPanel } from '@/features/puestos';
import styles from './AdminEventoDetallePage.module.css';

const TABS: Tab[] = [
  { id: 'tickets', label: 'Categorías de ticket' },
  { id: 'qr', label: 'Códigos QR' },
  { id: 'personal', label: 'Personal' },
  { id: 'recinto', label: 'Recinto' },
  { id: 'landing', label: 'Landing pública' },
];

export function AdminEventoDetallePage() {
  const { id = '' } = useParams();
  const { data: evento, isPending, isError, refetch } = useEvento(id);
  const [tab, setTab] = useState('tickets');

  useTituloPagina(evento ? evento.nombre : 'Evento');

  if (isPending) return <EstadoCargando filas={4} />;
  if (isError || !evento)
    return <EstadoError mensaje="No pudimos cargar el evento." onReintentar={refetch} />;

  return (
    <>
      <p className={styles.volver}>
        <Link to={RUTAS.ADMIN_EVENTOS} className={styles.enlace}>
          ← Volver a eventos
        </Link>
      </p>

      <Tabs tabs={TABS} activa={tab} onCambiar={setTab}>
        {tab === 'tickets' && <CategoriaTicketPanel eventoId={evento.id} />}
        {tab === 'qr' && (
          <CodigosQrPanel
            eventoId={evento.id}
            nombreEvento={evento.nombre}
            prefijoEvento={evento.qrPrefijo}
          />
        )}
        {tab === 'personal' && <AsignacionesPanel eventoId={evento.id} />}
        {tab === 'recinto' && <MapaRecintoPanel eventoId={evento.id} />}
        {tab === 'landing' && (
          <LandingConfigPanel eventoId={evento.id} nombreEvento={evento.nombre} />
        )}
      </Tabs>
    </>
  );
}
