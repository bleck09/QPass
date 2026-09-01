import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
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

  // El rol en el evento se deriva SIEMPRE del rol de la cuenta (Usuario.rol).
  // Se acepta por compatibilidad pero el servicio lo ignora.
  @IsOptional()
  @IsIn(ROLES)
  rol?: Rol;
}
