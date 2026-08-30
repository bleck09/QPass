import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EntradaCompraDto {
  @IsString()
  categoriaTicketId: string;

  @IsOptional()
  @IsBoolean()
  isTitular?: boolean;

  @IsString()
  nombre: string;

  @IsEmail()
  correo: string;

  @IsOptional()
  @IsString()
  celular?: string;
}

export class CrearCompraDto {
  @IsString()
  eventoId: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Agrega al menos una entrada' })
  @ValidateNested({ each: true })
  @Type(() => EntradaCompraDto)
  entradas: EntradaCompraDto[];

  @IsOptional()
  @IsString()
  comprobanteUrl?: string;

  @IsOptional()
  @IsString()
  comprobanteNombreArchivo?: string;
}

export class EntradaCorreccionDto {
  @IsString()
  id: string;

  @IsString()
  nombre: string;

  @IsEmail()
  correo: string;

  @IsOptional()
  @IsString()
  celular?: string;
}

export class CorregirEntradasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntradaCorreccionDto)
  entradas: EntradaCorreccionDto[];
}

export class RechazarCompraDto {
  @IsOptional()
  @IsString()
  motivoRechazo?: string;
}
