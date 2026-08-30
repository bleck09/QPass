/* Feature asignaciones (compacta). Rol que cumple un usuario DENTRO de un evento. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Rol } from '@/shared/constants/roles';

export interface Asignacion {
  id: string;
  eventoId: string;
  usuarioId: number;
  rol: Rol;
  createdAt: string;
  usuario?: { id: number; nombre: string; email: string; foto: string | null };
}

export interface CrearAsignacionDto {
  eventoId: string;
  usuarioId: number;
  rol: Rol;
}

const asignacionesService = {
  async listar(eventoId?: string): Promise<Asignacion[]> {
    const { data } = await apiClient.get<Asignacion[]>(ENDPOINTS.ASIGNACIONES.LISTAR, {
      params: eventoId ? { eventoId } : undefined,
    });
    return data;
  },
  async asignar(dto: CrearAsignacionDto): Promise<Asignacion> {
    const { data } = await apiClient.post<Asignacion>(ENDPOINTS.ASIGNACIONES.CREAR, dto);
    return data;
  },
  async quitar(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.ASIGNACIONES.ELIMINAR(id));
  },
};

export const ASIGNACIONES_KEYS = {
  lista: (eventoId: string) => ['asignaciones', eventoId] as const,
};

export function useAsignaciones(eventoId: string) {
  return useQuery<Asignacion[], ApiError>({
    queryKey: ASIGNACIONES_KEYS.lista(eventoId),
    queryFn: () => asignacionesService.listar(eventoId),
    enabled: Boolean(eventoId),
  });
}

export function useTodasAsignaciones() {
  return useQuery<Asignacion[], ApiError>({
    queryKey: ['asignaciones', 'todas'],
    queryFn: () => asignacionesService.listar(),
  });
}

export function useAsignar(eventoId: string) {
  const qc = useQueryClient();
  return useMutation<Asignacion, ApiError, CrearAsignacionDto>({
    mutationFn: asignacionesService.asignar,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ASIGNACIONES_KEYS.lista(eventoId) }),
  });
}

export function useQuitarAsignacion(eventoId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: asignacionesService.quitar,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ASIGNACIONES_KEYS.lista(eventoId) }),
  });
}
