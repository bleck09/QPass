/* ============================================================================
 * AdminIncidenciasPage (/admin/incidencias) — resolver incidencias de recarga:
 * el Admin decide cuánto acreditar de más (ajuste al saldo).
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Badge,
  Button,
  EncabezadoPagina,
  Input,
  Modal,
  Select,
  Table,
  Td,
  Th,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatearFecha } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import {
  useIncidencias,
  useResolverIncidencia,
  type EstadoCaso,
  type Incidencia,
} from '@/features/incidencias';

const schema = z.object({
  ajusteAplicado: z.string().refine((v) => Number(v) >= 0, 'No puede ser negativo'),
});
type Values = z.infer<typeof schema>;

export function AdminIncidenciasPage() {
  useTituloPagina('Incidencias de recarga');

  const [estado, setEstado] = useState<EstadoCaso | ''>('pendiente');
  const { data, isPending, isError, refetch } = useIncidencias({
    estado: estado || undefined,
  });
  const [resolver, setResolver] = useState<Incidencia | null>(null);
  const resolverMut = useResolverIncidencia();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { ajusteAplicado: '0' } });

  const cerrar = () => {
    setResolver(null);
    resolverMut.reset();
    reset({ ajusteAplicado: '0' });
  };

  return (
    <>
      <EncabezadoPagina descripcion="Cuando la recarga entregada no coincidió con lo pedido, el recargador reporta el caso. Al resolver, puedes acreditar un ajuste al saldo del participante." />

      <div style={{ maxWidth: 240, marginBottom: 'var(--space-6)' }}>
        <Select
          label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoCaso | '')}
        >
          <option value="">Todas</option>
          <option value="pendiente">Pendientes</option>
          <option value="resuelto">Resueltas</option>
        </Select>
      </div>

      {isPending && <EstadoCargando filas={5} />}
      {isError && <EstadoError onReintentar={refetch} />}
      {data && data.length === 0 && (
        <EstadoVacio titulo="Sin incidencias" descripcion="No hay casos con ese filtro." />
      )}
      {data && data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Participante</Th>
              <Th numerico>Entregado</Th>
              <Th numerico>Pedía</Th>
              <Th>Recargador</Th>
              <Th>Fecha</Th>
              <Th>Estado</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {data.map((inc) => (
              <tr key={inc.id}>
                <Td>{inc.entrada?.nombre ?? '—'}</Td>
                <Td numerico>{formatearMoneda(inc.montoEntregado)}</Td>
                <Td numerico>
                  {inc.montoSolicitado != null
                    ? formatearMoneda(inc.montoSolicitado)
                    : '—'}
                </Td>
                <Td>{inc.recargador?.nombre ?? '—'}</Td>
                <Td>{formatearFecha(inc.createdAt)}</Td>
                <Td>
                  <Badge tono={inc.estado === 'pendiente' ? 'aviso' : 'exito'}>
                    {inc.estado === 'pendiente' ? 'Pendiente' : 'Resuelta'}
                  </Badge>
                </Td>
                <Td numerico>
                  <Button
                    variante="terciario"
                    tamano="sm"
                    onClick={() => setResolver(inc)}
                  >
                    {inc.estado === 'pendiente' ? 'Resolver' : 'Ver'}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        abierto={resolver !== null}
        onCerrar={cerrar}
        titulo="Resolver incidencia"
        acciones={null}
      >
        {resolver && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)' }}>{resolver.nota}</p>
            {resolver.estado === 'resuelto' ? (
              <Alert tipo="exito">
                Resuelta. Ajuste aplicado:{' '}
                {formatearMoneda(resolver.ajusteAplicado ?? 0)}
              </Alert>
            ) : (
              <form
                onSubmit={handleSubmit((v) =>
                  resolverMut.mutate(
                    { id: resolver.id, ajusteAplicado: Number(v.ajusteAplicado) },
                    { onSuccess: cerrar },
                  ),
                )}
                noValidate
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              >
                {resolverMut.isError && (
                  <Alert tipo="error">{resolverMut.error.mensaje}</Alert>
                )}
                <Input
                  label="Ajuste a acreditar (Bs)"
                  type="number"
                  step="0.01"
                  hint="0 si no corresponde acreditar nada."
                  error={errors.ajusteAplicado?.message}
                  {...register('ajusteAplicado')}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                  <Button variante="secundario" onClick={cerrar}>
                    Cancelar
                  </Button>
                  <Button type="submit" cargando={resolverMut.isPending}>
                    Resolver
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
