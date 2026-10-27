import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Posición del puesto en el mapa del recinto (x/y/ancho/alto — los define el
 * Admin) y si se muestra activo. El nombre/logo/catálogo se editan en el
 * PuestoBase, no acá.
 *
 * `cortesiasPorPersona` lo fija el negocio: tope total de cortesías distintas
 * por manilla en este puesto (null = sin tope; cada cortesía igual se entrega
 * una sola vez).
 */
export class ActualizarPuestoDto {
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

  @IsOptional()
  @IsBoolean()
  estadoActivo?: boolean;

  // Sin @Type: llega como JSON y así `null` (sin tope) no se vuelve 0.
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(50)
  cortesiasPorPersona?: number | null;
}
