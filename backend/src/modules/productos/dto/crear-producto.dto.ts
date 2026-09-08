import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  // §5.4 — false = no se puede vender ("agotado" sin borrar el Producto).
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // §5.4 — null/omitido = sin control de inventario; un número lo activa.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  // §5.11 — "bebida" | "comida" | ... para agrupar ventas.
  @IsOptional()
  @IsString()
  categoria?: string;
}
