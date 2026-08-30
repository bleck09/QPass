/* ============================================================================
 * NegocioPage (/negocio) — el Usuario Negocio administra sus puestos de un
 * evento: productos y ayudantes.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  EncabezadoPagina,
  Input,
  Modal,
  Textarea,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { useSesion } from '@/features/auth';
import { SelectorEvento } from '@/features/eventos';
import { PuestoCard, useCrearPuesto, usePuestos } from '@/features/puestos';
import styles from './NegocioPage.module.css';

const schema = z.object({
  nombre: z.string().trim().min(1, 'Indica el nombre'),
  descripcion: z.string().trim().optional().or(z.literal('')),
});
type Values = z.infer<typeof schema>;

export function NegocioPage() {
  useTituloPagina('Mi negocio');
  const { usuario } = useSesion();
  const [eventoId, setEventoId] = useState('');
  const { data, isPending, isError, refetch } = usePuestos(eventoId, usuario?.id);
  const crear = useCrearPuesto();
  const [crearAbierto, setCrearAbierto] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const cerrar = () => {
    setCrearAbierto(false);
    crear.reset();
    reset();
  };

  return (
    <>
      <EncabezadoPagina
        descripcion="Elige un evento para administrar tus puestos, productos y ayudantes."
        accion={
          <Button onClick={() => setCrearAbierto(true)} disabled={!eventoId}>
            Crear puesto
          </Button>
        }
      />

      <div className={styles.selector}>
        <SelectorEvento value={eventoId} onChange={setEventoId} />
      </div>

      {!eventoId && <EstadoVacio titulo="Elige un evento para empezar" />}
      {eventoId && isPending && <EstadoCargando filas={3} />}
      {eventoId && isError && <EstadoError onReintentar={refetch} />}
      {eventoId && data && data.length === 0 && (
        <EstadoVacio
          titulo="Sin puestos en este evento"
          descripcion="Crea tu primer puesto para cargar productos."
          accion={<Button onClick={() => setCrearAbierto(true)}>Crear puesto</Button>}
        />
      )}
      {eventoId && data && data.length > 0 && (
        <div className={styles.grid}>
          {data.map((p) => (
            <PuestoCard key={p.id} puesto={p} />
          ))}
        </div>
      )}

      <Modal
        abierto={crearAbierto}
        onCerrar={cerrar}
        titulo="Crear puesto"
        acciones={null}
      >
        {crear.isError && <Alert tipo="error">{crear.error.mensaje}</Alert>}
        <form
          className={styles.form}
          onSubmit={handleSubmit((v) =>
            crear.mutate(
              {
                eventoId,
                nombre: v.nombre.trim(),
                descripcion: v.descripcion?.trim() || undefined,
              },
              { onSuccess: cerrar },
            ),
          )}
          noValidate
        >
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
          <Textarea label="Descripción" opcional rows={2} {...register('descripcion')} />
          <div className={styles.pie}>
            <Button variante="secundario" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" cargando={crear.isPending}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
