/* ============================================================================
 * AdminSolicitudesPage (/admin/solicitudes) — revisar y resolver solicitudes
 * de evento de los clientes.
 * ========================================================================= */

import { useState } from 'react';
import { EncabezadoPagina, Modal, Select } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import {
  SolicitudDetalle,
  SolicitudTabla,
  useAprobarSolicitud,
  useRechazarSolicitud,
  useSolicitudes,
  type EstadoSolicitud,
  type SolicitudEvento,
} from '@/features/solicitudes-evento';
import styles from './AdminSolicitudesPage.module.css';

export function AdminSolicitudesPage() {
  useTituloPagina('Solicitudes de evento');

  const [filtro, setFiltro] = useState<EstadoSolicitud | ''>('pendiente');
  const { data, isPending, isError, refetch } = useSolicitudes(filtro || undefined);
  const [revisar, setRevisar] = useState<SolicitudEvento | null>(null);

  const aprobar = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();

  const cerrar = () => {
    setRevisar(null);
    aprobar.reset();
    rechazar.reset();
  };

  return (
    <>
      <EncabezadoPagina descripcion="Al aprobar una solicitud se crea el evento, su landing pública y se asigna al cliente como organizador." />

      <div className={styles.filtros}>
        <Select
          label="Estado"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as EstadoSolicitud | '')}
        >
          <option value="">Todas</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobadas</option>
          <option value="rechazado">Rechazadas</option>
        </Select>
      </div>

      {isPending && <EstadoCargando filas={5} />}
      {isError && (
        <EstadoError
          mensaje="No pudimos cargar las solicitudes."
          onReintentar={refetch}
        />
      )}
      {data && data.length === 0 && (
        <EstadoVacio titulo="Sin solicitudes" descripcion="No hay solicitudes con ese filtro." />
      )}
      {data && data.length > 0 && (
        <SolicitudTabla solicitudes={data} onRevisar={setRevisar} />
      )}

      <Modal
        abierto={revisar !== null}
        onCerrar={cerrar}
        titulo="Solicitud de evento"
        acciones={null}
      >
        {revisar && (
          <SolicitudDetalle
            solicitud={revisar}
            aprobando={aprobar.isPending}
            rechazando={rechazar.isPending}
            errorApi={aprobar.error?.mensaje ?? rechazar.error?.mensaje}
            onAprobar={() => aprobar.mutate(revisar.id, { onSuccess: cerrar })}
            onRechazar={(motivo) =>
              rechazar.mutate(
                { id: revisar.id, motivoRechazo: motivo },
                { onSuccess: cerrar },
              )
            }
          />
        )}
      </Modal>
    </>
  );
}
