/* ============================================================================
 * src/common/interceptors/firmar-imagenes.interceptor.ts
 * Recorre CUALQUIER respuesta y le agrega firma + vencimiento a cada URL de
 * /uploads/... que encuentre (foto de perfil, comprobante, logo, portada...).
 * Así el estático de main.ts puede exigir esa firma sin que ni un solo
 * controller/servicio ni el frontend tengan que saber que existe. Ver
 * modules/uploads/firma-uploads.ts para el detalle de la firma.
 * ========================================================================= */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { firmarUrlUpload } from '../../modules/uploads/firma-uploads';

const RUTA_UPLOAD = /^\/uploads\//;

// Profundidad tope: nada de lo que devuelve esta API anida objetos más allá de
// esto — es solo un freno de seguridad ante un ciclo o payload raro.
const PROFUNDIDAD_MAXIMA = 12;

function firmarProfundo(valor: unknown, profundidad = 0): unknown {
  if (valor == null || profundidad > PROFUNDIDAD_MAXIMA) return valor;

  if (typeof valor === 'string') {
    return RUTA_UPLOAD.test(valor) ? firmarUrlUpload(valor) : valor;
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => firmarProfundo(item, profundidad + 1));
  }

  // Date, Decimal de Prisma, etc: no son un "plain object" para esto, se
  // devuelven tal cual (si se recorrieran, se romperían serializándose a {}).
  if (typeof valor === 'object' && valor.constructor === Object) {
    const resultado: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor)) {
      resultado[clave] = firmarProfundo(v, profundidad + 1);
    }
    return resultado;
  }

  return valor;
}

@Injectable()
export class FirmarImagenesInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((respuesta) => firmarProfundo(respuesta)));
  }
}
