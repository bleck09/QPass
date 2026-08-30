/* ============================================================================
 * ComprarEntradasForm — el Usuario compra un lote de entradas: la primera es
 * suya (titular), las demás son invitados. Sube el comprobante de pago. El
 * cupo se reserva al confirmar (lo maneja el backend de forma atómica).
 * ========================================================================= */

import { useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  Input,
  Select,
  SubirImagen,
} from '@/shared/components/ui';
import { EstadoCargando } from '@/shared/components/feedback';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useCategoriasTicket } from '@/features/categorias-ticket';
import { useSesion } from '@/features/auth';
import type { CrearCompraDto } from '../compras';
import styles from './ComprarEntradasForm.module.css';

const entradaSchema = z.object({
  categoriaTicketId: z.string().min(1, 'Elige una categoría'),
  nombre: z.string().trim().min(1, 'Nombre requerido'),
  correo: z.string().trim().min(1, 'Correo requerido').email('Correo no válido'),
  celular: z.string().trim().optional().or(z.literal('')),
});

const schema = z.object({
  entradas: z.array(entradaSchema).min(1),
  comprobanteUrl: z.string().min(1, 'Sube el comprobante de pago'),
});
type Values = z.infer<typeof schema>;

interface ComprarEntradasFormProps {
  eventoId: string;
  cargando?: boolean;
  errorApi?: string;
  onGuardar: (dto: CrearCompraDto) => void;
  onCancelar: () => void;
}

export function ComprarEntradasForm({
  eventoId,
  cargando,
  errorApi,
  onGuardar,
  onCancelar,
}: ComprarEntradasFormProps) {
  const { usuario } = useSesion();
  const categorias = useCategoriasTicket(eventoId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      entradas: [
        {
          categoriaTicketId: '',
          nombre: usuario?.nombre ?? '',
          correo: usuario?.email ?? '',
          celular: '',
        },
      ],
      comprobanteUrl: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'entradas' });
  const seleccion = watch('entradas');

  const total = useMemo(() => {
    if (!categorias.data) return 0;
    return seleccion.reduce((suma, e) => {
      const cat = categorias.data.find((c) => c.id === e.categoriaTicketId);
      return suma + (cat ? Number(cat.precio) : 0);
    }, 0);
  }, [seleccion, categorias.data]);

  if (categorias.isPending) return <EstadoCargando filas={3} />;

  const sinCategorias = !categorias.data || categorias.data.length === 0;

  const onSubmit = (v: Values) => {
    onGuardar({
      eventoId,
      comprobanteUrl: v.comprobanteUrl,
      entradas: v.entradas.map((e, i) => ({
        categoriaTicketId: e.categoriaTicketId,
        isTitular: i === 0,
        nombre: e.nombre.trim(),
        correo: e.correo.trim(),
        celular: e.celular?.trim() || undefined,
      })),
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}
      {sinCategorias && (
        <Alert tipo="aviso">Este evento todavía no tiene entradas a la venta.</Alert>
      )}

      {fields.map((f, i) => (
        <fieldset key={f.id} className={styles.persona}>
          <legend>{i === 0 ? 'Tu entrada (titular)' : `Invitado ${i}`}</legend>
          <Select
            label="Categoría"
            error={errors.entradas?.[i]?.categoriaTicketId?.message}
            {...register(`entradas.${i}.categoriaTicketId`)}
          >
            <option value="">Elige…</option>
            {categorias.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — {formatearMoneda(c.precio)}
              </option>
            ))}
          </Select>
          <div className={styles.fila}>
            <Input
              label="Nombre"
              error={errors.entradas?.[i]?.nombre?.message}
              {...register(`entradas.${i}.nombre`)}
            />
            <Input
              label="Correo"
              type="email"
              hint={i > 0 ? 'Recibirá su acceso a este correo' : undefined}
              error={errors.entradas?.[i]?.correo?.message}
              {...register(`entradas.${i}.correo`)}
            />
            <Input
              label="Celular"
              type="tel"
              opcional
              {...register(`entradas.${i}.celular`)}
            />
          </div>
          {i > 0 && (
            <Button variante="terciario" tamano="sm" onClick={() => remove(i)}>
              Quitar invitado
            </Button>
          )}
        </fieldset>
      ))}

      <Button
        variante="secundario"
        tamano="sm"
        onClick={() =>
          append({ categoriaTicketId: '', nombre: '', correo: '', celular: '' })
        }
      >
        Agregar invitado
      </Button>

      <Controller
        control={control}
        name="comprobanteUrl"
        render={({ field }) => (
          <SubirImagen
            label="Comprobante de pago"
            valor={field.value || null}
            onChange={(v) => field.onChange(v ?? '')}
            hint="Transfiere el total al QR fijo de la página y sube la captura."
          />
        )}
      />
      {errors.comprobanteUrl && (
        <p className={styles.err}>{errors.comprobanteUrl.message}</p>
      )}

      <div className={styles.total}>
        <span>Total a pagar</span>
        <strong>{formatearMoneda(total)}</strong>
      </div>

      <div className={styles.pie}>
        <Button variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" variante="compra" cargando={cargando} disabled={sinCategorias}>
          Enviar compra
        </Button>
      </div>
    </form>
  );
}
