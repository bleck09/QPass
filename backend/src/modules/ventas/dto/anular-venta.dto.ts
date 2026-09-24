import { IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_NOTA, mensajeMaxLength } from '../../../common/dto/validacion.constantes';

export class AnularVentaDto {
  @IsString()
  @MinLength(3, { message: 'Contá el motivo de la anulación' })
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  motivo: string;
}
