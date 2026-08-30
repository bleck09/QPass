import { SetMetadata } from '@nestjs/common';

/**
 * Marca un endpoint como público: JwtAuthGuard lo deja pasar sin token.
 * Se usa en los GET abiertos (eventos, categorías, puestos, productos,
 * landing-config) y en todo /auth.
 */
export const PUBLICO_KEY = 'esPublico';
export const Publico = () => SetMetadata(PUBLICO_KEY, true);
