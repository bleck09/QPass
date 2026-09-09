import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

/**
 * Posición del puesto en el mapa del recinto (x/y/ancho/alto — los define el
 * Admin) y si se muestra activo. El nombre/logo/catálogo se editan en el
 * PuestoBase, no acá.
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
}
