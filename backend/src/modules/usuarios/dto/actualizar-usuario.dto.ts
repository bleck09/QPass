import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Sexo, TipoDocumento } from '@prisma/client';
import {
  MAX_DOCUMENTO,
  MAX_CELULAR,
  MAX_NOMBRE,
  MAX_NOTA,
  MAX_URL,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';
import { PAISES } from '../../../common/dto/paises.constantes';
import { EdadMinima } from '../../../common/decorators/edad-minima.decorator';

const SEXOS: Sexo[] = ['masculino', 'femenino', 'otro', 'prefiero_no_decir'];
const TIPOS_DOCUMENTO: TipoDocumento[] = ['ci', 'pasaporte', 'otro'];
const EDAD_MINIMA_REGISTRO = 13;

/** Campos de perfil que el propio usuario (o un Admin) puede editar. */
export class ActualizarUsuarioDto {
  // Opcional en el DTO, pero el service solo lo deja poner una vez (si ya
  // tiene ci cargado, se ignora — no se puede pisar el CI de otra persona).
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
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  ciudad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  biografia?: string;

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
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  foto?: string;
}
