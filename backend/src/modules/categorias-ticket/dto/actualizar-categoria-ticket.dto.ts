import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * PATCH: todo opcional. `eventoId`/`diaEventoId` no se editan acá — mover una
 * categoría de jornada con entradas ya vendidas es un caso aparte que no se
 * cubre (para eso, borrarla y crear una nueva en la jornada correcta).
 */
export class ActualizarCategoriaTicketDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
