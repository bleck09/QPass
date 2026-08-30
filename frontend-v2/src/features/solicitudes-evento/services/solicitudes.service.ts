/* ============================================================================
 * src/features/solicitudes-evento/services/solicitudes.service.ts
 * Endpoints de /solicitudes-evento. El Cliente propone un evento antes de que
 * exista; el Admin lo aprueba (crea el Evento) o lo rechaza.
 * ========================================================================= */

import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Evento } from '@/features/eventos';
import type {
  ActualizarSolicitudDto,
  CrearSolicitudDto,
  EstadoSolicitud,
  SolicitudEvento,
} from '../types/solicitudes.types';

export const solicitudesService = {
  async listar(estado?: EstadoSolicitud): Promise<SolicitudEvento[]> {
    const { data } = await apiClient.get<SolicitudEvento[]>(
      ENDPOINTS.SOLICITUDES_EVENTO.LISTAR,
      { params: estado ? { estado } : undefined },
    );
    return data;
  },

  async obtenerPorId(id: string): Promise<SolicitudEvento> {
    const { data } = await apiClient.get<SolicitudEvento>(
      ENDPOINTS.SOLICITUDES_EVENTO.DETALLE(id),
    );
    return data;
  },

  async crear(dto: CrearSolicitudDto): Promise<SolicitudEvento> {
    const { data } = await apiClient.post<SolicitudEvento>(
      ENDPOINTS.SOLICITUDES_EVENTO.CREAR,
      dto,
    );
    return data;
  },

  async actualizar(id: string, dto: ActualizarSolicitudDto): Promise<SolicitudEvento> {
    const { data } = await apiClient.patch<SolicitudEvento>(
      ENDPOINTS.SOLICITUDES_EVENTO.ACTUALIZAR(id),
      dto,
    );
    return data;
  },

  /** Aprueba: crea el Evento + LandingConfig + asigna al Cliente. Devuelve el Evento. */
  async aprobar(id: string): Promise<Evento> {
    const { data } = await apiClient.post<Evento>(
      ENDPOINTS.SOLICITUDES_EVENTO.APROBAR(id),
    );
    return data;
  },

  async rechazar(id: string, motivoRechazo?: string): Promise<SolicitudEvento> {
    const { data } = await apiClient.post<SolicitudEvento>(
      ENDPOINTS.SOLICITUDES_EVENTO.RECHAZAR(id),
      { motivoRechazo },
    );
    return data;
  },
};
