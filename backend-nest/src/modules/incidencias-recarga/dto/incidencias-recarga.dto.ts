import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearIncidenciaRecargaDto {
  @IsString()
  entradaId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoEntregado: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoSolicitado?: number;

  @IsString()
  nota: string;
}

export class ResolverIncidenciaRecargaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Monto inválido' })
  ajusteAplicado: number;
}
