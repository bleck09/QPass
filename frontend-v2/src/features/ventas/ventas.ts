/* Feature ventas (compacta). Cobro de un Ayudante contra el saldo de la Entrada. */

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';

export interface VentaItem {
  id: string;
  productoId: string;
  nombreProducto: string;
  precioUnitario: string;
  cantidad: number;
}

export interface Venta {
  id: string;
  puestoId: string;
  ayudanteId: number;
  entradaId: string;
  montoTotal: string;
  createdAt: string;
  items: VentaItem[];
}

export interface CrearVentaDto {
  puestoId: string;
  entradaId: string;
  items: { productoId: string; cantidad: number }[];
}

function claveIdempotencia(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const ventasService = {
  async crear(dto: CrearVentaDto): Promise<Venta> {
    const { data } = await apiClient.post<Venta>(ENDPOINTS.VENTAS.CREAR, dto, {
      headers: { 'Idempotency-Key': claveIdempotencia() },
    });
    return data;
  },
};

export function useCrearVenta() {
  return useMutation<Venta, ApiError, CrearVentaDto>({
    mutationFn: ventasService.crear,
  });
}
