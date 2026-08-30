/* ============================================================================
 * CategoriaTicketPanel — gestión de categorías de ticket de un evento:
 * alta rápida + tabla con cupo vendido y borrado (solo si no tiene ventas).
 * ========================================================================= */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  ConfirmarModal,
  Input,
  Table,
  Td,
  Th,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useState } from 'react';
import {
  categoriaSchema,
  useCategoriasTicket,
  useCrearCategoria,
  useEliminarCategoria,
  type CategoriaFormValues,
  type CategoriaTicket,
} from './categorias-ticket';
import styles from './CategoriaTicketPanel.module.css';

export function CategoriaTicketPanel({ eventoId }: { eventoId: string }) {
  const { data, isPending, isError, refetch } = useCategoriasTicket(eventoId);
  const crear = useCrearCategoria(eventoId);
  const eliminar = useEliminarCategoria(eventoId);
  const [aBorrar, setABorrar] = useState<CategoriaTicket | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    mode: 'onBlur',
  });

  const onSubmit = (v: CategoriaFormValues) => {
    crear.mutate(
      {
        eventoId,
        nombre: String(v.nombre).trim(),
        descripcion: v.descripcion ? String(v.descripcion).trim() : undefined,
        cantidad: Number(v.cantidad),
        precio: Number(v.precio),
      },
      { onSuccess: () => reset({ nombre: '', descripcion: '', cantidad: '', precio: '' }) },
    );
  };

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        {crear.isError && <Alert tipo="error">{crear.error.mensaje}</Alert>}
        <div className={styles.fila}>
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
          <Input
            label="Descripción"
            opcional
            error={errors.descripcion?.message}
            {...register('descripcion')}
          />
          <Input
            label="Cantidad"
            type="number"
            inputMode="numeric"
            error={errors.cantidad?.message}
            {...register('cantidad')}
          />
          <Input
            label="Precio (Bs)"
            type="number"
            step="0.01"
            inputMode="decimal"
            error={errors.precio?.message}
            {...register('precio')}
          />
          <Button type="submit" cargando={crear.isPending}>
            Agregar
          </Button>
        </div>
      </form>

      {isPending && <EstadoCargando filas={3} />}
      {isError && <EstadoError onReintentar={refetch} />}
      {data && data.length === 0 && (
        <EstadoVacio
          titulo="Sin categorías"
          descripcion="Agrega al menos una para poder vender entradas."
        />
      )}
      {data && data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th numerico>Precio</Th>
              <Th numerico>Vendidas / Cupo</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <Td>
                  {c.nombre}
                  {c.descripcion && (
                    <span className={styles.desc}> — {c.descripcion}</span>
                  )}
                </Td>
                <Td numerico>{formatearMoneda(c.precio)}</Td>
                <Td numerico>
                  {c.cantidadVendida} / {c.cantidad}
                </Td>
                <Td numerico>
                  <Button
                    variante="terciario"
                    tamano="sm"
                    onClick={() => setABorrar(c)}
                    disabled={c.cantidadVendida > 0}
                  >
                    Eliminar
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmarModal
        abierto={aBorrar !== null}
        titulo="Eliminar categoría"
        textoConfirmar="Eliminar"
        destructivo
        cargando={eliminar.isPending}
        onCancelar={() => setABorrar(null)}
        onConfirmar={() =>
          aBorrar &&
          eliminar.mutate(aBorrar.id, { onSuccess: () => setABorrar(null) })
        }
      >
        Se eliminará la categoría <strong>{aBorrar?.nombre}</strong>.
      </ConfirmarModal>
    </div>
  );
}
