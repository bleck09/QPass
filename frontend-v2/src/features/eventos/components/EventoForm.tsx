/* ============================================================================
 * EventoForm — alta y edición de un Evento. Una columna, labels arriba
 * (Manual 8.4). Sirve para crear (sin `evento`) y editar (con `evento`).
 * ========================================================================= */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input } from '@/shared/components/ui';
import { eventoSchema, type EventoFormValues } from '../schemas/evento.schema';
import type { CrearEventoDto, Evento } from '../types/eventos.types';
import styles from './EventoForm.module.css';

interface EventoFormProps {
  evento?: Evento;
  cargando?: boolean;
  errorApi?: string;
  onGuardar: (dto: CrearEventoDto) => void;
  onCancelar: () => void;
}

/** ISO -> valor para <input type="datetime-local"> (YYYY-MM-DDTHH:mm, hora local). */
function isoAInputLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function EventoForm({
  evento,
  cargando,
  errorApi,
  onGuardar,
  onCancelar,
}: EventoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventoFormValues>({
    resolver: zodResolver(eventoSchema),
    mode: 'onBlur',
    defaultValues: {
      nombre: evento?.nombre ?? '',
      lugar: evento?.lugar ?? '',
      fecha: isoAInputLocal(evento?.fecha),
      fechaFin: isoAInputLocal(evento?.fechaFin),
      imagen: evento?.imagen ?? '',
      qrPrefijo: evento?.qrPrefijo ?? '',
    },
  });

  const onSubmit = (v: EventoFormValues) => {
    onGuardar({
      nombre: v.nombre.trim(),
      lugar: v.lugar.trim(),
      fecha: new Date(v.fecha).toISOString(),
      fechaFin: new Date(v.fechaFin).toISOString(),
      imagen: v.imagen?.trim() || undefined,
      qrPrefijo: v.qrPrefijo?.trim() ? v.qrPrefijo.trim().toUpperCase() : undefined,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}

      <Input
        label="Nombre del evento"
        autoFocus
        error={errors.nombre?.message}
        {...register('nombre')}
      />
      <Input label="Lugar" error={errors.lugar?.message} {...register('lugar')} />

      <div className={styles.fila2}>
        <Input
          label="Inicio"
          type="datetime-local"
          error={errors.fecha?.message}
          {...register('fecha')}
        />
        <Input
          label="Fin"
          type="datetime-local"
          error={errors.fechaFin?.message}
          {...register('fechaFin')}
        />
      </div>

      <Input
        label="Imagen (URL)"
        type="url"
        opcional
        placeholder="https://…"
        error={errors.imagen?.message}
        {...register('imagen')}
      />
      <Input
        label="Prefijo de QR"
        opcional
        hint="1 a 3 letras al inicio de cada código de manilla"
        maxLength={3}
        error={errors.qrPrefijo?.message}
        {...register('qrPrefijo')}
      />

      <div className={styles.pie}>
        <Button variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={cargando}>
          {evento ? 'Guardar cambios' : 'Crear evento'}
        </Button>
      </div>
    </form>
  );
}
