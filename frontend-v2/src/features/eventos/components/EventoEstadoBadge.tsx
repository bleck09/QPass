import { Badge } from '@/shared/components/ui';
import type { EstadoEvento } from '../types/eventos.types';

const CONFIG: Record<EstadoEvento, { tono: 'exito' | 'neutro'; texto: string }> = {
  activo: { tono: 'exito', texto: 'Activo' },
  finalizado: { tono: 'neutro', texto: 'Finalizado' },
};

export function EventoEstadoBadge({ estado }: { estado: EstadoEvento }) {
  const { tono, texto } = CONFIG[estado];
  return <Badge tono={tono}>{texto}</Badge>;
}
