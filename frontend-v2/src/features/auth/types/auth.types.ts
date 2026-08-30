/* Espejo de los DTOs y respuestas de auth del backend (backend-nest/src/modules/auth). */

import type { Rol } from '@/shared/constants/roles';

export interface UsuarioAutenticado {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  foto: string | null;
}

export interface RespuestaLogin {
  token: string;
  usuario: UsuarioAutenticado;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegistroDto {
  nombre: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  email: string;
  password: string;
  ci?: string;
  celular?: string;
  fechaNacimiento?: string;
  rol?: Rol;
}

export interface RespuestaRegistro {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface SolicitarRecuperacionDto {
  email: string;
}

export interface VerificarCodigoDto {
  email: string;
  codigo: string;
}

export interface RestablecerPasswordDto {
  email: string;
  codigo: string;
  passwordNueva: string;
}
