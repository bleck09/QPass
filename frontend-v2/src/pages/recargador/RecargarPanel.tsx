/* ============================================================================
 * RecargarPanel — escanea la manilla, recarga saldo y, si algo no cuadró,
 * reporta una incidencia. La manilla debe pertenecer al evento seleccionado.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Input, Modal, Textarea } from '@/shared/components/ui';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { EscanerEntrada, TarjetaEntrada, type Entrada } from '@/features/entradas';
import { useRecargar } from '@/features/transacciones';
import { useCrearIncidencia } from '@/features/incidencias';
import styles from './RecargadorPage.module.css';

const montoSchema = z.object({
  monto: z.string().refine((v) => Number(v) > 0, 'Ingresa un monto mayor a 0'),
});
type MontoValues = z.infer<typeof montoSchema>;

const incidenciaSchema = z.object({
  montoEntregado: z.string().refine((v) => Number(v) >= 0, 'Monto no válido'),
  montoSolicitado: z.string().optional().or(z.literal('')),
  nota: z.string().trim().min(5, 'Explica qué pasó'),
});
type IncidenciaValues = z.infer<typeof incidenciaSchema>;

export function RecargarPanel({ eventoId }: { eventoId: string }) {
  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [incidenciaAbierta, setIncidenciaAbierta] = useState(false);
  const recargar = useRecargar();
  const incidencia = useCrearIncidencia();

  const montoForm = useForm<MontoValues>({ resolver: zodResolver(montoSchema) });
  const incForm = useForm<IncidenciaValues>({ resolver: zodResolver(incidenciaSchema) });

  const otroEvento = entrada != null && entrada.eventoId !== eventoId;

  const onRecargar = (v: MontoValues) => {
    if (!entrada || otroEvento) return;
    recargar.mutate(
      { entradaId: entrada.id, monto: Number(v.monto) },
      {
        onSuccess: (res) => {
          setEntrada({
            ...entrada,
            usuario: entrada.usuario
              ? { ...entrada.usuario, saldo: res.usuario.saldo }
              : { id: res.usuario.id, saldo: res.usuario.saldo, foto: null },
          });
          montoForm.reset({ monto: '' });
        },
      },
    );
  };

  const onIncidencia = (v: IncidenciaValues) => {
    if (!entrada) return;
    incidencia.mutate(
      {
        entradaId: entrada.id,
        montoEntregado: Number(v.montoEntregado),
        montoSolicitado: v.montoSolicitado ? Number(v.montoSolicitado) : undefined,
        nota: v.nota.trim(),
      },
      {
        onSuccess: () => {
          setIncidenciaAbierta(false);
          incForm.reset();
        },
      },
    );
  };

  return (
    <div className={styles.pagina}>
      <EscanerEntrada
        onEncontrada={(e) => {
          setEntrada(e);
          recargar.reset();
          montoForm.reset({ monto: '' });
        }}
      />

      {entrada && (
        <TarjetaEntrada entrada={entrada} mostrarSaldo>
          {otroEvento && (
            <Alert tipo="aviso">
              Esta manilla es de otro evento. No puedes recargarla desde aquí.
            </Alert>
          )}
          {recargar.isError && <Alert tipo="error">{recargar.error.mensaje}</Alert>}
          {recargar.isSuccess && (
            <Alert tipo="exito">
              Recarga registrada. Nuevo saldo:{' '}
              {formatearMoneda(recargar.data.usuario.saldo)}
            </Alert>
          )}

          {!otroEvento && (
            <form
              className={styles.form}
              onSubmit={montoForm.handleSubmit(onRecargar)}
              noValidate
            >
              <Input
                label="Monto a recargar (Bs)"
                type="number"
                step="0.01"
                inputMode="decimal"
                autoFocus
                error={montoForm.formState.errors.monto?.message}
                {...montoForm.register('monto')}
              />
              <Button type="submit" cargando={recargar.isPending}>
                Recargar
              </Button>
            </form>
          )}

          <Button
            variante="terciario"
            tamano="sm"
            onClick={() => setIncidenciaAbierta(true)}
          >
            Reportar incidencia
          </Button>
        </TarjetaEntrada>
      )}

      <Modal
        abierto={incidenciaAbierta}
        onCerrar={() => setIncidenciaAbierta(false)}
        titulo="Reportar incidencia de recarga"
        acciones={null}
      >
        {incidencia.isError && <Alert tipo="error">{incidencia.error.mensaje}</Alert>}
        <form
          className={styles.formModal}
          onSubmit={incForm.handleSubmit(onIncidencia)}
          noValidate
        >
          <Input
            label="Monto que entregaste (Bs)"
            type="number"
            step="0.01"
            error={incForm.formState.errors.montoEntregado?.message}
            {...incForm.register('montoEntregado')}
          />
          <Input
            label="Monto que pedía el participante (Bs)"
            type="number"
            step="0.01"
            opcional
            {...incForm.register('montoSolicitado')}
          />
          <Textarea
            label="¿Qué pasó?"
            rows={3}
            error={incForm.formState.errors.nota?.message}
            {...incForm.register('nota')}
          />
          <div className={styles.pieModal}>
            <Button variante="secundario" onClick={() => setIncidenciaAbierta(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={incidencia.isPending}>
              Enviar reporte
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
