import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecargaDto {
  @IsString()
  entradaId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'Monto inválido' })
  monto: number;
}

export class DevolucionDto {
  @Type(() => Number)
  @IsInt({ message: 'usuarioId es requerido' })
  usuarioId: number;

  @IsString({ message: 'eventoId es requerido' })
  eventoId: string;

  @IsString({ message: 'La foto del carnet de quien retira es obligatoria' })
  fotoCarnetUrl: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'Monto inválido' })
  monto: number;

  @IsOptional()
  @IsString()
  entradaId?: string;
}
