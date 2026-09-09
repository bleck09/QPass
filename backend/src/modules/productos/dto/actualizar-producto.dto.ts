import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Estado de un ProductoBase dentro de un Puesto (evento). Todos los campos de
 * estado son opcionales: se manda solo lo que cambió. `precio: null` limpia el
 * override y vuelve al precio del base; `stock: null` desactiva el inventario.
 * (Sin @Type: el body llega como JSON, los números ya son números — y así
 * `null` no se transforma en 0.)
 */
export class EstadoProductoDto {
  @IsString()
  puestoId: string;

  @IsString()
  productoBaseId: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  stock?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  precio?: number | null;
}
