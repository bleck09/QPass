import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { TipoManilla } from '@prisma/client';

const TIPOS_MANILLA: TipoManilla[] = ['fisica', 'digital'];

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

  // Obligatorio: la landing pública del evento la necesita para mostrar
  // ubicación (ver App.jsx) y Mapa.jsx la usa como centro del mapa real donde
  // se dibuja el contorno del recinto. Formato "lat, lng", el que produce
  // MapaSelector.
  @IsString()
  @Matches(/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/, {
    message: 'coordenadas debe tener el formato "lat, lng"',
  })
  coordenadas: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  imagen?: string;

  // Física (Supervisor entrega y vincula la manilla) o digital (QR automático
  // al aprobar la compra). Default 'fisica' si no viene (ver EventosService).
  @IsOptional()
  @IsIn(TIPOS_MANILLA)
  tipoManilla?: TipoManilla;

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
