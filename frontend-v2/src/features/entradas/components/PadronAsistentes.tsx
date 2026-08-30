/* ============================================================================
 * PadronAsistentes — auditoría de asistentes de un evento: cuántos hay dentro,
 * fuera y pendientes; filtro por estado, buscador, y el historial de
 * movimientos de cada entrada.
 * ========================================================================= */

import { useMemo, useState } from 'react';
import { Badge, Button, Table, Td, Th } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useEntradas, type Entrada } from '../entradas';
import { MovimientosEntradaModal } from './MovimientosEntradaModal';
import styles from './PadronAsistentes.module.css';

type Filtro = 'todos' | 'ingresado' | 'salio' | 'pendiente';

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'ingresado', label: 'Adentro' },
  { id: 'salio', label: 'Afuera' },
  { id: 'pendiente', label: 'Pendientes' },
];

const ESTADO_BADGE: Record<string, { tono: 'exito' | 'aviso' | 'neutro'; texto: string }> = {
  ingresado: { tono: 'exito', texto: 'Adentro' },
  salio: { tono: 'aviso', texto: 'Salió' },
  pendiente: { tono: 'neutro', texto: 'Sin ingresar' },
};

export function PadronAsistentes({ eventoId }: { eventoId: string }) {
  const { data, isPending, isError, refetch } = useEntradas(eventoId);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const q = useDebounce(busqueda.trim().toLowerCase(), 250);
  const [verMovimientos, setVerMovimientos] = useState<Entrada | null>(null);

  const stats = useMemo(() => {
    const lista = data ?? [];
    return {
      adentro: lista.filter((e) => e.estadoIngreso === 'ingresado').length,
      afuera: lista.filter((e) => e.estadoIngreso === 'salio').length,
      pendientes: lista.filter((e) => e.estadoIngreso === 'pendiente').length,
    };
  }, [data]);

  const visibles = useMemo(() => {
    return (data ?? []).filter((e) => {
      const coincideFiltro = filtro === 'todos' || e.estadoIngreso === filtro;
      const coincideBusqueda =
        !q ||
        e.nombre.toLowerCase().includes(q) ||
        (e.documento ?? '').toLowerCase().includes(q);
      return coincideFiltro && coincideBusqueda;
    });
  }, [data, filtro, q]);

  if (isPending) return <EstadoCargando filas={5} />;
  if (isError)
    return <EstadoError mensaje="No pudimos cargar el padrón." onReintentar={refetch} />;

  return (
    <div className={styles.panel}>
      <div className={styles.stats}>
        <div>
          <span className={styles.statNum}>{stats.adentro}</span> adentro
        </div>
        <div>
          <span className={styles.statNum}>{stats.afuera}</span> afuera
        </div>
        <div>
          <span className={styles.statNum}>{stats.pendientes}</span> pendientes
        </div>
      </div>

      <div className={styles.controles}>
        <div className={styles.segmentos} role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={f.id === filtro ? styles.segActivo : styles.seg}
              aria-pressed={f.id === filtro}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className={styles.buscar}
          placeholder="Buscar por nombre o documento…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar asistente"
        />
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio titulo="Sin asistentes que coincidan" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Asistente</Th>
              <Th>Categoría</Th>
              <Th>Estado</Th>
              <Th>
                <span className="sr-only">Movimientos</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => {
              const badge = ESTADO_BADGE[e.estadoIngreso];
              return (
                <tr key={e.id}>
                  <Td>{e.nombre}</Td>
                  <Td>{e.categoriaTicket?.nombre ?? '—'}</Td>
                  <Td>
                    <Badge tono={badge.tono}>{badge.texto}</Badge>
                  </Td>
                  <Td numerico>
                    <Button
                      variante="terciario"
                      tamano="sm"
                      onClick={() => setVerMovimientos(e)}
                    >
                      Ver movimientos
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <MovimientosEntradaModal
        entradaId={verMovimientos?.id ?? null}
        nombre={verMovimientos?.nombre ?? ''}
        onCerrar={() => setVerMovimientos(null)}
      />
    </div>
  );
}
