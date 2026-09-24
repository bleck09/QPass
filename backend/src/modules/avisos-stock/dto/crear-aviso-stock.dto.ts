import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_NOTA, mensajeMaxLength } from '../../../common/dto/validacion.constantes';

export class CrearAvisoStockDto {
  @IsString()
  puestoId: string;

  @IsString()
  productoBaseId: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  nota?: string;
}
