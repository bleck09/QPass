import { IsOptional, IsString } from 'class-validator';

/** Campos de perfil que el propio usuario (o un Admin) puede editar. */
export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  biografia?: string;

  @IsOptional()
  @IsString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  foto?: string;
}
