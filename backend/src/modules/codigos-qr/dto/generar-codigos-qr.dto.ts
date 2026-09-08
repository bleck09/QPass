import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerarCodigosQrDto {
  @IsString()
  eventoId: string;

  // Jornada para la que se genera este lote de manillas (ver DiaEvento).
  @IsString()
  diaEventoId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  cantidad: number;

  @IsOptional()
  @IsString()
  prefijo?: string;
}
