import { IsOptional, IsString } from 'class-validator';

/** Campos de perfil que el propio usuario (o un Admin) puede editar. */
export class ActualizarUsuarioDto {
  // Opcional en el DTO, pero el service solo lo deja poner una vez (si ya
  // tiene ci cargado, se ignora — no se puede pisar el CI de otra persona).
  @IsOptional()
  @IsString()
  ci?: string;

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
