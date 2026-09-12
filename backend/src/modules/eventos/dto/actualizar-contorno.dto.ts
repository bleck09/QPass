import { IsArray } from 'class-validator';

/**
 * Contorno del recinto (Mapa.jsx, modo Contorno): lista de vértices [lat, lng]
 * del polígono, en el orden en que se dibujan. La forma exacta de cada punto
 * (par de números finitos) y el mínimo de 3 vértices se valida en el service
 * — class-validator no valida bien tuplas anidadas, así que acá solo se pide
 * que sea un array; `[]` es válido y borra el contorno.
 */
export class ActualizarContornoDto {
  @IsArray()
  contorno: number[][];
}
