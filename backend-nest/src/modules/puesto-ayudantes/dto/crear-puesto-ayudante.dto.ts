import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CrearPuestoAyudanteDto {
  @IsString()
  puestoId: string;

  @Type(() => Number)
  @IsInt()
  ayudanteId: number;

  @IsOptional()
  @IsString()
  turno?: string;
}
