import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearProductoDto {
  @IsString()
  puestoId: string;

  @IsString()
  nombre: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsString()
  imagen?: string;
}
