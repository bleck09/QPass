import { IsOptional, IsString } from 'class-validator';

export class CrearAvisoStockDto {
  @IsString()
  puestoId: string;

  @IsString()
  productoBaseId: string;

  @IsOptional()
  @IsString()
  nota?: string;
}
