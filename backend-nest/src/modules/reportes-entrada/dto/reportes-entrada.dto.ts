import { IsIn, IsString, MinLength } from 'class-validator';
import { CampoReportado } from '@prisma/client';

const CAMPOS: CampoReportado[] = ['nombre', 'correo', 'celular'];

export class CrearReporteEntradaDto {
  @IsString()
  compraId: string;

  @IsString()
  entradaId: string;

  @IsIn(CAMPOS)
  campo: CampoReportado;

  @IsString()
  descripcion: string;
}

export class CorregirReporteEntradaDto {
  @IsString()
  @MinLength(1, { message: 'El valor corregido es requerido' })
  valorCorregido: string;
}
