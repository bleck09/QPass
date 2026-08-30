/* ============================================================================
 * LandingConfigPanel — edita la landing pública del evento (título, texto,
 * colores, imagen, actividades y cronograma). Al aprobar una solicitud ya se
 * crea con datos; aquí el Admin la ajusta.
 * ========================================================================= */

import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  ColorInput,
  Input,
  SubirImagen,
  Textarea,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError } from '@/shared/components/feedback';
import {
  useGuardarLanding,
  useLandingConfig,
  type GuardarLandingDto,
} from './landing-config';
import styles from './LandingConfigPanel.module.css';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex de 6 dígitos');

const schema = z.object({
  titulo: z.string().trim().min(1, 'Indica el título'),
  informacion: z.string().trim().min(10, 'Describe el evento'),
  imagen: z.string().optional(),
  colorPrimario: hex,
  colorBoton: hex,
  colorFondo: hex,
  colorTextoTitulo: hex,
  colorTextoP: hex,
  actividades: z.array(
    z.object({
      icono: z.string().trim().optional().or(z.literal('')),
      titulo: z.string().trim().min(1, 'Título requerido'),
      descripcion: z.string().trim().min(1, 'Descripción requerida'),
    }),
  ),
  cronograma: z.array(
    z.object({
      hora: z.string().trim().min(1, 'Hora requerida'),
      actividad: z.string().trim().min(1, 'Actividad requerida'),
    }),
  ),
});
type Values = z.infer<typeof schema>;

const COLORES = [
  ['colorPrimario', 'Primario'],
  ['colorBoton', 'Botón'],
  ['colorFondo', 'Fondo'],
  ['colorTextoTitulo', 'Texto títulos'],
  ['colorTextoP', 'Texto párrafos'],
] as const;

export function LandingConfigPanel({
  eventoId,
  nombreEvento,
}: {
  eventoId: string;
  nombreEvento: string;
}) {
  const { data, isPending, isError, refetch } = useLandingConfig(eventoId);
  const guardar = useGuardarLanding(eventoId);

  if (isPending) return <EstadoCargando filas={4} />;
  if (isError) return <EstadoError onReintentar={refetch} />;

  return (
    <LandingForm
      key={data?.updatedAt ?? 'nueva'}
      defaults={{
        titulo: data?.titulo ?? nombreEvento,
        informacion: data?.informacion ?? '',
        imagen: data?.imagen ?? undefined,
        colorPrimario: data?.colorPrimario ?? '#0f7d8c',
        colorBoton: data?.colorBoton ?? '#0f7d8c',
        colorFondo: data?.colorFondo ?? '#0b1120',
        colorTextoTitulo: data?.colorTextoTitulo ?? '#ffffff',
        colorTextoP: data?.colorTextoP ?? '#c9d3dd',
        actividades: data?.actividades ?? [],
        cronograma: data?.cronograma ?? [],
      }}
      cargando={guardar.isPending}
      exito={guardar.isSuccess}
      errorApi={guardar.error?.mensaje}
      onGuardar={(dto) => guardar.mutate(dto)}
    />
  );
}

function LandingForm({
  defaults,
  cargando,
  exito,
  errorApi,
  onGuardar,
}: {
  defaults: Values;
  cargando?: boolean;
  exito?: boolean;
  errorApi?: string;
  onGuardar: (dto: GuardarLandingDto) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });

  const acts = useFieldArray({ control, name: 'actividades' });
  const crono = useFieldArray({ control, name: 'cronograma' });

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit((v) =>
        onGuardar({ ...v, imagen: v.imagen || undefined }),
      )}
      noValidate
    >
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}
      {exito && <Alert tipo="exito">Landing guardada.</Alert>}

      <Input label="Título" error={errors.titulo?.message} {...register('titulo')} />
      <Textarea
        label="Información"
        rows={3}
        error={errors.informacion?.message}
        {...register('informacion')}
      />

      <Controller
        control={control}
        name="imagen"
        render={({ field }) => (
          <SubirImagen
            label="Imagen principal"
            valor={field.value}
            onChange={(v) => field.onChange(v ?? undefined)}
          />
        )}
      />

      <div className={styles.colores}>
        {COLORES.map(([name, label]) => (
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

      <fieldset className={styles.seccion}>
        <legend>Actividades</legend>
        {acts.fields.map((f, i) => (
          <div key={f.id} className={styles.item}>
            <Input label="Ícono" opcional {...register(`actividades.${i}.icono`)} />
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
            <Button variante="terciario" tamano="sm" onClick={() => acts.remove(i)}>
              Quitar
            </Button>
          </div>
        ))}
        <Button
          variante="secundario"
          tamano="sm"
          onClick={() => acts.append({ icono: '', titulo: '', descripcion: '' })}
        >
          Agregar actividad
        </Button>
      </fieldset>

      <fieldset className={styles.seccion}>
        <legend>Cronograma</legend>
        {crono.fields.map((f, i) => (
          <div key={f.id} className={styles.item}>
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
            <Button variante="terciario" tamano="sm" onClick={() => crono.remove(i)}>
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
        <Button type="submit" cargando={cargando}>
          Guardar landing
        </Button>
      </div>
    </form>
  );
}
