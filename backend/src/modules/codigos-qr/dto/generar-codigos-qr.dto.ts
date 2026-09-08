import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerarCodigosQrDto {
  @IsString()
  eventoId: string;

  // El pool de manillas es a nivel EVENTO. La jornada la adopta cada manilla
  // cuando el supervisor la vincula a una Entrada (ver entradas.service.vincularQr).

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  cantidad: number;

  @IsOptional()
  @IsString()
  prefijo?: string;
}
