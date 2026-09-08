import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CrearDiaEventoDto {
  @IsString()
  eventoId: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsDateString()
  inicio: string;

  @IsDateString()
  fin: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  aforoMaximo?: number;
}

/** PATCH: todo opcional; `eventoId` no se cambia desde acá. */
export class ActualizarDiaEventoDto extends PartialType(CrearDiaEventoDto) {}
