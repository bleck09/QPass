import { IsOptional, IsString } from 'class-validator';

export class VincularQrDto {
  @IsString()
  codigoQrId: string;
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
}
