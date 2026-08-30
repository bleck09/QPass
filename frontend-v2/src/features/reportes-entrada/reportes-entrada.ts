/* Feature reportes-entrada (compacta). Un Usuario reporta un dato mal en una
 * entrada ya aprobada; el Admin lo corrige. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';

export type CampoReportado = 'nombre' | 'correo' | 'celular';
export type EstadoCaso = 'pendiente' | 'resuelto';

export interface ReporteEntrada {
  id: string;
  eventoId: string;
  compraId: string;
  entradaId: string;
  campo: CampoReportado;
  descripcion: string;
  estado: EstadoCaso;
  valorCorregido: string | null;
  createdAt: string;
  resueltoEn: string | null;
  entrada?: {
    nombre: string;
    correo: string;
    celular: string | null;
    compra?: { comprador?: { nombre: string; email: string } };
  };
}

export interface CrearReporteDto {
  compraId: string;
  entradaId: string;
  campo: CampoReportado;
  descripcion: string;
}

const reportesService = {
  async listar(params: { estado?: EstadoCaso; eventoId?: string }): Promise<ReporteEntrada[]> {
    const { data } = await apiClient.get<ReporteEntrada[]>(
      ENDPOINTS.REPORTES_ENTRADA.LISTAR,
      { params },
    );
    return data;
  },
  async crear(dto: CrearReporteDto): Promise<ReporteEntrada> {
    const { data } = await apiClient.post<ReporteEntrada>(
      ENDPOINTS.REPORTES_ENTRADA.CREAR,
      dto,
    );
    return data;
  },
  async corregir(id: string, valorCorregido: string): Promise<ReporteEntrada> {
    const { data } = await apiClient.post<ReporteEntrada>(
      ENDPOINTS.REPORTES_ENTRADA.CORREGIR(id),
      { valorCorregido },
    );
    return data;
  },
};

export const REPORTES_KEYS = {
  todos: ['reportes-entrada'] as const,
  lista: (estado?: string) => ['reportes-entrada', estado ?? 'todos'] as const,
};

export function useReportesEntrada(params: { estado?: EstadoCaso } = {}) {
  return useQuery<ReporteEntrada[], ApiError>({
    queryKey: REPORTES_KEYS.lista(params.estado),
    queryFn: () => reportesService.listar(params),
  });
}

export function useCrearReporte() {
  const qc = useQueryClient();
  return useMutation<ReporteEntrada, ApiError, CrearReporteDto>({
    mutationFn: reportesService.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: REPORTES_KEYS.todos }),
  });
}

export function useCorregirReporte() {
  const qc = useQueryClient();
  return useMutation<ReporteEntrada, ApiError, { id: string; valorCorregido: string }>({
    mutationFn: ({ id, valorCorregido }) =>
      reportesService.corregir(id, valorCorregido),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPORTES_KEYS.todos }),
  });
}
