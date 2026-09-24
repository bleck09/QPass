/* ============================================================================
 * src/common/dto/paises.constantes.ts
 * Lista de países para el selector de "país" del perfil (registro/perfil).
 * Bolivia primero (caso por defecto de la app); el resto en orden alfabético.
 * Backend y frontend deben validar contra la MISMA lista — si se agrega un
 * país acá, agregarlo también en frontend/src/constants/paises.js.
 * ========================================================================= */

export const PAIS_DEFAULT = 'Bolivia';

export const PAISES: string[] = [
  'Bolivia',
  'Argentina',
  'Brasil',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Cuba',
  'Ecuador',
  'El Salvador',
  'España',
  'Estados Unidos',
  'Francia',
  'Alemania',
  'Guatemala',
  'Honduras',
  'Italia',
  'México',
  'Nicaragua',
  'Panamá',
  'Paraguay',
  'Perú',
  'Portugal',
  'Puerto Rico',
  'Reino Unido',
  'República Dominicana',
  'Uruguay',
  'Venezuela',
  'Canadá',
  'China',
  'Corea del Sur',
  'Japón',
  'India',
  'Otro',
];
