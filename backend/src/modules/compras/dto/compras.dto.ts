import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  FORMA_NOMBRE,
  MENSAJE_NOMBRE,
  MAX_NOMBRE,
  MAX_EMAIL,
  MAX_CELULAR,
  MAX_URL,
  MAX_NOMBRE_ARCHIVO,
  MAX_VERSION_TERMINOS,
  MAX_NOTA,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

export class EntradaCompraDto {
  @IsString()
  categoriaTicketId: string;

  @IsOptional()
  @IsBoolean()
  isTitular?: boolean;

  @IsString()
  @Matches(FORMA_NOMBRE, { message: MENSAJE_NOMBRE })
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre: string;

  @IsEmail()
  @MaxLength(MAX_EMAIL, { message: mensajeMaxLength(MAX_EMAIL) })
  correo: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CELULAR, { message: mensajeMaxLength(MAX_CELULAR) })
  celular?: string;
}

export class CrearCompraDto {
  @IsString()
  eventoId: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Agrega al menos una entrada' })
  @ValidateNested({ each: true })
  @Type(() => EntradaCompraDto)
  entradas: EntradaCompraDto[];

  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  comprobanteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOMBRE_ARCHIVO, { message: mensajeMaxLength(MAX_NOMBRE_ARCHIVO) })
  comprobanteNombreArchivo?: string;

  // 'manual' (default, comprobante + aprobación de Admin) o 'libelula'
  // (pasarela de pagos, confirmación automática vía webhook).
  @IsOptional()
  @IsIn(['manual', 'libelula'])
  metodoPago?: 'manual' | 'libelula';

  // §T&C — el comprador declara que aceptó los términos (obligatorio).
  @IsBoolean()
  aceptoTerminos: boolean;

  @IsString()
  @MaxLength(MAX_VERSION_TERMINOS, { message: mensajeMaxLength(MAX_VERSION_TERMINOS) })
  versionTerminos: string;
}

export class EntradaCorreccionDto {
  @IsString()
  id: string;

  @IsString()
  @Matches(FORMA_NOMBRE, { message: MENSAJE_NOMBRE })
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre: string;

  @IsEmail()
  @MaxLength(MAX_EMAIL, { message: mensajeMaxLength(MAX_EMAIL) })
  correo: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CELULAR, { message: mensajeMaxLength(MAX_CELULAR) })
  celular?: string;
}

export class CorregirEntradasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntradaCorreccionDto)
  entradas: EntradaCorreccionDto[];
}

export class RechazarCompraDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  motivoRechazo?: string;
}
