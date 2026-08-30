/* ============================================================================
 * src/features/eventos/services/eventos.service.ts
 * Comunicación con los endpoints de eventos. No maneja estado ni interfaz.
 * ========================================================================= */

import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  ActualizarEventoDto,
  CrearEventoDto,
  Evento,
} from '../types/eventos.types';

export const eventosService = {
  /** Lista todos los eventos (incluye precioDesde). */
  async listar(): Promise<Evento[]> {
    const { data } = await apiClient.get<Evento[]>(ENDPOINTS.EVENTOS.LISTAR);
    return data;
  },

  /** Obtiene un evento por id. Lanza ApiError 404 si no existe. */
  async obtenerPorId(id: string): Promise<Evento> {
    const { data } = await apiClient.get<Evento>(ENDPOINTS.EVENTOS.DETALLE(id));
    return data;
  },

  /** Crea un evento directo (sin pasar por SolicitudEvento). Solo Admin. */
  async crear(dto: CrearEventoDto): Promise<Evento> {
    const { data } = await apiClient.post<Evento>(ENDPOINTS.EVENTOS.CREAR, dto);
    return data;
  },

  /** Actualiza campos parciales. Solo Admin. */
  async actualizar(id: string, dto: ActualizarEventoDto): Promise<Evento> {
    const { data } = await apiClient.patch<Evento>(
      ENDPOINTS.EVENTOS.ACTUALIZAR(id),
      dto,
    );
    return data;
  },

  /** Marca el evento como finalizado. Solo Admin. Irreversible. */
  async cerrar(id: string): Promise<Evento> {
    const { data } = await apiClient.post<Evento>(ENDPOINTS.EVENTOS.CERRAR(id));
    return data;
  },
};
