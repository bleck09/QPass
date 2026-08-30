/* ============================================================================
 * AdminReportesPage (/admin/reportes) — corregir datos reportados de entradas.
 * Si el campo es el correo y la persona nunca inició sesión, el backend
 * también corrige el correo de su cuenta.
 * ========================================================================= */

import { useState } from 'react';
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
import {
  useCorregirReporte,
  useReportesEntrada,
  type EstadoCaso,
  type ReporteEntrada,
} from '@/features/reportes-entrada';

const CAMPO_LABEL: Record<string, string> = {
  nombre: 'Nombre',
  correo: 'Correo',
  celular: 'Celular',
};

export function AdminReportesPage() {
  useTituloPagina('Reportes de datos');

  const [estado, setEstado] = useState<EstadoCaso | ''>('pendiente');
  const { data, isPending, isError, refetch } = useReportesEntrada({
    estado: estado || undefined,
  });
  const [corregir, setCorregir] = useState<ReporteEntrada | null>(null);
  const [valor, setValor] = useState('');
  const corregirMut = useCorregirReporte();

  const cerrar = () => {
    setCorregir(null);
    setValor('');
    corregirMut.reset();
  };

  const valorActual = (r: ReporteEntrada) =>
    r.campo === 'nombre'
      ? r.entrada?.nombre
      : r.campo === 'correo'
        ? r.entrada?.correo
        : r.entrada?.celular;

  return (
    <>
      <EncabezadoPagina descripcion="Datos mal cargados en entradas ya aprobadas. Al corregir el correo, si la persona nunca inició sesión, también se actualiza el correo de su cuenta." />

      <div style={{ maxWidth: 240, marginBottom: 'var(--space-6)' }}>
        <Select
          label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoCaso | '')}
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="resuelto">Resueltos</option>
        </Select>
      </div>

      {isPending && <EstadoCargando filas={5} />}
      {isError && <EstadoError onReintentar={refetch} />}
      {data && data.length === 0 && (
        <EstadoVacio titulo="Sin reportes" descripcion="No hay reportes con ese filtro." />
      )}
      {data && data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Entrada</Th>
              <Th>Campo</Th>
              <Th>Descripción</Th>
              <Th>Fecha</Th>
              <Th>Estado</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <Td>{r.entrada?.nombre ?? '—'}</Td>
                <Td>{CAMPO_LABEL[r.campo]}</Td>
                <Td>{r.descripcion}</Td>
                <Td>{formatearFecha(r.createdAt)}</Td>
                <Td>
                  <Badge tono={r.estado === 'pendiente' ? 'aviso' : 'exito'}>
                    {r.estado === 'pendiente' ? 'Pendiente' : 'Resuelto'}
                  </Badge>
                </Td>
                <Td numerico>
                  {r.estado === 'pendiente' && (
                    <Button
                      variante="terciario"
                      tamano="sm"
                      onClick={() => {
                        setCorregir(r);
                        setValor(valorActual(r) ?? '');
                      }}
                    >
                      Corregir
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        abierto={corregir !== null}
        onCerrar={cerrar}
        titulo={`Corregir ${corregir ? CAMPO_LABEL[corregir.campo] : ''}`}
        acciones={
          <>
            <Button variante="secundario" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              cargando={corregirMut.isPending}
              onClick={() =>
                corregir &&
                corregirMut.mutate(
                  { id: corregir.id, valorCorregido: valor.trim() },
                  { onSuccess: cerrar },
                )
              }
            >
              Guardar corrección
            </Button>
          </>
        }
      >
        {corregirMut.isError && <Alert tipo="error">{corregirMut.error.mensaje}</Alert>}
        <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
          {corregir?.descripcion}
        </p>
        <Input
          label="Valor corregido"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          autoFocus
        />
      </Modal>
    </>
  );
}
