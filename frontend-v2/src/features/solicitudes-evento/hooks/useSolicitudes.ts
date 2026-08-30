import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import { EVENTOS_KEYS, type Evento } from '@/features/eventos';
import { solicitudesService } from '../services/solicitudes.service';
import type {
  ActualizarSolicitudDto,
  CrearSolicitudDto,
  EstadoSolicitud,
  SolicitudEvento,
} from '../types/solicitudes.types';

export const SOLICITUDES_KEYS = {
  todos: ['solicitudes-evento'] as const,
  lista: (estado?: EstadoSolicitud) =>
    [...SOLICITUDES_KEYS.todos, 'lista', estado ?? 'todas'] as const,
  detalle: (id: string) => [...SOLICITUDES_KEYS.todos, 'detalle', id] as const,
};

export function useSolicitudes(estado?: EstadoSolicitud) {
  return useQuery<SolicitudEvento[], ApiError>({
    queryKey: SOLICITUDES_KEYS.lista(estado),
    queryFn: () => solicitudesService.listar(estado),
  });
}

export function useSolicitud(id: string | undefined) {
  return useQuery<SolicitudEvento, ApiError>({
    queryKey: SOLICITUDES_KEYS.detalle(id ?? ''),
    queryFn: () => solicitudesService.obtenerPorId(id as string),
    enabled: Boolean(id),
  });
}

export function useCrearSolicitud() {
  const qc = useQueryClient();
  return useMutation<SolicitudEvento, ApiError, CrearSolicitudDto>({
    mutationFn: solicitudesService.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: SOLICITUDES_KEYS.todos }),
  });
}

export function useActualizarSolicitud(id: string) {
  const qc = useQueryClient();
  return useMutation<SolicitudEvento, ApiError, ActualizarSolicitudDto>({
    mutationFn: (dto) => solicitudesService.actualizar(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: SOLICITUDES_KEYS.todos }),
  });
}

export function useAprobarSolicitud() {
  const qc = useQueryClient();
  return useMutation<Evento, ApiError, string>({
    mutationFn: solicitudesService.aprobar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SOLICITUDES_KEYS.todos });
      qc.invalidateQueries({ queryKey: EVENTOS_KEYS.todos });
    },
  });
}

export function useRechazarSolicitud() {
  const qc = useQueryClient();
  return useMutation<SolicitudEvento, ApiError, { id: string; motivoRechazo: string }>({
    mutationFn: ({ id, motivoRechazo }) =>
      solicitudesService.rechazar(id, motivoRechazo),
    onSuccess: () => qc.invalidateQueries({ queryKey: SOLICITUDES_KEYS.todos }),
  });
}
