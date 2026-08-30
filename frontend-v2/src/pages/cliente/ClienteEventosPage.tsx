/* ============================================================================
 * ClienteEventosPage (/cliente) — el Cliente ve sus solicitudes de evento y
 * puede crear una nueva o editar las que sigan pendientes/rechazadas.
 * ========================================================================= */

import { useState } from 'react';
import { Button, EncabezadoPagina, Modal } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
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

export function ClienteEventosPage() {
  useTituloPagina('Mis eventos');

  const { data: solicitudes, isPending, isError, refetch } = useSolicitudes();
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

      {isPending && <EstadoCargando filas={3} />}
      {isError && (
        <EstadoError mensaje="No pudimos cargar tus solicitudes." onReintentar={refetch} />
      )}
      {solicitudes && solicitudes.length === 0 && (
        <EstadoVacio
          titulo="Aún no tienes solicitudes"
          descripcion="Crea la primera para proponer tu evento."
          accion={
            <Button onClick={() => setDialogo({ tipo: 'crear' })}>Solicitar evento</Button>
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
