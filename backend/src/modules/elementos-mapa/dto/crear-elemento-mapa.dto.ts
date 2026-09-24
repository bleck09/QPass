import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { TipoElementoMapa } from '@prisma/client';
import { MAX_NOMBRE, mensajeMaxLength } from '../../../common/dto/validacion.constantes';

const TIPOS: TipoElementoMapa[] = [
  'entrada',
  'banos',
  'escenario',
  'recargador',
  'supervisor',
  'otro',
];

/**
 * Crea un cuadro del plano que NO es un negocio (ver ElementoMapa). Lo hace
 * Admin directo desde Mapa.jsx, a diferencia de Puesto que activa cada
 * Usuario Negocio. Nace centrado en el canvas (x/y/ancho/alto por default,
 * ver schema); se mueve/redimensiona después con `actualizar`.
 */
export class CrearElementoMapaDto {
  @IsString()
  eventoId: string;

  @IsIn(TIPOS)
  tipo: TipoElementoMapa;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NOMBRE, { message: mensajeMaxLength(MAX_NOMBRE) })
  nombre: string;
}
