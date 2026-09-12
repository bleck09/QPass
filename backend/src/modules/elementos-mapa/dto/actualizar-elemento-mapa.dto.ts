import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { TipoElementoMapa } from '@prisma/client';

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
