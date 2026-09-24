import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MAX_ETIQUETA_CORTA,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

export class CrearPuestoAyudanteDto {
  @IsString()
  puestoId: string;

  @Type(() => Number)
  @IsInt()
  ayudanteId: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ETIQUETA_CORTA, { message: mensajeMaxLength(MAX_ETIQUETA_CORTA) })
  turno?: string;
}
