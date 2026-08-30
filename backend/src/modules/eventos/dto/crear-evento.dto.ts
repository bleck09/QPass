import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Espejo de lo que manda el frontend al crear un evento directo (sin pasar por
 * SolicitudEvento). Mismos nombres de campo que el modelo Prisma Evento.
 */
export class CrearEventoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(1)
  lugar: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  imagen?: string;

  @IsOptional()
  @IsString()
  qrPrefijo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  qrAncho?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  qrAlto?: number;
}
