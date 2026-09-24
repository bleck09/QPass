import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoElementoMapa } from '@prisma/client';
import { MAX_NOMBRE, mensajeMaxLength } from '../../../common/dto/validacion.constantes';

const TIPOS: TipoElementoMapa[] = [
  'entrada',
  'banos',
  'escenario',
  'recargador',
  'supervisor',
  'otro',
];

/** Posición/tamaño en el plano (igual que ActualizarPuestoDto) + nombre/tipo editables. */
export class ActualizarElementoMapaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre?: string;

  @IsOptional()
  @IsIn(TIPOS)
  tipo?: TipoElementoMapa;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  x?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  y?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ancho?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  alto?: number;
}
