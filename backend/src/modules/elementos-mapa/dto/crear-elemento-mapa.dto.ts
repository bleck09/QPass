import { IsIn, IsString, MinLength } from 'class-validator';
import { TipoElementoMapa } from '@prisma/client';

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
  nombre: string;
}
