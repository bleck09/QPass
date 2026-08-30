/* Feature landing-config (compacta). Config publicada de la landing de un evento. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';

export interface LandingActividad {
  icono?: string;
  titulo: string;
  descripcion: string;
}

export interface LandingItemCronograma {
  hora: string;
  actividad: string;
}

export interface LandingConfig {
  eventoId: string;
  titulo: string;
  informacion: string;
  imagen: string | null;
  colorPrimario: string;
  colorBoton: string;
  colorFondo: string;
  colorTextoTitulo: string;
  colorTextoP: string;
  actividades: LandingActividad[];
  cronograma: LandingItemCronograma[];
  updatedAt: string;
}

export type GuardarLandingDto = Omit<LandingConfig, 'eventoId' | 'updatedAt' | 'imagen'> & {
  imagen?: string;
};

const landingService = {
  async obtener(eventoId: string): Promise<LandingConfig | null> {
    try {
      const { data } = await apiClient.get<LandingConfig>(
        ENDPOINTS.LANDING_CONFIG.DETALLE(eventoId),
      );
      return data;
    } catch (err) {
      if ((err as ApiError).status === 404) return null;
      throw err;
    }
  },
  async guardar(eventoId: string, dto: GuardarLandingDto): Promise<LandingConfig> {
    const { data } = await apiClient.put<LandingConfig>(
      ENDPOINTS.LANDING_CONFIG.GUARDAR(eventoId),
      dto,
    );
    return data;
  },
};

export const LANDING_KEYS = {
  detalle: (eventoId: string) => ['landing-config', eventoId] as const,
};

export function useLandingConfig(eventoId: string) {
  return useQuery<LandingConfig | null, ApiError>({
    queryKey: LANDING_KEYS.detalle(eventoId),
    queryFn: () => landingService.obtener(eventoId),
    enabled: Boolean(eventoId),
  });
}

export function useGuardarLanding(eventoId: string) {
  const qc = useQueryClient();
  return useMutation<LandingConfig, ApiError, GuardarLandingDto>({
    mutationFn: (dto) => landingService.guardar(eventoId, dto),
    onSuccess: (data) => qc.setQueryData(LANDING_KEYS.detalle(eventoId), data),
  });
}
