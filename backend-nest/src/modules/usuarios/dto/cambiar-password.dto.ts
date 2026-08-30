import { IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Completa ambas contraseñas' })
  passwordActual: string;

  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  passwordNueva: string;
}
