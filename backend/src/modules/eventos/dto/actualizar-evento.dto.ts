import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { EstadoEvento } from '@prisma/client';
import { CrearEventoDto } from './crear-evento.dto';

const ESTADOS: EstadoEvento[] = ['activo', 'finalizado'];

/** PATCH: todos los campos opcionales, más `estado`. */
export class ActualizarEventoDto extends PartialType(CrearEventoDto) {
  @IsOptional()
  @IsIn(ESTADOS)
  estado?: EstadoEvento;
}
