/* Espejo de la proyección pública de Usuario del backend (SELECT_PUBLICO). */

import type { Rol } from '@/shared/constants/roles';

export interface Usuario {
  id: number;
  nombre: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  email: string;
  rol: Rol;
  ci: string | null;
  celular: string | null;
  foto: string | null;
  ciudad: string | null;
  biografia: string | null;
  fechaNacimiento: string | null;
  createdAt: string;
  saldo: string; // Decimal serializado
  negocioAsignadoId: number | null;
}

export interface ActualizarPerfilDto {
  celular?: string;
  ciudad?: string;
  biografia?: string;
  fechaNacimiento?: string;
  foto?: string;
}

export interface CambiarPasswordDto {
  passwordActual: string;
  passwordNueva: string;
}

export interface CambioPassword {
  id: string;
  usuarioId: number;
  origen: 'self' | 'recuperacion';
  createdAt: string;
}
