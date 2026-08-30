import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString } from 'class-validator';
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

export class CrearAsignacionDto {
  @IsString()
  eventoId: string;

  @Type(() => Number)
  @IsInt()
  usuarioId: number;

  @IsIn(ROLES)
  rol: Rol;
}
