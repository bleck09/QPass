import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemVentaDto {
  /** ProductoBase.id — el precio/estado efectivo sale del ProductoEstado del puesto. */
  @IsString()
  productoId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CrearVentaDto {
  @IsString()
  puestoId: string;

  @IsString()
  entradaId: string;

  // Manilla escaneada. Si es la copia de un duplicado, se rechaza (ver
  // CasosDuplicadoService.asegurarManillaUsable).
  @IsOptional()
  @IsString()
  codigoQr?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Agrega al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];
}
