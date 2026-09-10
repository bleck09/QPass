import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { MotivoDevolucion } from '@prisma/client';

export class RecargaDto {
  @IsString()
  entradaId: string;

  // Evento del puesto donde está parado el recargador. Si no coincide con el
  // evento de la manilla escaneada, se rechaza (no se recarga de otro evento).
  @IsOptional()
  @IsString()
  eventoId?: string;

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

  // Foto de la cara de quien cobra. El frontend la exige en el retiro de un
  // negocio (por si le roban el QR).
  @IsOptional()
  @IsString()
  fotoRostroUrl?: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'Monto inválido' })
  monto: number;

  @IsOptional()
  @IsString()
  entradaId?: string;

  // §5.11 — motivo tipado del retiro. `otro` => detalle libre en `nota`.
  @IsOptional()
  @IsEnum(MotivoDevolucion)
  motivoDevolucion?: MotivoDevolucion;

  @IsOptional()
  @IsString()
  nota?: string;
}
