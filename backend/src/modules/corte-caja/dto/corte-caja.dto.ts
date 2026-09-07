import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AbrirCajaDto {
  @IsString()
  eventoId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoInicial?: number;
}

export class CerrarCajaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoDeclarado: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
