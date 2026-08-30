/* Feature incidencias (compacta). Un Recargador reporta cuando la recarga
 * entregada no coincidió con lo pedido; solo el Admin la resuelve. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';

export type EstadoCaso = 'pendiente' | 'resuelto';

export interface Incidencia {
  id: string;
  eventoId: string;
  entradaId: string;
  montoEntregado: string;
  montoSolicitado: string | null;
  nota: string;
  recargadorId: number;
  estado: EstadoCaso;
  ajusteAplicado: string | null;
  createdAt: string;
  resueltoEn: string | null;
  entrada?: { nombre: string; documento: string | null; foto: string | null };
  recargador?: { nombre: string };
  resueltoPor?: { nombre: string };
}

export interface CrearIncidenciaDto {
  entradaId: string;
  montoEntregado: number;
  montoSolicitado?: number;
  nota: string;
}

const incidenciasService = {
  async listar(params: { estado?: EstadoCaso; eventoId?: string }): Promise<Incidencia[]> {
    const { data } = await apiClient.get<Incidencia[]>(ENDPOINTS.INCIDENCIAS.LISTAR, {
      params,
    });
    return data;
  },
  async crear(dto: CrearIncidenciaDto): Promise<Incidencia> {
    const { data } = await apiClient.post<Incidencia>(ENDPOINTS.INCIDENCIAS.CREAR, dto);
    return data;
  },
  async resolver(id: string, ajusteAplicado: number): Promise<Incidencia> {
    const { data } = await apiClient.post<Incidencia>(
      ENDPOINTS.INCIDENCIAS.RESOLVER(id),
      { ajusteAplicado },
    );
    return data;
  },
};

export const INCIDENCIAS_KEYS = {
  todas: ['incidencias'] as const,
  lista: (estado?: string, eventoId?: string) =>
    ['incidencias', estado ?? 'todas', eventoId ?? 'todos'] as const,
};

export function useIncidencias(params: { estado?: EstadoCaso; eventoId?: string } = {}) {
  return useQuery<Incidencia[], ApiError>({
    queryKey: INCIDENCIAS_KEYS.lista(params.estado, params.eventoId),
    queryFn: () => incidenciasService.listar(params),
  });
}

export function useCrearIncidencia() {
  const qc = useQueryClient();
  return useMutation<Incidencia, ApiError, CrearIncidenciaDto>({
    mutationFn: incidenciasService.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: INCIDENCIAS_KEYS.todas }),
  });
}

export function useResolverIncidencia() {
  const qc = useQueryClient();
  return useMutation<Incidencia, ApiError, { id: string; ajusteAplicado: number }>({
    mutationFn: ({ id, ajusteAplicado }) =>
      incidenciasService.resolver(id, ajusteAplicado),
    onSuccess: () => qc.invalidateQueries({ queryKey: INCIDENCIAS_KEYS.todas }),
  });
}
