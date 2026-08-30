import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearCategoriaTicketDto {
  @IsString()
  eventoId: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;
}
