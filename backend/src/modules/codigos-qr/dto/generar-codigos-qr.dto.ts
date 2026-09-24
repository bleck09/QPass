import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  MAX_PREFIJO_QR,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

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
  @MaxLength(MAX_PREFIJO_QR, { message: mensajeMaxLength(MAX_PREFIJO_QR) })
  prefijo?: string;
}
