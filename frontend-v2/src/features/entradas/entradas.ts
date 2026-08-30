/* Feature entradas (compacta). Boleto/persona de una compra + su manilla QR +
 * su historial de control de acceso. El saldo vive en el Usuario dueño. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { EstadoIngreso } from '@/features/compras';

export interface CodigoQrVinculado {
  id: string;
  codigo: string;
}

export interface Entrada {
  id: string;
  eventoId: string;
  usuarioId: number | null;
  isTitular: boolean;
  nombre: string;
  correo: string;
  celular: string | null;
  documento: string | null;
  foto: string | null;
  estadoIngreso: EstadoIngreso;
  createdAt: string;
  categoriaTicket?: { id: string; nombre: string } | null;
  codigoQrVinculado?: CodigoQrVinculado | null;
  usuario?: { id: number; saldo: string; foto: string | null } | null;
  vecesIngreso?: number;
  vecesSalida?: number;
}

export interface RegistroIngreso {
  id: string;
  entradaId: string;
  tipo: 'ingreso' | 'salida';
  foto: string | null;
  createdAt: string;
  registradoPor?: { id: number; nombre: string };
}

const entradasService = {
  async listar(eventoId: string, estadoIngreso?: EstadoIngreso): Promise<Entrada[]> {
    const { data } = await apiClient.get<Entrada[]>(ENDPOINTS.ENTRADAS.LISTAR, {
      params: { eventoId, ...(estadoIngreso ? { estadoIngreso } : {}) },
    });
    return data;
  },
  async buscarPorCodigo(codigo: string): Promise<Entrada> {
    const { data } = await apiClient.get<Entrada>(
      ENDPOINTS.ENTRADAS.BUSCAR_POR_CODIGO(codigo),
    );
    return data;
  },
  async registros(id: string): Promise<RegistroIngreso[]> {
    const { data } = await apiClient.get<RegistroIngreso[]>(
      ENDPOINTS.ENTRADAS.REGISTROS(id),
    );
    return data;
  },
  async vincularQr(id: string, codigoQrId: string): Promise<Entrada> {
    const { data } = await apiClient.post<Entrada>(ENDPOINTS.ENTRADAS.VINCULAR_QR(id), {
      codigoQrId,
    });
    return data;
  },
  async anularQr(id: string, motivo?: string): Promise<void> {
    await apiClient.post(ENDPOINTS.ENTRADAS.ANULAR_QR(id), { motivo });
  },
  async ingreso(id: string, foto?: string): Promise<Entrada> {
    const { data } = await apiClient.post<Entrada>(ENDPOINTS.ENTRADAS.INGRESO(id), {
      foto,
    });
    return data;
  },
  async salida(id: string, foto?: string): Promise<Entrada> {
    const { data } = await apiClient.post<Entrada>(ENDPOINTS.ENTRADAS.SALIDA(id), {
      foto,
    });
    return data;
  },
};

export const ENTRADAS_KEYS = {
  todas: ['entradas'] as const,
  lista: (eventoId: string, estado?: string) =>
    ['entradas', eventoId, estado ?? 'todas'] as const,
  registros: (id: string) => ['entradas', 'registros', id] as const,
};

export function useEntradas(eventoId: string, estadoIngreso?: EstadoIngreso) {
  return useQuery<Entrada[], ApiError>({
    queryKey: ENTRADAS_KEYS.lista(eventoId, estadoIngreso),
    queryFn: () => entradasService.listar(eventoId, estadoIngreso),
    enabled: Boolean(eventoId),
  });
}

export function useRegistrosEntrada(id: string | undefined) {
  return useQuery<RegistroIngreso[], ApiError>({
    queryKey: ENTRADAS_KEYS.registros(id ?? ''),
    queryFn: () => entradasService.registros(id as string),
    enabled: Boolean(id),
  });
}

/** buscarPorCodigo bajo demanda (no es una query cacheada). */
export function buscarEntradaPorCodigo(codigo: string) {
  return entradasService.buscarPorCodigo(codigo);
}

export function useVincularQr() {
  const qc = useQueryClient();
  return useMutation<Entrada, ApiError, { id: string; codigoQrId: string }>({
    mutationFn: ({ id, codigoQrId }) => entradasService.vincularQr(id, codigoQrId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENTRADAS_KEYS.todas }),
  });
}

export function useAnularQr() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, { id: string; motivo?: string }>({
    mutationFn: ({ id, motivo }) => entradasService.anularQr(id, motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENTRADAS_KEYS.todas }),
  });
}

export function useRegistrarMovimiento() {
  const qc = useQueryClient();
  return useMutation<
    Entrada,
    ApiError,
    { id: string; tipo: 'ingreso' | 'salida'; foto?: string }
  >({
    mutationFn: ({ id, tipo, foto }) =>
      tipo === 'ingreso'
        ? entradasService.ingreso(id, foto)
        : entradasService.salida(id, foto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENTRADAS_KEYS.todas }),
  });
}
