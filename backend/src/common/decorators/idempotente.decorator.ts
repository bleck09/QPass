import { SetMetadata } from '@nestjs/common';

/**
 * @Idempotente() activa IdempotenciaInterceptor en ese endpoint (C10).
 * Se pone en los endpoints que mueven dinero: recargar, consumir/registrar
 * venta y devolver. El cliente manda el header `Idempotency-Key`.
 */
export const IDEMPOTENTE_KEY = 'esIdempotente';
export const Idempotente = () => SetMetadata(IDEMPOTENTE_KEY, true);
