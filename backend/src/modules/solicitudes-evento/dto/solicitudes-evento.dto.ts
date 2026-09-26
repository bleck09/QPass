import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  Allow,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import {
  MAX_TITULO,
  MAX_DESCRIPCION_LARGA,
  MAX_COLOR,
  MAX_URL,
  MAX_NOTA,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

export class CrearSolicitudEventoDto {
  // { x, y, zoom, oscurecer, desenfoque } de la portada — el servicio lo acota a rangos válidos.
  @IsOptional()
  @Allow()
  imagenAjuste?: Record<string, unknown> | null;

  @IsString()
  @MaxLength(MAX_TITULO, { message: mensajeMaxLength(MAX_TITULO) })
  nombreEvento: string;

  @IsString()
  @MaxLength(MAX_TITULO, { message: mensajeMaxLength(MAX_TITULO) })
  lugar: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsString()
  @MaxLength(MAX_DESCRIPCION_LARGA, { message: mensajeMaxLength(MAX_DESCRIPCION_LARGA) })
  descripcion: string;

  // §5.11 — cuánta gente estima el cliente; al aprobar pasa al aforo de la jornada 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  aforoEstimado?: number;

  @IsString()
  @MaxLength(MAX_COLOR, { message: mensajeMaxLength(MAX_COLOR) })
  colorPrimario: string;

  @IsString()
  @MaxLength(MAX_COLOR, { message: mensajeMaxLength(MAX_COLOR) })
  colorBoton: string;

  @IsString()
  @MaxLength(MAX_COLOR, { message: mensajeMaxLength(MAX_COLOR) })
  colorFondo: string;

  @IsString()
  @MaxLength(MAX_COLOR, { message: mensajeMaxLength(MAX_COLOR) })
  colorTextoTitulo: string;

  @IsString()
  @MaxLength(MAX_COLOR, { message: mensajeMaxLength(MAX_COLOR) })
  colorTextoP: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  imagenPortada?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  mapaLugar?: string;

  // [{ titulo, descripcion }]
  @Allow()
  actividades: Prisma.InputJsonValue;

  // [{ hora, actividad }]
  @Allow()
  cronograma: Prisma.InputJsonValue;
}

export class ActualizarSolicitudEventoDto extends PartialType(CrearSolicitudEventoDto) {}

export class RechazarDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  motivoRechazo?: string;
}

// Admin devuelve la solicitud al cliente: el comentario es obligatorio (sin él
// el cliente no sabe qué corregir).
export class PedirCambiosDto {
  @IsString()
  @MinLength(3, {
    message: 'Contale al cliente qué tiene que cambiar (al menos 3 letras).',
  })
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  comentario: string;
}
