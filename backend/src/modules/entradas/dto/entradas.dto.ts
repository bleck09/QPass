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
}
