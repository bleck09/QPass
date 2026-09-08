import { IsOptional, IsString, MinLength } from 'class-validator';

/** El negocio edita datos básicos de su ayudante. */
export class EditarAyudanteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @IsOptional()
  @IsString()
  foto?: string;
}

/** El negocio le pone una contraseña temporal nueva a su ayudante. */
export class ResetPasswordAyudanteDto {
  @IsString()
  @MinLength(6)
  passwordNueva: string;
}
