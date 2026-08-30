/* Selector de evento limitado a los que el Admin asignó al operador en sesión
 * con su rol. Para pantallas de Recargador, Supervisor y Devolución: no pueden
 * operar sobre eventos que no les tocan. */

import { Select } from '@/shared/components/ui';
import type { Rol } from '@/shared/constants/roles';
import { useMisEventosAsignados } from '../hooks/useEventos';

interface Props {
  usuarioId: number | undefined;
  rol: Rol | undefined;
  value: string;
  onChange: (eventoId: string) => void;
  label?: string;
}

export function SelectorEventoAsignado({
  usuarioId,
  rol,
  value,
  onChange,
  label = 'Evento',
}: Props) {
  const { data, isPending } = useMisEventosAsignados(usuarioId, rol);
  const eventos = (data ?? []).filter((e) => e.estado === 'activo');

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={isPending}
      hint={
        !isPending && eventos.length === 0
          ? 'No tienes eventos activos asignados.'
          : undefined
      }
    >
      <option value="">Selecciona un evento…</option>
      {eventos.map((e) => (
        <option key={e.id} value={e.id}>
          {e.nombre}
        </option>
      ))}
    </Select>
  );
}
