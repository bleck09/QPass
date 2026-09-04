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
    if (!RUTA_UPLOAD.test(valor)) return valor;
    // Por si esta MISMA URL ya venía firmada de antes (ej. un formulario que no
    // tocó la imagen reenvió al backend la URL firmada que había recibido, y
    // quedó guardada así en la BD): recortamos todo lo que haya después del
    // primer "?" para volver siempre al path real del archivo antes de firmar
    // de nuevo. Sin esto, cada lectura le pegaba una firma nueva ARRIBA de la
    // vieja ("...jpg?exp=A&firma=A?exp=B&firma=B..."), una URL que ya no sirve.
    const rutaLimpia = valor.split('?')[0];
    return firmarUrlUpload(rutaLimpia);
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
