import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearIncidenciaRecargaDto {
  @IsString()
  entradaId: string;

  /** Lo que el sistema le acreditó al participante (la recarga que se hizo). */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoEntregado: number;

  /** Lo que el participante realmente pagó / pidió. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoSolicitado?: number;

  @IsString()
  nota: string;
}

export class ResolverIncidenciaRecargaDto {
  /**
   * Ajuste al saldo del titular:
   *   > 0  acredita (se le debía plata)
   *   < 0  descuenta (se le cargó de más)
   *   = 0  sin movimiento (el reporte no correspondía)
   */
  @Type(() => Number)
  @IsNumber({}, { message: 'Monto inválido' })
  ajusteAplicado: number;
}
