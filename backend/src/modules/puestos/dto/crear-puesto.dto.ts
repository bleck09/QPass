import { IsString } from 'class-validator';

/** Activa un PuestoBase del catálogo del negocio dentro de un evento. */
export class ActivarPuestoDto {
  @IsString()
  eventoId: string;

  @IsString()
  puestoBaseId: string;
}
