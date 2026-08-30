/* ============================================================================
 * Hooks de eventos. Conectan eventosService con React Query. Las claves de
 * caché están centralizadas para invalidar sin errores (Anexo B B9).
 * ========================================================================= */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import type { Rol } from '@/shared/constants/roles';
import { useTodasAsignaciones } from '@/features/asignaciones';
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

/**
 * Eventos donde el Admin asignó a `usuarioId` con `rol` (Supervisor, Recargador,
 * Devolucion, UsuarioNegocio). Evita que un operador vea u opere eventos que no
 * le tocan. El backend no filtra asignaciones por usuario, así que el cruce se
 * hace en el cliente (equivalente a `api.eventos.misAsignados` del front viejo).
 */
export function useMisEventosAsignados(
  usuarioId: number | undefined,
  rol: Rol | undefined,
) {
  const eventos = useEventos();
  const asignaciones = useTodasAsignaciones();

  const data = useMemo(() => {
    if (!eventos.data || !asignaciones.data || !usuarioId || !rol) return undefined;
    const idsAsignados = new Set(
      asignaciones.data
        .filter((a) => a.usuarioId === usuarioId && a.rol === rol)
        .map((a) => a.eventoId),
    );
    return eventos.data.filter((e) => idsAsignados.has(e.id));
  }, [eventos.data, asignaciones.data, usuarioId, rol]);

  return {
    data,
    isPending: eventos.isPending || asignaciones.isPending,
    isError: eventos.isError || asignaciones.isError,
    refetch: () => {
      void eventos.refetch();
      void asignaciones.refetch();
    },
  };
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
