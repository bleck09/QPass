/* Historial de ingresos/salidas de una entrada. Se abre desde el padrón. */

import { Modal } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { useRegistrosEntrada } from '../entradas';
import styles from './PadronAsistentes.module.css';

interface Props {
  entradaId: string | null;
  nombre: string;
  onCerrar: () => void;
}

export function MovimientosEntradaModal({ entradaId, nombre, onCerrar }: Props) {
  const { data, isPending, isError, refetch } = useRegistrosEntrada(entradaId ?? undefined);

  return (
    <Modal
      abierto={entradaId !== null}
      onCerrar={onCerrar}
      titulo={`Movimientos de ${nombre}`}
      acciones={undefined}
    >
      {isPending && <EstadoCargando filas={3} />}
      {isError && <EstadoError onReintentar={refetch} />}
      {data && data.length === 0 && (
        <EstadoVacio titulo="Sin ingresos ni salidas registrados" />
      )}
      {data && data.length > 0 && (
        <ul className={styles.movimientos}>
          {data.map((m) => (
            <li key={m.id}>
              <span className={styles.movTipo}>
                {m.tipo === 'ingreso' ? 'Ingreso' : 'Salida'}
              </span>
              <span>{formatearFechaHora(m.createdAt)}</span>
              {m.registradoPor && (
                <span className={styles.movPor}>por {m.registradoPor.nombre}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
