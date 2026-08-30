import { Badge, type TonoBadge } from '@/shared/components/ui';
import type { EstadoCompra } from '../compras';

const CONFIG: Record<EstadoCompra, { tono: TonoBadge; texto: string }> = {
  pendiente: { tono: 'aviso', texto: 'Pendiente de aprobación' },
  confirmado: { tono: 'exito', texto: 'Confirmada' },
  rechazado: { tono: 'error', texto: 'Rechazada' },
};

export function EstadoCompraBadge({ estado }: { estado: EstadoCompra }) {
  const { tono, texto } = CONFIG[estado];
  return <Badge tono={tono}>{texto}</Badge>;
}
