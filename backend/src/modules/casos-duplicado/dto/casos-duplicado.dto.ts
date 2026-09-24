import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MAX_URL, mensajeMaxLength } from '../../../common/dto/validacion.constantes';

/**
 * El dueño real llegó y su manilla ya figuraba adentro. El Supervisor lo
 * verifica antes de darle una manilla nueva (ver CasoDuplicado en schema.prisma).
 */
export class VerificarDuplicadoDto {
  /** Foto nueva del dueño real, tomada en la puerta (URL de /uploads). */
  @IsString({ message: 'La foto del dueño es obligatoria' })
  @MaxLength(MAX_URL, { message: mensajeMaxLength(MAX_URL) })
  foto: string;

  /** Últimos dígitos del carnet que dice/muestra la persona. */
  @Matches(/^\d{3,4}$/, { message: 'Indicá los últimos 3 o 4 dígitos del carnet' })
  ultimosDigitosCi: string;

  @IsBoolean()
  mostroCarnet: boolean;

  /** Mostró su cuenta QPass abierta en el celular. */
  @IsBoolean()
  cuentaVerificada: boolean;

  /** Manilla nueva del pool. Obligatoria en eventos de manilla física. */
  @IsOptional()
  @IsString()
  codigoQrNuevoId?: string;

  /** Evento del control desde el que se verifica (igual que MovimientoDto). */
  @IsOptional()
  @IsString()
  eventoId?: string;
}

export class RecuperarManillaDto {
  /** Lo que decida el organizador. El sistema solo lo registra. */
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: mensajeMaxLength(1000) })
  sancion?: string;
}
