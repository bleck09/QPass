import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Un puesto del catálogo del negocio (se define una vez, se reutiliza entre eventos). */
export class CrearPuestoBaseDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  categoria?: string;
}

export class ActualizarPuestoBaseDto extends PartialType(CrearPuestoBaseDto) {}

/** Un producto del catálogo base. `precio` es el valor por defecto; cada evento puede sobrescribirlo. */
export class CrearProductoBaseDto {
  @IsString()
  nombre: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsString()
  imagen?: string;

  @IsOptional()
  @IsString()
  categoria?: string;
}

export class ActualizarProductoBaseDto extends PartialType(CrearProductoBaseDto) {}
