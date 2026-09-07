import { IsString, MinLength } from 'class-validator';

export class AnularVentaDto {
  @IsString()
  @MinLength(3, { message: 'Contá el motivo de la anulación' })
  motivo: string;
}
