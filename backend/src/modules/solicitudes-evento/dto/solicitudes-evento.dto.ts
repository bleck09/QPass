import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  Allow,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Prisma } from '@prisma/client';

export class CrearSolicitudEventoDto {
  @IsString()
  nombreEvento: string;

  @IsString()
  lugar: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsString()
  descripcion: string;

  // §5.11 — cuánta gente estima el cliente; al aprobar pasa al aforo de la jornada 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  aforoEstimado?: number;

  @IsString()
  colorPrimario: string;

  @IsString()
  colorBoton: string;

  @IsString()
  colorFondo: string;

  @IsString()
  colorTextoTitulo: string;

  @IsString()
  colorTextoP: string;

  @IsOptional()
  @IsString()
  imagenPortada?: string;

  @IsOptional()
  @IsString()
  mapaLugar?: string;

  // [{ titulo, descripcion }]
  @Allow()
  actividades: Prisma.InputJsonValue;

  // [{ hora, actividad }]
  @Allow()
  cronograma: Prisma.InputJsonValue;
}

export class ActualizarSolicitudEventoDto extends PartialType(
  CrearSolicitudEventoDto,
) {}

export class RechazarDto {
  @IsOptional()
  @IsString()
  motivoRechazo?: string;
}
