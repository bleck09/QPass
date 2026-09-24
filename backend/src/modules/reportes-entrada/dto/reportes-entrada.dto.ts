import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CampoReportado } from '@prisma/client';
import {
  MAX_NOTA,
  MAX_VALOR_CORREGIDO,
  mensajeMaxLength,
} from '../../../common/dto/validacion.constantes';

const CAMPOS: CampoReportado[] = ['nombre', 'correo', 'celular'];

export class CrearReporteEntradaDto {
  @IsString()
  compraId: string;

  @IsString()
  entradaId: string;

  @IsIn(CAMPOS)
  campo: CampoReportado;

  @IsString()
  @MaxLength(MAX_NOTA, { message: mensajeMaxLength(MAX_NOTA) })
  descripcion: string;
}

export class CorregirReporteEntradaDto {
  @IsString()
  @MinLength(1, { message: 'El valor corregido es requerido' })
  @MaxLength(MAX_VALOR_CORREGIDO, { message: mensajeMaxLength(MAX_VALOR_CORREGIDO) })
  valorCorregido: string;
}
