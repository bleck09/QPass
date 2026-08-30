/* Selector de evento (por defecto solo activos). Para pantallas operativas
 * donde el usuario elige sobre qué evento trabajar. */

import { Select } from '@/shared/components/ui';
import { useEventos } from '../hooks/useEventos';

interface SelectorEventoProps {
  value: string;
  onChange: (eventoId: string) => void;
  label?: string;
  soloActivos?: boolean;
}

export function SelectorEvento({
  value,
  onChange,
  label = 'Evento',
  soloActivos = true,
}: SelectorEventoProps) {
  const { data } = useEventos();
  const eventos = (data ?? []).filter((e) => !soloActivos || e.estado === 'activo');

  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Selecciona un evento…</option>
      {eventos.map((e) => (
        <option key={e.id} value={e.id}>
          {e.nombre}
        </option>
      ))}
    </Select>
  );
}
