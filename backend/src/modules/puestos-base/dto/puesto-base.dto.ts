import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  MAX_NOMBRE,
  MAX_NOTA,
  MAX_URL,
  MAX_ETIQUETA_CORTA,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

/** Un puesto del catálogo del negocio (se define una vez, se reutiliza entre eventos). */
export class CrearPuestoBaseDto {
  @IsString()
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ETIQUETA_CORTA, { message: mensajeMaxLength(MAX_ETIQUETA_CORTA) })
  categoria?: string;
}

export class ActualizarPuestoBaseDto extends PartialType(CrearPuestoBaseDto) {}

/** Un producto del catálogo base. `precio` es el valor por defecto; cada evento puede sobrescribirlo. */
export class CrearProductoBaseDto {
  @IsString()
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  imagen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ETIQUETA_CORTA, { message: mensajeMaxLength(MAX_ETIQUETA_CORTA) })
  categoria?: string;
}

export class ActualizarProductoBaseDto extends PartialType(CrearProductoBaseDto) {}
