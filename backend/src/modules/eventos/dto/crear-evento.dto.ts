import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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

  @IsOptional()
  @IsString()
  coordenadas?: string;

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

  // Cliente organizador de un evento creado directo por Admin (opcional).
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clienteId?: number;

  // Días tras el cierre en que se puede retirar el saldo cashless (default 30).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  diasParaRetiro?: number;
}
