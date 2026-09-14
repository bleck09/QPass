import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearCategoriaTicketDto {
  @IsString()
  eventoId: string;

  // Jornada a la que pertenece esta categoría (ver DiaEvento).
  @IsString()
  diaEventoId: string;

  @IsString()
  nombre: string;

  // Lista de beneficios/features ("Baño compartido", "Acceso VIP"...), una
  // fila por línea — se muestran como bullets en la landing pública.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
