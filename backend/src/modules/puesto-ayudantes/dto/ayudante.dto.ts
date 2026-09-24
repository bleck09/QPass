import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  MAX_NOMBRE,
  MAX_URL,
  MAX_PASSWORD,
  MENSAJE_MAX_PASSWORD,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

/** El negocio edita datos básicos de su ayudante. */
export class EditarAyudanteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  foto?: string;
}

/** El negocio le pone una contraseña temporal nueva a su ayudante. */
export class ResetPasswordAyudanteDto {
  @IsString()
  @MinLength(6)
  @MaxLength(MAX_PASSWORD, { message: MENSAJE_MAX_PASSWORD })
  passwordNueva: string;
}
