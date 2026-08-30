/* ============================================================================
 * ClienteEventosPage (/cliente) — el Cliente gestiona sus solicitudes de evento
 * y, en una segunda pestaña, ve el dashboard (solo lectura) de sus eventos
 * aprobados.
 * ========================================================================= */

import { useState } from 'react';
import {
  Button,
  EncabezadoPagina,
  Modal,
  Select,
  Tabs,
  type Tab,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { ROLES } from '@/shared/constants/roles';
import { useSesion } from '@/features/auth';
import { useMisEventosAsignados } from '@/features/eventos';
import { DashboardEvento } from '@/features/dashboard';
import {
  SolicitudCard,
  SolicitudForm,
  useActualizarSolicitud,
  useCrearSolicitud,
  useSolicitudes,
  type SolicitudEvento,
} from '@/features/solicitudes-evento';
import styles from './ClienteEventosPage.module.css';

type Dialogo =
  | { tipo: 'crear' }
  | { tipo: 'editar'; solicitud: SolicitudEvento }
  | null;

const TABS: Tab[] = [
  { id: 'solicitudes', label: 'Mis solicitudes' },
  { id: 'dashboard', label: 'Dashboard del evento' },
];

export function ClienteEventosPage() {
  useTituloPagina('Mis eventos');
  const { usuario } = useSesion();

  const [tab, setTab] = useState('solicitudes');
  const { data: solicitudes, isPending, isError, refetch } = useSolicitudes();
  const misEventos = useMisEventosAsignados(usuario?.id, ROLES.CLIENTE);
  const [eventoId, setEventoId] = useState('');

  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const crear = useCrearSolicitud();
  const editar = useActualizarSolicitud(
    dialogo?.tipo === 'editar' ? dialogo.solicitud.id : '',
  );

  const cerrar = () => {
    setDialogo(null);
    crear.reset();
    editar.reset();
  };

  return (
    <>
      <EncabezadoPagina
        descripcion="Solicita un evento con sus datos, colores y cronograma. Un administrador lo revisa y, al aprobarlo, se crea el evento con su página pública."
        accion={
          <Button onClick={() => setDialogo({ tipo: 'crear' })}>Solicitar evento</Button>
        }
      />

      <Tabs tabs={TABS} activa={tab} onCambiar={setTab}>
        {tab === 'solicitudes' && (
          <>
            {isPending && <EstadoCargando filas={3} />}
            {isError && (
              <EstadoError
                mensaje="No pudimos cargar tus solicitudes."
                onReintentar={refetch}
              />
            )}
            {solicitudes && solicitudes.length === 0 && (
              <EstadoVacio
                titulo="Aún no tienes solicitudes"
                descripcion="Crea la primera para proponer tu evento."
                accion={
                  <Button onClick={() => setDialogo({ tipo: 'crear' })}>
                    Solicitar evento
                  </Button>
                }
              />
            )}
            {solicitudes && solicitudes.length > 0 && (
              <div className={styles.grid}>
                {solicitudes.map((s) => (
                  <SolicitudCard
                    key={s.id}
                    solicitud={s}
                    onEditar={(sol) => setDialogo({ tipo: 'editar', solicitud: sol })}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'dashboard' &&
          (misEventos.isPending ? (
            <EstadoCargando filas={4} />
          ) : !misEventos.data || misEventos.data.length === 0 ? (
            <EstadoVacio
              titulo="Todavía no tienes un evento activo"
              descripcion="Cuando el administrador apruebe tu solicitud, aquí verás su actividad."
            />
          ) : (
            <div className={styles.dash}>
              <div className={styles.selector}>
                <Select
                  label="Evento"
                  value={eventoId}
                  onChange={(e) => setEventoId(e.target.value)}
                >
                  <option value="">Selecciona un evento…</option>
                  {misEventos.data.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              {eventoId && <DashboardEvento eventoId={eventoId} soloLectura />}
            </div>
          ))}
      </Tabs>

      <Modal
        abierto={dialogo !== null}
        onCerrar={cerrar}
        titulo={dialogo?.tipo === 'editar' ? 'Editar solicitud' : 'Solicitar evento'}
        acciones={null}
        bloquearCierreFuera
      >
        {dialogo?.tipo === 'crear' && (
          <SolicitudForm
            cargando={crear.isPending}
            errorApi={crear.error?.mensaje}
            onCancelar={cerrar}
            onGuardar={(dto) => crear.mutate(dto, { onSuccess: cerrar })}
          />
        )}
        {dialogo?.tipo === 'editar' && (
          <SolicitudForm
            solicitud={dialogo.solicitud}
            cargando={editar.isPending}
            errorApi={editar.error?.mensaje}
            onCancelar={cerrar}
            onGuardar={(dto) => editar.mutate(dto, { onSuccess: cerrar })}
          />
        )}
      </Modal>
    </>
  );
}
