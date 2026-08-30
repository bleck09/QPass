import { Button, Table, Td, Th } from '@/shared/components/ui';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { SolicitudEstadoBadge } from './SolicitudEstadoBadge';
import type { SolicitudEvento } from '../types/solicitudes.types';

interface SolicitudTablaProps {
  solicitudes: SolicitudEvento[];
  onRevisar: (solicitud: SolicitudEvento) => void;
}

export function SolicitudTabla({ solicitudes, onRevisar }: SolicitudTablaProps) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Evento</Th>
          <Th>Cliente</Th>
          <Th>Fecha</Th>
          <Th>Estado</Th>
          <Th>
            <span className="sr-only">Acciones</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {solicitudes.map((s) => (
          <tr key={s.id}>
            <Td>{s.nombreEvento}</Td>
            <Td>{s.cliente?.nombre ?? '—'}</Td>
            <Td>{formatearFechaHora(s.fecha)}</Td>
            <Td>
              <SolicitudEstadoBadge estado={s.estado} />
            </Td>
            <Td numerico>
              <Button variante="terciario" tamano="sm" onClick={() => onRevisar(s)}>
                {s.estado === 'pendiente' ? 'Revisar' : 'Ver'}
              </Button>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
