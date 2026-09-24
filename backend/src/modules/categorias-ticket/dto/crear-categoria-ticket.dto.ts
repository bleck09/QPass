import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import {
  MAX_NOMBRE,
  MAX_BENEFICIO_ITEM,
  MAX_CANTIDAD_BENEFICIOS,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

export class CrearCategoriaTicketDto {
  @IsString()
  eventoId: string;

  // Jornada a la que pertenece esta categoría (ver DiaEvento).
  @IsString()
  diaEventoId: string;

  @IsString()
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre: string;

  // Lista de beneficios/features ("Baño compartido", "Acceso VIP"...), una
  // fila por línea — se muestran como bullets en la landing pública.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CANTIDAD_BENEFICIOS)
  @IsString({ each: true })
  @MaxLength(MAX_BENEFICIO_ITEM, {
    each: true,
    message: mensajeMaxLength(MAX_BENEFICIO_ITEM),
  })
  beneficios?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;
}
