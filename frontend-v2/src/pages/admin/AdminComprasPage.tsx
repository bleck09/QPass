/* ============================================================================
 * AdminComprasPage (/admin/compras) — revisar y aprobar/rechazar compras de
 * entradas. Al aprobar, el backend crea/vincula las cuentas de los invitados.
 * ========================================================================= */

import { useState } from 'react';
import {
  Button,
  EncabezadoPagina,
  Modal,
  Select,
  Table,
  Td,
  Th,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatearFecha } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useEventos } from '@/features/eventos';
import {
  CompraRevision,
  EstadoCompraBadge,
  useAprobarCompra,
  useCompras,
  useRechazarCompra,
  type Compra,
} from '@/features/compras';
import styles from './AdminComprasPage.module.css';

export function AdminComprasPage() {
  useTituloPagina('Compras');

  const eventos = useEventos();
  const [eventoId, setEventoId] = useState('');
  const { data, isPending, isError, refetch } = useCompras(eventoId || undefined);
  const [revisar, setRevisar] = useState<Compra | null>(null);

  const aprobar = useAprobarCompra();
  const rechazar = useRechazarCompra();

  const cerrar = () => {
    setRevisar(null);
    aprobar.reset();
    rechazar.reset();
  };

  const passwords =
    aprobar.data && revisar && aprobar.data.id === revisar.id
      ? aprobar.data.passwordsGeneradas
      : null;

  return (
    <>
      <EncabezadoPagina descripcion="Cada compra reserva el cupo al enviarse. Aprobarla crea las cuentas de los invitados y confirma las entradas; rechazarla libera el cupo." />

      <div className={styles.filtros}>
        <Select
          label="Evento"
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
        >
          <option value="">Todos los eventos</option>
          {eventos.data?.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.nombre}
            </option>
          ))}
        </Select>
      </div>

      {isPending && <EstadoCargando filas={5} />}
      {isError && <EstadoError onReintentar={refetch} />}
      {data && data.length === 0 && (
        <EstadoVacio titulo="Sin compras" descripcion="No hay compras con ese filtro." />
      )}
      {data && data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Comprador</Th>
              <Th numerico>Entradas</Th>
              <Th numerico>Total</Th>
              <Th>Fecha</Th>
              <Th>Estado</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <Td>{c.comprador?.nombre ?? '—'}</Td>
                <Td numerico>{c.entradas.length}</Td>
                <Td numerico>{formatearMoneda(c.montoTotal)}</Td>
                <Td>{formatearFecha(c.createdAt)}</Td>
                <Td>
                  <EstadoCompraBadge estado={c.estado} />
                </Td>
                <Td numerico>
                  <Button
                    variante="terciario"
                    tamano="sm"
                    onClick={() => setRevisar(c)}
                  >
                    {c.estado === 'pendiente' ? 'Revisar' : 'Ver'}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        abierto={revisar !== null}
        onCerrar={cerrar}
        titulo="Compra de entradas"
        acciones={null}
      >
        {revisar && (
          <CompraRevision
            compra={revisar}
            aprobando={aprobar.isPending}
            rechazando={rechazar.isPending}
            errorApi={aprobar.error?.mensaje ?? rechazar.error?.mensaje}
            passwordsGeneradas={passwords}
            onAprobar={() =>
              aprobar.mutate(revisar.id, {
                onSuccess: (data) => setRevisar(data),
              })
            }
            onRechazar={(motivo) =>
              rechazar.mutate(
                { id: revisar.id, motivoRechazo: motivo || undefined },
                { onSuccess: cerrar },
              )
            }
          />
        )}
      </Modal>
    </>
  );
}
