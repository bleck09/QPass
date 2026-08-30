import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerarCodigosQrDto {
  @IsString()
  eventoId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  cantidad: number;

  @IsOptional()
  @IsString()
  prefijo?: string;
}
