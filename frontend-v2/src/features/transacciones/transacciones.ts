/* Feature transacciones (compacta). Ledger de movimientos de dinero. Las
 * operaciones sensibles (recarga/devolución) mandan Idempotency-Key. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';

export type TipoTransaccion =
  | 'recarga'
  | 'consumo'
  | 'venta'
  | 'devolucion'
  | 'ajuste';

export interface Transaccion {
  id: string;
  eventoId: string;
  tipo: TipoTransaccion;
  monto: string;
  saldoResultante: string;
  usuarioId: number;
  entradaId: string | null;
  ventaId: string | null;
  operadorId: number;
  fotoCarnetUrl: string | null;
  nota: string | null;
  createdAt: string;
  operador?: { id: number; nombre: string };
  entrada?: { id: string; nombre: string; documento: string | null; foto: string | null };
}

export interface RecargaDto {
  entradaId: string;
  monto: number;
}

export interface DevolucionDto {
  usuarioId: number;
  eventoId: string;
  monto: number;
  fotoCarnetUrl: string;
  entradaId?: string;
}

interface RespuestaRecarga {
  usuario: { id: number; nombre: string; email: string; rol: string; saldo: string };
  transaccion: Transaccion;
}

function claveIdempotencia(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface FiltrosTransacciones {
  eventoId?: string;
  usuarioId?: number;
  entradaId?: string;
  tipo?: TipoTransaccion;
}

const transaccionesService = {
  async listar(filtros: FiltrosTransacciones): Promise<Transaccion[]> {
    const { data } = await apiClient.get<Transaccion[]>(
      ENDPOINTS.TRANSACCIONES.LISTAR,
      { params: filtros },
    );
    return data;
  },
  async recargar(dto: RecargaDto): Promise<RespuestaRecarga> {
    const { data } = await apiClient.post<RespuestaRecarga>(
      ENDPOINTS.TRANSACCIONES.RECARGA,
      dto,
      { headers: { 'Idempotency-Key': claveIdempotencia() } },
    );
    return data;
  },
  async devolver(dto: DevolucionDto): Promise<Transaccion> {
    const { data } = await apiClient.post<Transaccion>(
      ENDPOINTS.TRANSACCIONES.DEVOLUCION,
      dto,
      { headers: { 'Idempotency-Key': claveIdempotencia() } },
    );
    return data;
  },
};

export function useTransacciones(filtros: FiltrosTransacciones) {
  return useQuery<Transaccion[], ApiError>({
    queryKey: ['transacciones', filtros],
    queryFn: () => transaccionesService.listar(filtros),
    enabled: Boolean(filtros.eventoId || filtros.usuarioId || filtros.entradaId),
  });
}

export function useRecargar() {
  return useMutation<RespuestaRecarga, ApiError, RecargaDto>({
    mutationFn: transaccionesService.recargar,
  });
}

export function useDevolver() {
  return useMutation<Transaccion, ApiError, DevolucionDto>({
    mutationFn: transaccionesService.devolver,
  });
}
