import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import {
  MAX_EMAIL,
  MAX_PASSWORD,
  MENSAJE_MAX_PASSWORD,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

export class SolicitarRecuperacionDto {
  @IsEmail()
  @MaxLength(MAX_EMAIL, { message: mensajeMaxLength(MAX_EMAIL) })
  email: string;
}

export class VerificarCodigoDto {
  @IsEmail()
  @MaxLength(MAX_EMAIL, { message: mensajeMaxLength(MAX_EMAIL) })
  email: string;

  @IsString()
  @Length(6, 6)
  codigo: string;
}

export class RestablecerPasswordDto {
  @IsEmail()
  @MaxLength(MAX_EMAIL, { message: mensajeMaxLength(MAX_EMAIL) })
  email: string;

  @IsString()
  @Length(6, 6)
  codigo: string;

  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  @MaxLength(MAX_PASSWORD, { message: MENSAJE_MAX_PASSWORD })
  passwordNueva: string;
}
