/* ============================================================================
 * Feature categorias-ticket (compacta: tipos + servicio + hooks en un archivo).
 * Categorías/tipos de entrada de un evento. La reserva de cupo la maneja el
 * backend de forma atómica al comprar.
 * ========================================================================= */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';

export interface CategoriaTicket {
  id: string;
  eventoId: string;
  nombre: string;
  descripcion: string | null;
  cantidad: number;
  cantidadVendida: number;
  precio: string;
  createdAt: string;
}

export interface CrearCategoriaDto {
  eventoId: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  precio: number;
}

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, 'Indica el nombre'),
  descripcion: z.string().trim().optional().or(z.literal('')),
  cantidad: z
    .string()
    .min(1, 'Requerido')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, 'Entero mayor a 0'),
  precio: z
    .string()
    .min(1, 'Requerido')
    .refine((v) => Number(v) >= 0, 'No puede ser negativo'),
});
export type CategoriaFormValues = z.infer<typeof categoriaSchema>;

const categoriasService = {
  async listar(eventoId: string): Promise<CategoriaTicket[]> {
    const { data } = await apiClient.get<CategoriaTicket[]>(
      ENDPOINTS.CATEGORIAS_TICKET.LISTAR,
      { params: { eventoId } },
    );
    return data;
  },
  async crear(dto: CrearCategoriaDto): Promise<CategoriaTicket> {
    const { data } = await apiClient.post<CategoriaTicket>(
      ENDPOINTS.CATEGORIAS_TICKET.CREAR,
      dto,
    );
    return data;
  },
  async eliminar(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.CATEGORIAS_TICKET.ELIMINAR(id));
  },
};

export const CATEGORIAS_KEYS = {
  todas: ['categorias-ticket'] as const,
  lista: (eventoId: string) => ['categorias-ticket', eventoId] as const,
};

export function useCategoriasTicket(eventoId: string) {
  return useQuery<CategoriaTicket[], ApiError>({
    queryKey: CATEGORIAS_KEYS.lista(eventoId),
    queryFn: () => categoriasService.listar(eventoId),
    enabled: Boolean(eventoId),
  });
}

export function useCrearCategoria(eventoId: string) {
  const qc = useQueryClient();
  return useMutation<CategoriaTicket, ApiError, CrearCategoriaDto>({
    mutationFn: categoriasService.crear,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: CATEGORIAS_KEYS.lista(eventoId) }),
  });
}

export function useEliminarCategoria(eventoId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: categoriasService.eliminar,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: CATEGORIAS_KEYS.lista(eventoId) }),
  });
}
