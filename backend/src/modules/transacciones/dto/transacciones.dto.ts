import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MotivoDevolucion } from '@prisma/client';
import {
  MAX_URL,
  MAX_NOTA,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

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

  // Manilla escaneada. Si es la copia de un duplicado, se rechaza (ver
  // CasosDuplicadoService.asegurarManillaUsable).
  @IsOptional()
  @IsString()
  codigoQr?: string;
}

export class DevolucionDto {
  @Type(() => Number)
  @IsInt({ message: 'usuarioId es requerido' })
  usuarioId: number;

  @IsString({ message: 'eventoId es requerido' })
  eventoId: string;

  @IsString({ message: 'La foto del carnet de quien retira es obligatoria' })
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  fotoCarnetUrl: string;

  // Foto de la cara de quien cobra. El frontend la exige en el retiro de un
  // negocio (por si le roban el QR).
  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  fotoRostroUrl?: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'Monto inválido' })
  monto: number;

  @IsOptional()
  @IsString()
  entradaId?: string;

  // Manilla escaneada. Si es la copia de un duplicado, se rechaza (ver
  // CasosDuplicadoService.asegurarManillaUsable).
  @IsOptional()
  @IsString()
  codigoQr?: string;

  // §5.11 — motivo tipado del retiro. `otro` => detalle libre en `nota`.
  @IsOptional()
  @IsEnum(MotivoDevolucion)
  motivoDevolucion?: MotivoDevolucion;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  nota?: string;
}

/**
 * Crédito manual de Admin (TipoTransaccion.ajuste_manual). Ej.: reponer lo que
 * consumió el falso de un CasoDuplicado. Nunca toca filas viejas del ledger.
 */
export class AjusteManualDto {
  @IsString()
  entradaId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'Monto inválido' })
  monto: number;

  @IsString()
  @MinLength(5, { message: 'Explicá el motivo del ajuste' })
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  nota: string;

  @IsOptional()
  @IsString()
  casoDuplicadoId?: string;
}
