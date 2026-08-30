/* ============================================================================
 * SolicitudForm — el Cliente propone un evento (datos + apariencia de la
 * landing + actividades + cronograma). Sirve para crear y para editar mientras
 * la solicitud sigue pendiente. Manual 8.4: una columna, secciones con fieldset.
 * ========================================================================= */

import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  ColorInput,
  Input,
  SubirImagen,
  Textarea,
} from '@/shared/components/ui';
import {
  COLORES_POR_DEFECTO,
  solicitudSchema,
  type SolicitudFormValues,
} from '../schemas/solicitud.schema';
import type { CrearSolicitudDto, SolicitudEvento } from '../types/solicitudes.types';
import styles from './SolicitudForm.module.css';

interface SolicitudFormProps {
  solicitud?: SolicitudEvento;
  cargando?: boolean;
  errorApi?: string;
  onGuardar: (dto: CrearSolicitudDto) => void;
  onCancelar: () => void;
}

const CAMPOS_COLOR = [
  ['colorPrimario', 'Color primario'],
  ['colorBoton', 'Color de botón'],
  ['colorFondo', 'Color de fondo'],
  ['colorTextoTitulo', 'Texto de títulos'],
  ['colorTextoP', 'Texto de párrafos'],
] as const;

function isoAInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function SolicitudForm({
  solicitud,
  cargando,
  errorApi,
  onGuardar,
  onCancelar,
}: SolicitudFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SolicitudFormValues>({
    resolver: zodResolver(solicitudSchema),
    mode: 'onBlur',
    defaultValues: {
      nombreEvento: solicitud?.nombreEvento ?? '',
      lugar: solicitud?.lugar ?? '',
      fecha: isoAInput(solicitud?.fecha),
      fechaFin: isoAInput(solicitud?.fechaFin),
      descripcion: solicitud?.descripcion ?? '',
      colorPrimario: solicitud?.colorPrimario ?? COLORES_POR_DEFECTO.colorPrimario,
      colorBoton: solicitud?.colorBoton ?? COLORES_POR_DEFECTO.colorBoton,
      colorFondo: solicitud?.colorFondo ?? COLORES_POR_DEFECTO.colorFondo,
      colorTextoTitulo:
        solicitud?.colorTextoTitulo ?? COLORES_POR_DEFECTO.colorTextoTitulo,
      colorTextoP: solicitud?.colorTextoP ?? COLORES_POR_DEFECTO.colorTextoP,
      imagenPortada: solicitud?.imagenPortada ?? undefined,
      mapaLugar: solicitud?.mapaLugar ?? undefined,
      actividades: solicitud?.actividades ?? [{ titulo: '', descripcion: '' }],
      cronograma: solicitud?.cronograma ?? [{ hora: '', actividad: '' }],
    },
  });

  const acts = useFieldArray({ control, name: 'actividades' });
  const crono = useFieldArray({ control, name: 'cronograma' });

  const onSubmit = (v: SolicitudFormValues) => {
    onGuardar({
      nombreEvento: v.nombreEvento.trim(),
      lugar: v.lugar.trim(),
      fecha: new Date(v.fecha).toISOString(),
      fechaFin: new Date(v.fechaFin).toISOString(),
      descripcion: v.descripcion.trim(),
      colorPrimario: v.colorPrimario,
      colorBoton: v.colorBoton,
      colorFondo: v.colorFondo,
      colorTextoTitulo: v.colorTextoTitulo,
      colorTextoP: v.colorTextoP,
      imagenPortada: v.imagenPortada || undefined,
      mapaLugar: v.mapaLugar || undefined,
      actividades: v.actividades,
      cronograma: v.cronograma,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}

      <fieldset className={styles.seccion}>
        <legend>Datos del evento</legend>
        <Input
          label="Nombre del evento"
          autoFocus
          error={errors.nombreEvento?.message}
          {...register('nombreEvento')}
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
        <Textarea
          label="Descripción"
          rows={3}
          hint="Se muestra en la landing pública del evento."
          error={errors.descripcion?.message}
          {...register('descripcion')}
        />
      </fieldset>

      <fieldset className={styles.seccion}>
        <legend>Apariencia de la landing</legend>
        <div className={styles.colores}>
          {CAMPOS_COLOR.map(([name, label]) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field }) => (
                <ColorInput
                  label={label}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors[name]?.message}
                />
              )}
            />
          ))}
        </div>
        <Controller
          control={control}
          name="imagenPortada"
          render={({ field }) => (
            <SubirImagen
              label="Imagen de portada"
              valor={field.value}
              onChange={(v) => field.onChange(v ?? undefined)}
            />
          )}
        />
        <Controller
          control={control}
          name="mapaLugar"
          render={({ field }) => (
            <SubirImagen
              label="Mapa o croquis del lugar"
              valor={field.value}
              onChange={(v) => field.onChange(v ?? undefined)}
            />
          )}
        />
      </fieldset>

      <fieldset className={styles.seccion}>
        <legend>Actividades</legend>
        {errors.actividades?.root && (
          <p className={styles.errorLista}>{errors.actividades.root.message}</p>
        )}
        {acts.fields.map((f, i) => (
          <div key={f.id} className={styles.itemRepetible}>
            <Input
              label="Título"
              error={errors.actividades?.[i]?.titulo?.message}
              {...register(`actividades.${i}.titulo`)}
            />
            <Input
              label="Descripción"
              error={errors.actividades?.[i]?.descripcion?.message}
              {...register(`actividades.${i}.descripcion`)}
            />
            <Button
              variante="terciario"
              tamano="sm"
              onClick={() => acts.remove(i)}
              disabled={acts.fields.length === 1}
            >
              Quitar
            </Button>
          </div>
        ))}
        <Button
          variante="secundario"
          tamano="sm"
          onClick={() => acts.append({ titulo: '', descripcion: '' })}
        >
          Agregar actividad
        </Button>
      </fieldset>

      <fieldset className={styles.seccion}>
        <legend>Cronograma</legend>
        {errors.cronograma?.root && (
          <p className={styles.errorLista}>{errors.cronograma.root.message}</p>
        )}
        {crono.fields.map((f, i) => (
          <div key={f.id} className={styles.itemRepetible}>
            <Input
              label="Hora"
              type="time"
              error={errors.cronograma?.[i]?.hora?.message}
              {...register(`cronograma.${i}.hora`)}
            />
            <Input
              label="Actividad"
              error={errors.cronograma?.[i]?.actividad?.message}
              {...register(`cronograma.${i}.actividad`)}
            />
            <Button
              variante="terciario"
              tamano="sm"
              onClick={() => crono.remove(i)}
              disabled={crono.fields.length === 1}
            >
              Quitar
            </Button>
          </div>
        ))}
        <Button
          variante="secundario"
          tamano="sm"
          onClick={() => crono.append({ hora: '', actividad: '' })}
        >
          Agregar ítem
        </Button>
      </fieldset>

      <div className={styles.pie}>
        <Button variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={cargando}>
          {solicitud ? 'Guardar y reenviar' : 'Enviar solicitud'}
        </Button>
      </div>
    </form>
  );
}
