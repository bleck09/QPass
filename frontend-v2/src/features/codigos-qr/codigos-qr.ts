/* Feature codigos-qr (compacta). Pool de manillas/QR físicos de un evento. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';

export interface CodigoQr {
  id: string;
  eventoId: string;
  numero: number;
  codigo: string;
  generadoEn: string;
  entradaId: string | null;
  asignadoPorId: number | null;
  asignadoEn: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
}

export interface GenerarQrDto {
  eventoId: string;
  cantidad: number;
  prefijo?: string;
}

const codigosQrService = {
  async listar(eventoId: string, soloDisponibles = false): Promise<CodigoQr[]> {
    const { data } = await apiClient.get<CodigoQr[]>(ENDPOINTS.CODIGOS_QR.LISTAR, {
      params: { eventoId, ...(soloDisponibles ? { disponibles: 'true' } : {}) },
    });
    return data;
  },
  async buscar(codigo: string): Promise<CodigoQr> {
    const { data } = await apiClient.get<CodigoQr>(
      ENDPOINTS.CODIGOS_QR.BUSCAR_POR_CODIGO(codigo),
    );
    return data;
  },
  async generar(dto: GenerarQrDto): Promise<CodigoQr[]> {
    const { data } = await apiClient.post<CodigoQr[]>(
      ENDPOINTS.CODIGOS_QR.GENERAR,
      dto,
    );
    return data;
  },
  async eliminarNoVinculados(eventoId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.CODIGOS_QR.ELIMINAR_NO_VINCULADOS, {
      params: { eventoId },
    });
  },
};

export const CODIGOS_QR_KEYS = {
  todos: ['codigos-qr'] as const,
  lista: (eventoId: string) => ['codigos-qr', eventoId] as const,
};

export function useCodigosQr(eventoId: string) {
  return useQuery<CodigoQr[], ApiError>({
    queryKey: CODIGOS_QR_KEYS.lista(eventoId),
    queryFn: () => codigosQrService.listar(eventoId),
    enabled: Boolean(eventoId),
  });
}

export function useGenerarQr(eventoId: string) {
  const qc = useQueryClient();
  return useMutation<CodigoQr[], ApiError, GenerarQrDto>({
    mutationFn: codigosQrService.generar,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: CODIGOS_QR_KEYS.lista(eventoId) }),
  });
}

/** Búsqueda puntual de un código del pool por su texto (no cacheada). */
export function buscarCodigoQr(codigo: string) {
  return codigosQrService.buscar(codigo);
}

export function useEliminarQrNoVinculados(eventoId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => codigosQrService.eliminarNoVinculados(eventoId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: CODIGOS_QR_KEYS.lista(eventoId) }),
  });
}
