import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_EMAIL, mensajeMaxLength } from '../../../common/dto/validacion.constantes';

export class LoginDto {
  @IsEmail()
  @MaxLength(MAX_EMAIL, { message: mensajeMaxLength(MAX_EMAIL) })
  email: string;

  // Tope generoso (no bcrypt-específico: acá solo se compara, no se hashea
  // una contraseña nueva) para no dejar pasar payloads absurdos.
  @IsString()
  @MinLength(1)
  @MaxLength(200, { message: mensajeMaxLength(200) })
  password: string;
}
