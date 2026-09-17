import { IsOptional, IsString } from 'class-validator';

export class VincularQrDto {
  @IsString()
  codigoQrId: string;

  // Por qué se cambia la manilla (perdida, dañada...). Solo aplica cuando la
  // entrada YA tenía una vinculada: queda como motivoAnulacion de la anterior.
  // Opcional porque en la primera entrega no hay nada que anular.
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class AnularQrDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class MovimientoDto {
  @IsOptional()
  @IsString()
  foto?: string;

  // Evento del control desde el que se escanea. Si viene y no coincide con el
  // evento de la entrada, se rechaza el movimiento (no se cruza gente entre eventos).
  @IsOptional()
  @IsString()
  eventoId?: string;

  // Manilla escaneada. Si es la copia de un duplicado, se rechaza (ver
  // CasosDuplicadoService.asegurarManillaUsable).
  @IsOptional()
  @IsString()
  codigoQr?: string;
}
