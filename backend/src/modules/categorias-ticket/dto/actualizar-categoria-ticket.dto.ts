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

/**
 * PATCH: todo opcional. `eventoId`/`diaEventoId` no se editan acá — mover una
 * categoría de jornada con entradas ya vendidas es un caso aparte que no se
 * cubre (para eso, borrarla y crear una nueva en la jornada correcta).
 */
export class ActualizarCategoriaTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CANTIDAD_BENEFICIOS)
  @IsString({ each: true })
  @MaxLength(MAX_BENEFICIO_ITEM, {
    each: true,
    message: mensajeMaxLength(MAX_BENEFICIO_ITEM),
  })
  beneficios?: string[];

  // El service rechaza bajar esto por debajo de lo ya vendido/reservado.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio?: number;
}
