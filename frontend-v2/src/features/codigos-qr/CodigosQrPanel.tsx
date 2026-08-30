/* ============================================================================
 * CodigosQrPanel — genera el pool de manillas QR de un evento, muestra el
 * resumen (total / disponibles / vinculados / anulados), descarga el PDF para
 * imprimir y permite borrar los no vinculados.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  ConfirmarModal,
  Input,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError } from '@/shared/components/feedback';
import { descargarQrPdf } from '@/shared/utils/qrPdf';
import {
  useCodigosQr,
  useEliminarQrNoVinculados,
  useGenerarQr,
} from './codigos-qr';
import styles from './CodigosQrPanel.module.css';

const generarSchema = z.object({
  cantidad: z
    .string()
    .min(1, 'Requerido')
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 2000;
    }, 'Entre 1 y 2000'),
  prefijo: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{0,3}$/, '0 a 3 letras')
    .optional()
    .or(z.literal('')),
});
type GenerarValues = z.infer<typeof generarSchema>;

interface CodigosQrPanelProps {
  eventoId: string;
  nombreEvento: string;
  prefijoEvento?: string | null;
}

export function CodigosQrPanel({
  eventoId,
  nombreEvento,
  prefijoEvento,
}: CodigosQrPanelProps) {
  const { data, isPending, isError, refetch } = useCodigosQr(eventoId);
  const generar = useGenerarQr(eventoId);
  const borrar = useEliminarQrNoVinculados(eventoId);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerarValues>({
    resolver: zodResolver(generarSchema),
    defaultValues: { prefijo: prefijoEvento ?? '' },
  });

  const resumen = data
    ? {
        total: data.length,
        vinculados: data.filter((c) => c.entradaId && !c.anulado).length,
        disponibles: data.filter((c) => !c.entradaId && !c.anulado).length,
        anulados: data.filter((c) => c.anulado).length,
      }
    : null;

  const onGenerar = (v: GenerarValues) => {
    generar.mutate({
      eventoId,
      cantidad: Number(v.cantidad),
      prefijo: v.prefijo ? String(v.prefijo).toUpperCase() : undefined,
    });
  };

  const onDescargar = async () => {
    if (!data || data.length === 0) return;
    setGenerandoPdf(true);
    try {
      await descargarQrPdf(
        data.map((c) => ({ codigo: c.codigo, numero: c.numero })),
        nombreEvento,
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={handleSubmit(onGenerar)} noValidate>
        {generar.isError && <Alert tipo="error">{generar.error.mensaje}</Alert>}
        <div className={styles.fila}>
          <Input
            label="Cantidad a generar"
            type="number"
            inputMode="numeric"
            error={errors.cantidad?.message}
            {...register('cantidad')}
          />
          <Input
            label="Prefijo"
            opcional
            maxLength={3}
            hint="1 a 3 letras al inicio del código"
            error={errors.prefijo?.message}
            {...register('prefijo')}
          />
          <Button type="submit" cargando={generar.isPending}>
            Generar
          </Button>
        </div>
        {generar.isSuccess && (
          <Alert tipo="exito">Se generaron {generar.data.length} códigos.</Alert>
        )}
      </form>

      {isPending && <EstadoCargando filas={2} />}
      {isError && <EstadoError onReintentar={refetch} />}

      {resumen && (
        <>
          <dl className={styles.resumen}>
            <div>
              <dt>Total</dt>
              <dd>{resumen.total}</dd>
            </div>
            <div>
              <dt>Disponibles</dt>
              <dd>{resumen.disponibles}</dd>
            </div>
            <div>
              <dt>Vinculados</dt>
              <dd>{resumen.vinculados}</dd>
            </div>
            <div>
              <dt>Anulados</dt>
              <dd>{resumen.anulados}</dd>
            </div>
          </dl>

          <div className={styles.acciones}>
            <Button
              variante="secundario"
              onClick={onDescargar}
              cargando={generandoPdf}
              disabled={resumen.total === 0}
            >
              Descargar PDF para imprimir
            </Button>
            <Button
              variante="terciario"
              onClick={() => setConfirmarBorrar(true)}
              disabled={resumen.disponibles === 0}
            >
              Borrar no vinculados ({resumen.disponibles})
            </Button>
          </div>
        </>
      )}

      <ConfirmarModal
        abierto={confirmarBorrar}
        titulo="Borrar códigos no vinculados"
        textoConfirmar="Borrar"
        destructivo
        cargando={borrar.isPending}
        onCancelar={() => setConfirmarBorrar(false)}
        onConfirmar={() =>
          borrar.mutate(undefined, { onSuccess: () => setConfirmarBorrar(false) })
        }
      >
        Se eliminarán solo los códigos que todavía no están asignados a una
        entrada. La numeración no se reinicia.
      </ConfirmarModal>
    </div>
  );
}
