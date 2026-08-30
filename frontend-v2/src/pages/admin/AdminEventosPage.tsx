/* ============================================================================
 * AdminEventosPage — lista y gestiona los eventos. Solo compone la feature
 * `eventos` (Anexo B B2: las páginas no tienen lógica de negocio).
 * ========================================================================= */

import { useState } from 'react';
import {
  Button,
  ConfirmarModal,
  EncabezadoPagina,
  Modal,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import {
  EventoCard,
  EventoForm,
  useActualizarEvento,
  useCerrarEvento,
  useCrearEvento,
  useEventos,
  type Evento,
} from '@/features/eventos';
import styles from './AdminEventosPage.module.css';

type Dialogo = { tipo: 'crear' } | { tipo: 'editar'; evento: Evento } | null;

export function AdminEventosPage() {
  useTituloPagina('Eventos');

  const { data: eventos, isPending, isError, refetch } = useEventos();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aFinalizar, setAFinalizar] = useState<Evento | null>(null);

  const crear = useCrearEvento();
  const cerrar = useCerrarEvento();
  const editar = useActualizarEvento(
    dialogo?.tipo === 'editar' ? dialogo.evento.id : '',
  );

  const cerrarDialogo = () => {
    setDialogo(null);
    crear.reset();
    editar.reset();
  };

  return (
    <>
      <EncabezadoPagina
        descripcion="Crea y administra los eventos. Desde cada evento se configuran categorías de ticket, códigos QR y la landing pública."
        accion={
          <Button onClick={() => setDialogo({ tipo: 'crear' })}>Crear evento</Button>
        }
      />

      {isPending && <EstadoCargando filas={3} />}

      {isError && (
        <EstadoError mensaje="No pudimos cargar los eventos." onReintentar={refetch} />
      )}

      {eventos && eventos.length === 0 && (
        <EstadoVacio
          titulo="Aún no hay eventos"
          descripcion="Crea el primero para empezar a vender entradas."
          accion={
            <Button onClick={() => setDialogo({ tipo: 'crear' })}>Crear evento</Button>
          }
        />
      )}

      {eventos && eventos.length > 0 && (
        <div className={styles.grid}>
          {eventos.map((evento) => (
            <EventoCard
              key={evento.id}
              evento={evento}
              onEditar={(e) => setDialogo({ tipo: 'editar', evento: e })}
              onFinalizar={setAFinalizar}
            />
          ))}
        </div>
      )}

      {/* Crear / Editar */}
      <Modal
        abierto={dialogo !== null}
        onCerrar={cerrarDialogo}
        titulo={dialogo?.tipo === 'editar' ? 'Editar evento' : 'Crear evento'}
        acciones={null}
        bloquearCierreFuera
      >
        {dialogo?.tipo === 'crear' && (
          <EventoForm
            cargando={crear.isPending}
            errorApi={crear.error?.mensaje}
            onCancelar={cerrarDialogo}
            onGuardar={(dto) => crear.mutate(dto, { onSuccess: cerrarDialogo })}
          />
        )}
        {dialogo?.tipo === 'editar' && (
          <EventoForm
            evento={dialogo.evento}
            cargando={editar.isPending}
            errorApi={editar.error?.mensaje}
            onCancelar={cerrarDialogo}
            onGuardar={(dto) => editar.mutate(dto, { onSuccess: cerrarDialogo })}
          />
        )}
      </Modal>

      {/* Finalizar */}
      <ConfirmarModal
        abierto={aFinalizar !== null}
        titulo="Finalizar evento"
        textoConfirmar="Finalizar"
        cargando={cerrar.isPending}
        onCancelar={() => setAFinalizar(null)}
        onConfirmar={() =>
          aFinalizar &&
          cerrar.mutate(aFinalizar.id, { onSuccess: () => setAFinalizar(null) })
        }
      >
        Al finalizar <strong>{aFinalizar?.nombre}</strong> se bloquean recargas,
        ventas, devoluciones e ingresos/salidas de QR en ese evento. No se puede
        deshacer.
      </ConfirmarModal>
    </>
  );
}
