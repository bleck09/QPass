import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CrearPuestoDto {
  @IsString()
  eventoId: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  /** Solo lo usa un Admin creando en nombre de un negocio. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  negocioId?: number;
}
