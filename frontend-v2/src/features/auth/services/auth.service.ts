/* ============================================================================
 * src/features/auth/services/auth.service.ts
 * Comunicación con /auth del backend. No maneja estado ni interfaz.
 * ========================================================================= */

import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  LoginDto,
  RegistroDto,
  RestablecerPasswordDto,
  RespuestaLogin,
  RespuestaRegistro,
  SolicitarRecuperacionDto,
  VerificarCodigoDto,
} from '../types/auth.types';

export const authService = {
  async login(dto: LoginDto): Promise<RespuestaLogin> {
    const { data } = await apiClient.post<RespuestaLogin>(ENDPOINTS.AUTH.LOGIN, dto);
    return data;
  },

  async registro(dto: RegistroDto): Promise<RespuestaRegistro> {
    const { data } = await apiClient.post<RespuestaRegistro>(
      ENDPOINTS.AUTH.REGISTRO,
      dto,
    );
    return data;
  },

  async recuperarSolicitar(dto: SolicitarRecuperacionDto): Promise<{ codigoDemo: string }> {
    const { data } = await apiClient.post<{ codigoDemo: string }>(
      ENDPOINTS.AUTH.RECUPERAR_SOLICITAR,
      dto,
    );
    return data;
  },

  async recuperarVerificar(dto: VerificarCodigoDto): Promise<{ valido: boolean }> {
    const { data } = await apiClient.post<{ valido: boolean }>(
      ENDPOINTS.AUTH.RECUPERAR_VERIFICAR,
      dto,
    );
    return data;
  },

  async recuperarRestablecer(dto: RestablecerPasswordDto): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.RECUPERAR_RESTABLECER, dto);
  },
};
