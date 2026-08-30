import { Allow, IsOptional, IsString } from 'class-validator';
import { Prisma } from '@prisma/client';

export class GuardarLandingConfigDto {
  @IsString()
  titulo: string;

  @IsString()
  informacion: string;

  @IsOptional()
  @IsString()
  imagen?: string;

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

  // [{ icono, titulo, descripcion }]
  @Allow()
  actividades: Prisma.InputJsonValue;

  // [{ hora, actividad }]
  @Allow()
  cronograma: Prisma.InputJsonValue;
}
