import { Badge, type TonoBadge } from '@/shared/components/ui';
import type { EstadoSolicitud } from '../types/solicitudes.types';

const CONFIG: Record<EstadoSolicitud, { tono: TonoBadge; texto: string }> = {
  pendiente: { tono: 'aviso', texto: 'Pendiente' },
  aprobado: { tono: 'exito', texto: 'Aprobada' },
  rechazado: { tono: 'error', texto: 'Rechazada' },
};

export function SolicitudEstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const { tono, texto } = CONFIG[estado];
  return <Badge tono={tono}>{texto}</Badge>;
}
