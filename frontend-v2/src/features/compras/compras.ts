/* Feature compras (compacta). Orden de compra de entradas (titular + invitados),
 * pago manual con comprobante, aprobación del Admin. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Evento } from '@/features/eventos';

export type EstadoCompra = 'pendiente' | 'confirmado' | 'rechazado';
export type EstadoIngreso = 'pendiente' | 'ingresado' | 'salio';

export interface EntradaCompra {
  id: string;
  eventoId: string;
  categoriaTicketId: string | null;
  usuarioId: number | null;
  isTitular: boolean;
  nombre: string;
  correo: string;
  celular: string | null;
  documento: string | null;
  foto: string | null;
  estadoIngreso: EstadoIngreso;
  createdAt: string;
  categoriaTicket?: { id: string; nombre: string; precio: string };
  codigoQrVinculado?: { id: string; codigo: string } | null;
}

export interface Compra {
  id: string;
  eventoId: string;
  compradorId: number;
  montoTotal: string;
  estado: EstadoCompra;
  comprobanteUrl: string | null;
  comprobanteNombreArchivo: string | null;
  motivoRechazo: string | null;
  resueltoEn: string | null;
  createdAt: string;
  entradas: EntradaCompra[];
  evento?: Evento;
  comprador?: { id: number; nombre: string; email: string };
}

export interface NuevaEntradaCompra {
  categoriaTicketId: string;
  isTitular?: boolean;
  nombre: string;
  correo: string;
  celular?: string;
}

export interface CrearCompraDto {
  eventoId: string;
  entradas: NuevaEntradaCompra[];
  comprobanteUrl?: string;
  comprobanteNombreArchivo?: string;
}

export interface CorregirEntradasDto {
  entradas: { id: string; nombre: string; correo: string; celular?: string }[];
}

interface CompraAprobada extends Compra {
  passwordsGeneradas: Record<string, string>;
}

const comprasService = {
  async crear(dto: CrearCompraDto): Promise<Compra> {
    const { data } = await apiClient.post<Compra>(ENDPOINTS.COMPRAS.CREAR, dto);
    return data;
  },
  async mias(): Promise<Compra[]> {
    const { data } = await apiClient.get<Compra[]>(ENDPOINTS.COMPRAS.MIAS);
    return data;
  },
  async listar(eventoId?: string): Promise<Compra[]> {
    const { data } = await apiClient.get<Compra[]>(ENDPOINTS.COMPRAS.LISTAR, {
      params: eventoId ? { eventoId } : undefined,
    });
    return data;
  },
  async corregirEntradas(id: string, dto: CorregirEntradasDto): Promise<Compra> {
    const { data } = await apiClient.patch<Compra>(
      ENDPOINTS.COMPRAS.CORREGIR_ENTRADAS(id),
      dto,
    );
    return data;
  },
  async aprobar(id: string): Promise<CompraAprobada> {
    const { data } = await apiClient.post<CompraAprobada>(ENDPOINTS.COMPRAS.APROBAR(id));
    return data;
  },
  async rechazar(id: string, motivoRechazo?: string): Promise<Compra> {
    const { data } = await apiClient.post<Compra>(ENDPOINTS.COMPRAS.RECHAZAR(id), {
      motivoRechazo,
    });
    return data;
  },
};

export const COMPRAS_KEYS = {
  todas: ['compras'] as const,
  mias: ['compras', 'mias'] as const,
  lista: (eventoId?: string) => ['compras', 'lista', eventoId ?? 'todas'] as const,
};

export function useMisCompras() {
  return useQuery<Compra[], ApiError>({
    queryKey: COMPRAS_KEYS.mias,
    queryFn: comprasService.mias,
  });
}

export function useCompras(eventoId?: string) {
  return useQuery<Compra[], ApiError>({
    queryKey: COMPRAS_KEYS.lista(eventoId),
    queryFn: () => comprasService.listar(eventoId),
  });
}

export function useCrearCompra() {
  const qc = useQueryClient();
  return useMutation<Compra, ApiError, CrearCompraDto>({
    mutationFn: comprasService.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPRAS_KEYS.todas }),
  });
}

export function useCorregirEntradas(id: string) {
  const qc = useQueryClient();
  return useMutation<Compra, ApiError, CorregirEntradasDto>({
    mutationFn: (dto) => comprasService.corregirEntradas(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPRAS_KEYS.todas }),
  });
}

export function useAprobarCompra() {
  const qc = useQueryClient();
  return useMutation<CompraAprobada, ApiError, string>({
    mutationFn: comprasService.aprobar,
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPRAS_KEYS.todas }),
  });
}

export function useRechazarCompra() {
  const qc = useQueryClient();
  return useMutation<Compra, ApiError, { id: string; motivoRechazo?: string }>({
    mutationFn: ({ id, motivoRechazo }) => comprasService.rechazar(id, motivoRechazo),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPRAS_KEYS.todas }),
  });
}
