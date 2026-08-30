import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import type { Rol } from '@/shared/constants/roles';
import { usuariosService, type CrearUsuarioDto } from '../services/usuarios.service';
import type {
  ActualizarPerfilDto,
  CambiarPasswordDto,
  CambioPassword,
  Usuario,
} from '../types/usuarios.types';

export const USUARIOS_KEYS = {
  todos: ['usuarios'] as const,
  lista: (rol?: Rol) => [...USUARIOS_KEYS.todos, 'lista', rol ?? 'todos'] as const,
  detalle: (id: number) => [...USUARIOS_KEYS.todos, 'detalle', id] as const,
  cambiosPassword: (id: number) =>
    [...USUARIOS_KEYS.todos, 'cambios-password', id] as const,
};

export function useUsuarios(rol?: Rol) {
  return useQuery<Usuario[], ApiError>({
    queryKey: USUARIOS_KEYS.lista(rol),
    queryFn: () => usuariosService.listar(rol),
  });
}

export function useUsuario(id: number | undefined) {
  return useQuery<Usuario, ApiError>({
    queryKey: USUARIOS_KEYS.detalle(id ?? 0),
    queryFn: () => usuariosService.obtenerPorId(id as number),
    enabled: Boolean(id),
  });
}

export function useActualizarPerfil(id: number) {
  const qc = useQueryClient();
  return useMutation<Usuario, ApiError, ActualizarPerfilDto>({
    mutationFn: (dto) => usuariosService.actualizar(id, dto),
    onSuccess: (usuario) => {
      qc.setQueryData(USUARIOS_KEYS.detalle(id), usuario);
      qc.invalidateQueries({ queryKey: USUARIOS_KEYS.todos });
    },
  });
}

export function useCambiarPassword(id: number) {
  return useMutation<void, ApiError, CambiarPasswordDto>({
    mutationFn: (dto) => usuariosService.cambiarPassword(id, dto),
  });
}

export function useHistorialPassword(id: number | undefined) {
  return useQuery<CambioPassword[], ApiError>({
    queryKey: USUARIOS_KEYS.cambiosPassword(id ?? 0),
    queryFn: () => usuariosService.historialPassword(id as number),
    enabled: Boolean(id),
  });
}

export function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof usuariosService.crear>>,
    ApiError,
    CrearUsuarioDto
  >({
    mutationFn: usuariosService.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: USUARIOS_KEYS.todos }),
  });
}

export function useEliminarUsuario() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: usuariosService.eliminar,
    onSuccess: () => qc.invalidateQueries({ queryKey: USUARIOS_KEYS.todos }),
  });
}
