import { PartialType } from '@nestjs/mapped-types';
import { Allow, IsDateString, IsOptional, IsString } from 'class-validator';
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
