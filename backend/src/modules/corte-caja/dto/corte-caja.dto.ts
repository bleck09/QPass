import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MAX_NOTA, mensajeMaxLength } from '../../../common/dto/validacion.constantes';

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
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  observacion?: string;
}
