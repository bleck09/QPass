import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemVentaDto {
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

  @IsArray()
  @ArrayNotEmpty({ message: 'Agrega al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];
}
