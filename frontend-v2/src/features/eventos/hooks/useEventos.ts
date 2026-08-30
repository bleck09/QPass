/* ============================================================================
 * Hooks de eventos. Conectan eventosService con React Query. Las claves de
 * caché están centralizadas para invalidar sin errores (Anexo B B9).
 * ========================================================================= */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import { eventosService } from '../services/eventos.service';
import type {
  ActualizarEventoDto,
  CrearEventoDto,
  Evento,
} from '../types/eventos.types';

export const EVENTOS_KEYS = {
  todos: ['eventos'] as const,
  lista: () => [...EVENTOS_KEYS.todos, 'lista'] as const,
  detalle: (id: string) => [...EVENTOS_KEYS.todos, 'detalle', id] as const,
};

export function useEventos() {
  return useQuery<Evento[], ApiError>({
    queryKey: EVENTOS_KEYS.lista(),
    queryFn: eventosService.listar,
  });
}

export function useEvento(id: string | undefined) {
  return useQuery<Evento, ApiError>({
    queryKey: EVENTOS_KEYS.detalle(id ?? ''),
    queryFn: () => eventosService.obtenerPorId(id as string),
    enabled: Boolean(id),
  });
}

export function useCrearEvento() {
  const qc = useQueryClient();
  return useMutation<Evento, ApiError, CrearEventoDto>({
    mutationFn: eventosService.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTOS_KEYS.todos }),
  });
}

export function useActualizarEvento(id: string) {
  const qc = useQueryClient();
  return useMutation<Evento, ApiError, ActualizarEventoDto>({
    mutationFn: (dto) => eventosService.actualizar(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTOS_KEYS.todos }),
  });
}

export function useCerrarEvento() {
  const qc = useQueryClient();
  return useMutation<Evento, ApiError, string>({
    mutationFn: eventosService.cerrar,
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTOS_KEYS.todos }),
  });
}
