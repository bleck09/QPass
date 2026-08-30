/* ============================================================================
 * RegistrarRetiroPanel — escanea la manilla y registra el retiro de saldo. La
 * foto del carnet de quien retira es obligatoria. La manilla debe pertenecer al
 * evento seleccionado.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, CapturarFoto, Input } from '@/shared/components/ui';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { EscanerEntrada, TarjetaEntrada, type Entrada } from '@/features/entradas';
import { useDevolver } from '@/features/transacciones';
import styles from './DevolucionPage.module.css';

const schema = z.object({
  monto: z.string().refine((v) => Number(v) > 0, 'Ingresa un monto mayor a 0'),
});
type Values = z.infer<typeof schema>;

export function RegistrarRetiroPanel({ eventoId }: { eventoId: string }) {
  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [fotoCarnet, setFotoCarnet] = useState<string | null>(null);
  const devolver = useDevolver();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const sinCuenta = entrada != null && entrada.usuarioId == null;
  const otroEvento = entrada != null && entrada.eventoId !== eventoId;
  const bloqueado = sinCuenta || otroEvento;

  const onSubmit = (v: Values) => {
    if (!entrada || entrada.usuarioId == null || !fotoCarnet || bloqueado) return;
    devolver.mutate(
      {
        usuarioId: entrada.usuarioId,
        eventoId: entrada.eventoId,
        entradaId: entrada.id,
        monto: Number(v.monto),
        fotoCarnetUrl: fotoCarnet,
      },
      {
        onSuccess: (tx) => {
          setEntrada({
            ...entrada,
            usuario: entrada.usuario
              ? { ...entrada.usuario, saldo: tx.saldoResultante }
              : null,
          });
          setFotoCarnet(null);
          reset({ monto: '' });
        },
      },
    );
  };

  return (
    <div className={styles.pagina}>
      <EscanerEntrada
        onEncontrada={(e) => {
          setEntrada(e);
          setFotoCarnet(null);
          devolver.reset();
          reset({ monto: '' });
        }}
      />

      {entrada && (
        <TarjetaEntrada entrada={entrada} mostrarSaldo>
          {otroEvento && (
            <Alert tipo="aviso">
              Esta manilla es de otro evento. No puedes registrar retiros aquí.
            </Alert>
          )}
          {sinCuenta && (
            <Alert tipo="aviso">
              Esta entrada todavía no tiene una cuenta vinculada; no se puede
              retirar saldo.
            </Alert>
          )}
          {devolver.isError && <Alert tipo="error">{devolver.error.mensaje}</Alert>}
          {devolver.isSuccess && (
            <Alert tipo="exito">
              Retiro registrado. Saldo restante:{' '}
              {formatearMoneda(devolver.data.saldoResultante)}
            </Alert>
          )}

          {!bloqueado && (
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
              <Input
                label="Monto a retirar (Bs)"
                type="number"
                step="0.01"
                inputMode="decimal"
                error={errors.monto?.message}
                {...register('monto')}
              />
              <CapturarFoto
                label="Carnet de quien retira (obligatorio)"
                valor={fotoCarnet}
                onChange={setFotoCarnet}
              />
              <Button type="submit" cargando={devolver.isPending} disabled={!fotoCarnet}>
                Registrar retiro
              </Button>
            </form>
          )}
        </TarjetaEntrada>
      )}
    </div>
  );
}
