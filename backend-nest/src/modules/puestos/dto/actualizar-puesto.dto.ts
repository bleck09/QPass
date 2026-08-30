import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Datos del puesto (nombre/logo) o su posición en el mapa
 * (x/y/ancho/alto/estadoActivo — los define el Admin).
 */
export class ActualizarPuestoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

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
