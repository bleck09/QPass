/* ============================================================================
 * AdminEventosPage (/admin/eventos) — Gestión de Eventos. Solicitudes de
 * clientes pendientes (aprobar/rechazar), buscador y grid de eventos. Compone
 * las features `eventos`, `solicitudes-evento` y `asignaciones`.
 * ========================================================================= */

import { useMemo, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import {
  Button,
  ConfirmarModal,
  EncabezadoPagina,
  Modal,
  Table,
  Td,
  Textarea,
  Th,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatearFecha } from '@/shared/utils/formatearFecha';
import {
  EventoCard,
  EventoForm,
  useActualizarEvento,
  useCerrarEvento,
  useCrearEvento,
  useEventos,
  type Evento,
} from '@/features/eventos';
import {
  useAprobarSolicitud,
  useRechazarSolicitud,
  useSolicitudes,
  type SolicitudEvento,
} from '@/features/solicitudes-evento';
import { useTodasAsignaciones } from '@/features/asignaciones';
import styles from './AdminEventosPage.module.css';

type Dialogo = { tipo: 'crear' } | { tipo: 'editar'; evento: Evento } | null;

export function AdminEventosPage() {
  useTituloPagina('Gestión de Eventos');

  const { data: eventos, isPending, isError, refetch } = useEventos();
  const solicitudes = useSolicitudes('pendiente');
  const asignaciones = useTodasAsignaciones();
  const aprobar = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();

  const [busqueda, setBusqueda] = useState('');
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aFinalizar, setAFinalizar] = useState<Evento | null>(null);
  const [aRechazar, setARechazar] = useState<SolicitudEvento | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

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

  const asignadosPorEvento = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of asignaciones.data ?? []) {
      m.set(a.eventoId, (m.get(a.eventoId) ?? 0) + 1);
    }
    return m;
  }, [asignaciones.data]);

  const eventosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return eventos ?? [];
    return (eventos ?? []).filter(
      (e) =>
        e.nombre.toLowerCase().includes(t) || e.lugar.toLowerCase().includes(t),
    );
  }, [eventos, busqueda]);

  return (
    <>
      <EncabezadoPagina
        descripcion="Crea eventos y, dentro de cada uno, configura categorías de ticket, códigos QR, personal y su landing pública."
        accion={
          <Button onClick={() => setDialogo({ tipo: 'crear' })}>Crear Evento</Button>
        }
      />

      {solicitudes.data && solicitudes.data.length > 0 && (
        <section className={styles.seccion}>
          <h2 className={styles.h2}>Solicitudes de clientes pendientes</h2>
          <Table>
            <thead>
              <tr>
                <Th>Evento propuesto</Th>
                <Th>Cliente</Th>
                <Th>Lugar</Th>
                <Th>Fecha</Th>
                <Th>
                  <span className="sr-only">Acciones</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.data.map((s) => (
                <tr key={s.id}>
                  <Td>{s.nombreEvento}</Td>
                  <Td>{s.cliente?.nombre ?? '—'}</Td>
                  <Td>{s.lugar}</Td>
                  <Td>{formatearFecha(s.fecha)}</Td>
                  <Td numerico>
                    <div className={styles.filaAcciones}>
                      <Button
                        tamano="sm"
                        cargando={aprobar.isPending}
                        onClick={() => aprobar.mutate(s.id)}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variante="terciario"
                        tamano="sm"
                        onClick={() => {
                          setMotivoRechazo('');
                          setARechazar(s);
                        }}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <div className={styles.buscador}>
        <FaSearch aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar evento por nombre o lugar…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar evento"
        />
      </div>

      {isPending && <EstadoCargando filas={3} />}
      {isError && (
        <EstadoError mensaje="No pudimos cargar los eventos." onReintentar={refetch} />
      )}

      {eventos && eventos.length === 0 && (
        <EstadoVacio
          titulo="Aún no hay eventos"
          descripcion="Crea el primero para empezar a vender entradas."
          accion={
            <Button onClick={() => setDialogo({ tipo: 'crear' })}>Crear Evento</Button>
          }
        />
      )}

      {eventos && eventos.length > 0 && (
        <div className={styles.grid}>
          {eventosFiltrados.map((evento) => (
            <EventoCard
              key={evento.id}
              evento={evento}
              asignados={asignadosPorEvento.get(evento.id) ?? 0}
              onEditar={(e) => setDialogo({ tipo: 'editar', evento: e })}
              onFinalizar={setAFinalizar}
            />
          ))}
          {eventosFiltrados.length === 0 && (
            <p className={styles.sinResultados}>No se encontraron eventos.</p>
          )}
        </div>
      )}

      <Modal
        abierto={dialogo !== null}
        onCerrar={cerrarDialogo}
        titulo={dialogo?.tipo === 'editar' ? 'Editar evento' : 'Crear Evento'}
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

      <Modal
        abierto={aRechazar !== null}
        onCerrar={() => setARechazar(null)}
        titulo="Rechazar solicitud"
        acciones={
          <>
            <Button variante="secundario" onClick={() => setARechazar(null)}>
              Cancelar
            </Button>
            <Button
              variante="destructivo"
              cargando={rechazar.isPending}
              onClick={() =>
                aRechazar &&
                rechazar.mutate(
                  { id: aRechazar.id, motivoRechazo: motivoRechazo.trim() },
                  { onSuccess: () => setARechazar(null) },
                )
              }
            >
              Rechazar
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo del rechazo"
          hint="Lo verá el cliente en su solicitud."
          rows={3}
          value={motivoRechazo}
          onChange={(e) => setMotivoRechazo(e.target.value)}
        />
      </Modal>
    </>
  );
}
