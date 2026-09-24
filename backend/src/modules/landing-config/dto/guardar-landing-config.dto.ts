import { Allow, IsOptional, IsString, MaxLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import {
  MAX_TITULO,
  MAX_TEXTO_LANDING,
  MAX_URL,
  MAX_COLOR,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

export class GuardarLandingConfigDto {
  @IsString()
  @MaxLength(MAX_TITULO, { message: mensajeMaxLength(MAX_TITULO) })
  titulo: string;

  @IsString()
  @MaxLength(MAX_TEXTO_LANDING, { message: mensajeMaxLength(MAX_TEXTO_LANDING) })
  informacion: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  imagen?: string;

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

  // [{ icono, titulo, descripcion }]
  @Allow()
  actividades: Prisma.InputJsonValue;

  // [{ hora, actividad }]
  @Allow()
  cronograma: Prisma.InputJsonValue;

  // { x, y, zoom, oscurecer, desenfoque } — el servicio lo acota a rangos válidos.
  @IsOptional()
  @Allow()
  imagenAjuste?: Record<string, unknown> | null;
}
