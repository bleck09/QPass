import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  MAX_PASSWORD,
  MENSAJE_MAX_PASSWORD,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

export class CambiarPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Completa ambas contraseñas' })
  @MaxLength(200, { message: mensajeMaxLength(200) })
  passwordActual: string;

  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  @MaxLength(MAX_PASSWORD, { message: MENSAJE_MAX_PASSWORD })
  passwordNueva: string;
}
