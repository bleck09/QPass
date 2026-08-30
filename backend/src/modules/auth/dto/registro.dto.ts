import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Rol } from '@prisma/client';

const ROLES: Rol[] = [
  'Admin',
  'Cliente',
  'Recargador',
  'Supervisor',
  'Devolucion',
  'UsuarioNormal',
  'UsuarioNegocio',
  'Ayudante',
];

export class RegistroDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsString()
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  apellidoMaterno?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  ci?: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsIn(ROLES)
  rol?: Rol;
}
