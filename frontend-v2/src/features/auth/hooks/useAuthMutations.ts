/* ============================================================================
 * Hooks de auth. Conectan authService con React (TanStack Query) y con la
 * sesión. El componente solo consume `mutate`, `isPending`, `error`.
 * ========================================================================= */

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RUTAS } from '@/shared/constants/rutas';
import type { ApiError } from '@/lib/api/errors';
import { authService } from '../services/auth.service';
import { useSesion } from '../context/sesion-context';
import type {
  LoginDto,
  RegistroDto,
  RestablecerPasswordDto,
  SolicitarRecuperacionDto,
  VerificarCodigoDto,
} from '../types/auth.types';

export function useLogin() {
  const { iniciarSesion } = useSesion();

  return useMutation<Awaited<ReturnType<typeof authService.login>>, ApiError, LoginDto>({
    mutationFn: authService.login,
    // Solo guarda la sesión. El redirect lo hace <Navigate> en LoginPage cuando
    // el contexto ya reflejó estaAutenticado=true (evita la race con el router).
    onSuccess: ({ token, usuario }) => {
      iniciarSesion({ token, usuario });
    },
  });
}

export function useRegistro() {
  const navigate = useNavigate();

  return useMutation<
    Awaited<ReturnType<typeof authService.registro>>,
    ApiError,
    RegistroDto
  >({
    mutationFn: authService.registro,
    onSuccess: () => {
      navigate(RUTAS.LOGIN, {
        replace: true,
        state: { aviso: 'Cuenta creada. Inicia sesión.' },
      });
    },
  });
}

export function useRecuperarSolicitar() {
  return useMutation<
    Awaited<ReturnType<typeof authService.recuperarSolicitar>>,
    ApiError,
    SolicitarRecuperacionDto
  >({ mutationFn: authService.recuperarSolicitar });
}

export function useRecuperarVerificar() {
  return useMutation<
    Awaited<ReturnType<typeof authService.recuperarVerificar>>,
    ApiError,
    VerificarCodigoDto
  >({ mutationFn: authService.recuperarVerificar });
}

export function useRecuperarRestablecer() {
  const navigate = useNavigate();
  return useMutation<void, ApiError, RestablecerPasswordDto>({
    mutationFn: authService.recuperarRestablecer,
    onSuccess: () => {
      navigate(RUTAS.LOGIN, {
        replace: true,
        state: { aviso: 'Contraseña actualizada. Inicia sesión.' },
      });
    },
  });
}
