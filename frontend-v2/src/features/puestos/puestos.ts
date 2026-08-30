/* Feature puestos (compacta): puestos, productos y ayudantes de un negocio. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';

export interface Producto {
  id: string;
  puestoId: string;
  nombre: string;
  precio: string;
  imagen: string | null;
  createdAt: string;
}

export interface PuestoAyudante {
  id: string;
  puestoId: string;
  ayudanteId: number;
  turno: string;
  createdAt: string;
  ayudante?: { id: number; nombre: string; email: string; foto: string | null };
  puesto?: { id: string; nombre: string; eventoId: string };
}

export interface Puesto {
  id: string;
  eventoId: string;
  negocioId: number;
  nombre: string;
  descripcion: string | null;
  logo: string | null;
  categoria: string | null;
  estadoActivo: boolean;
  createdAt: string;
  productos: Producto[];
  ayudantes: PuestoAyudante[];
}

const puestosService = {
  async listar(params: { eventoId: string; negocioId?: number }): Promise<Puesto[]> {
    const { data } = await apiClient.get<Puesto[]>(ENDPOINTS.PUESTOS.LISTAR, { params });
    return data;
  },
  async crear(dto: {
    eventoId: string;
    nombre: string;
    descripcion?: string;
    logo?: string;
    negocioId?: number;
  }): Promise<Puesto> {
    const { data } = await apiClient.post<Puesto>(ENDPOINTS.PUESTOS.CREAR, dto);
    return data;
  },
  async actualizar(
    id: string,
    dto: Partial<Pick<Puesto, 'nombre' | 'descripcion' | 'logo' | 'categoria' | 'estadoActivo'>>,
  ): Promise<Puesto> {
    const { data } = await apiClient.patch<Puesto>(ENDPOINTS.PUESTOS.ACTUALIZAR(id), dto);
    return data;
  },
};

const productosService = {
  async listar(puestoId: string): Promise<Producto[]> {
    const { data } = await apiClient.get<Producto[]>(ENDPOINTS.PRODUCTOS.LISTAR, {
      params: { puestoId },
    });
    return data;
  },
  async crear(dto: {
    puestoId: string;
    nombre: string;
    precio: number;
    imagen?: string;
  }): Promise<Producto> {
    const { data } = await apiClient.post<Producto>(ENDPOINTS.PRODUCTOS.CREAR, dto);
    return data;
  },
  async eliminar(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.PRODUCTOS.ELIMINAR(id));
  },
};

const ayudantesService = {
  /** Alta de una cuenta Ayudante hecha por el Negocio (queda atada a él). */
  async crearCuenta(dto: {
    nombre: string;
    email: string;
    password: string;
    celular?: string;
  }): Promise<{ id: number; nombre: string; email: string }> {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.REGISTRO, {
      ...dto,
      rol: 'Ayudante',
    });
    return data;
  },
  async listarPorAyudante(ayudanteId: number): Promise<PuestoAyudante[]> {
    const { data } = await apiClient.get<PuestoAyudante[]>(
      ENDPOINTS.PUESTO_AYUDANTES.LISTAR,
      { params: { ayudanteId } },
    );
    return data;
  },
  async asignar(dto: {
    puestoId: string;
    ayudanteId: number;
    turno?: string;
  }): Promise<PuestoAyudante> {
    const { data } = await apiClient.post<PuestoAyudante>(
      ENDPOINTS.PUESTO_AYUDANTES.CREAR,
      dto,
    );
    return data;
  },
  async quitar(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.PUESTO_AYUDANTES.ELIMINAR(id));
  },
};

export const PUESTOS_KEYS = {
  todos: ['puestos'] as const,
  lista: (eventoId: string, negocioId?: number) =>
    ['puestos', eventoId, negocioId ?? 'todos'] as const,
  misPuestosAyudante: (ayudanteId: number) =>
    ['puesto-ayudantes', 'de', ayudanteId] as const,
};

export function usePuestos(eventoId: string, negocioId?: number) {
  return useQuery<Puesto[], ApiError>({
    queryKey: PUESTOS_KEYS.lista(eventoId, negocioId),
    queryFn: () => puestosService.listar({ eventoId, negocioId }),
    enabled: Boolean(eventoId),
  });
}

export function useProductosDePuesto(puestoId: string | undefined) {
  return useQuery<Producto[], ApiError>({
    queryKey: ['productos', puestoId],
    queryFn: () => productosService.listar(puestoId as string),
    enabled: Boolean(puestoId),
  });
}

export function useMisPuestosComoAyudante(ayudanteId: number | undefined) {
  return useQuery<PuestoAyudante[], ApiError>({
    queryKey: PUESTOS_KEYS.misPuestosAyudante(ayudanteId ?? 0),
    queryFn: () => ayudantesService.listarPorAyudante(ayudanteId as number),
    enabled: Boolean(ayudanteId),
  });
}

function useInvalidarPuestos() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: PUESTOS_KEYS.todos });
  };
}

export function useCrearPuesto() {
  const invalidar = useInvalidarPuestos();
  return useMutation<
    Puesto,
    ApiError,
    Parameters<typeof puestosService.crear>[0]
  >({ mutationFn: puestosService.crear, onSuccess: invalidar });
}
export function useActualizarPuesto() {
  const invalidar = useInvalidarPuestos();
  return useMutation<
    Puesto,
    ApiError,
    { id: string } & Parameters<typeof puestosService.actualizar>[1]
  >({
    mutationFn: ({ id, ...dto }) => puestosService.actualizar(id, dto),
    onSuccess: invalidar,
  });
}
export function useCrearProducto() {
  const invalidar = useInvalidarPuestos();
  return useMutation<
    Producto,
    ApiError,
    Parameters<typeof productosService.crear>[0]
  >({ mutationFn: productosService.crear, onSuccess: invalidar });
}
export function useEliminarProducto() {
  const invalidar = useInvalidarPuestos();
  return useMutation<void, ApiError, string>({
    mutationFn: productosService.eliminar,
    onSuccess: invalidar,
  });
}
export function useCrearCuentaAyudante() {
  return useMutation<
    Awaited<ReturnType<typeof ayudantesService.crearCuenta>>,
    ApiError,
    Parameters<typeof ayudantesService.crearCuenta>[0]
  >({ mutationFn: ayudantesService.crearCuenta });
}
export function useAsignarAyudante() {
  const invalidar = useInvalidarPuestos();
  return useMutation<
    PuestoAyudante,
    ApiError,
    Parameters<typeof ayudantesService.asignar>[0]
  >({ mutationFn: ayudantesService.asignar, onSuccess: invalidar });
}
export function useQuitarAyudante() {
  const invalidar = useInvalidarPuestos();
  return useMutation<void, ApiError, string>({
    mutationFn: ayudantesService.quitar,
    onSuccess: invalidar,
  });
}
