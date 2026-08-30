/* ============================================================================
 * src/features/usuarios/services/usuarios.service.ts
 * Endpoints de /usuarios. La creación de cuentas operativas (Recargador,
 * Supervisor, Devolución, Negocio) va por /auth/registro con el token del
 * Admin, para que quede auditado quién la creó.
 * ========================================================================= */

import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Rol } from '@/shared/constants/roles';
import type {
  ActualizarPerfilDto,
  CambiarPasswordDto,
  CambioPassword,
  Usuario,
} from '../types/usuarios.types';

export interface CrearUsuarioDto {
  nombre: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  email: string;
  password: string;
  ci?: string;
  celular?: string;
  rol: Rol;
}

export const usuariosService = {
  async listar(rol?: Rol): Promise<Usuario[]> {
    const { data } = await apiClient.get<Usuario[]>(ENDPOINTS.USUARIOS.LISTAR, {
      params: rol ? { rol } : undefined,
    });
    return data;
  },

  async obtenerPorId(id: number): Promise<Usuario> {
    const { data } = await apiClient.get<Usuario>(ENDPOINTS.USUARIOS.DETALLE(id));
    return data;
  },

  async actualizar(id: number, dto: ActualizarPerfilDto): Promise<Usuario> {
    const { data } = await apiClient.patch<Usuario>(
      ENDPOINTS.USUARIOS.ACTUALIZAR(id),
      dto,
    );
    return data;
  },

  async cambiarPassword(id: number, dto: CambiarPasswordDto): Promise<void> {
    await apiClient.post(ENDPOINTS.USUARIOS.PASSWORD(id), dto);
  },

  async historialPassword(id: number): Promise<CambioPassword[]> {
    const { data } = await apiClient.get<CambioPassword[]>(
      ENDPOINTS.USUARIOS.CAMBIOS_PASSWORD(id),
    );
    return data;
  },

  async eliminar(id: number): Promise<void> {
    await apiClient.delete(ENDPOINTS.USUARIOS.ELIMINAR(id));
  },

  /** Alta de una cuenta operativa hecha por el Admin (auditada). */
  async crear(dto: CrearUsuarioDto): Promise<{ id: number; nombre: string; email: string; rol: Rol }> {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.REGISTRO, dto);
    return data;
  },
};
