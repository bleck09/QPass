import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Rol, Sexo, TipoDocumento } from '@prisma/client';
import {
  FORMA_NOMBRE,
  MENSAJE_NOMBRE,
  MAX_NOMBRE,
  MAX_EMAIL,
  MAX_PASSWORD,
  MENSAJE_MAX_PASSWORD,
  MAX_DOCUMENTO,
  MAX_CELULAR,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';
import { PAISES } from '../../../common/dto/paises.constantes';
import { EdadMinima } from '../../../common/decorators/edad-minima.decorator';

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

const SEXOS: Sexo[] = ['masculino', 'femenino', 'otro', 'prefiero_no_decir'];
const TIPOS_DOCUMENTO: TipoDocumento[] = ['ci', 'pasaporte', 'otro'];

// Edad mínima para tener cuenta propia (los menores entran como invitados de
// otra cuenta, sin necesitar la suya — ver ComprasService/CamposEntrada).
const EDAD_MINIMA_REGISTRO = 13;

export class RegistroDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre: string;

  @IsOptional()
  @IsString()
  @Matches(FORMA_NOMBRE, { message: MENSAJE_NOMBRE })
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  @Matches(FORMA_NOMBRE, { message: MENSAJE_NOMBRE })
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  apellidoMaterno?: string;

  @IsEmail()
  @MaxLength(MAX_EMAIL, { message: mensajeMaxLength(MAX_EMAIL) })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(MAX_PASSWORD, { message: MENSAJE_MAX_PASSWORD })
  password: string;

  // Tipo de documento del número que va en `ci` (CI boliviano, pasaporte u
  // otro) — permite distinguir extranjeros sin CI boliviano.
  @IsOptional()
  @IsIn(TIPOS_DOCUMENTO)
  tipoDocumento?: TipoDocumento;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DOCUMENTO, { message: mensajeMaxLength(MAX_DOCUMENTO) })
  ci?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CELULAR, { message: mensajeMaxLength(MAX_CELULAR) })
  celular?: string;

  @IsOptional()
  @IsString()
  @EdadMinima(EDAD_MINIMA_REGISTRO)
  fechaNacimiento?: string;

  @IsOptional()
  @IsIn(SEXOS)
  sexo?: Sexo;

  @IsOptional()
  @IsIn(PAISES)
  pais?: string;

  @IsOptional()
  @IsIn(ROLES)
  rol?: Rol;

  // Código de enviarCodigoRegistro(). Obligatorio SOLO en el autorregistro
  // (ver AuthService.registro) — cuando un Admin/UsuarioNegocio crea una
  // cuenta desde su panel no manda este campo y el service no lo exige.
  @IsOptional()
  @IsString()
  @Length(6, 6)
  codigoVerificacion?: string;
}

/** Body de POST /auth/registro/enviar-codigo. */
export class EnviarCodigoRegistroDto {
  @IsEmail()
  @MaxLength(MAX_EMAIL, { message: mensajeMaxLength(MAX_EMAIL) })
  email: string;
}
