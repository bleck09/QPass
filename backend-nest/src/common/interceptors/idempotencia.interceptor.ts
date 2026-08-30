/* ============================================================================
 * src/common/interceptors/idempotencia.interceptor.ts
 * Antes de ejecutar el handler, revisa si el header Idempotency-Key ya fue
 * procesado. Si sí, devuelve la respuesta guardada sin repetir la operación.
 * Se activa solo en endpoints marcados con @Idempotente(). Ver C10.
 * ========================================================================= */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Observable, from, of, switchMap } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { IDEMPOTENTE_KEY } from '../decorators/idempotente.decorator';

@Injectable()
export class IdempotenciaInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Idempotencia');

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const activo = this.reflector.getAllAndOverride<boolean>(IDEMPOTENTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!activo) return next.handle();

    const request = context.switchToHttp().getRequest();
    const clave: string | undefined =
      request.headers['idempotency-key'] || request.headers['Idempotency-Key'];
    if (!clave) return next.handle();

    return from(
      this.prisma.solicitudIdempotente.findUnique({ where: { clave } }),
    ).pipe(
      switchMap((previo) => {
        if (previo) {
          this.logger.log(`Reusando respuesta guardada para la clave ${clave}`);
          return of(previo.respuesta);
        }
        return next.handle().pipe(
          tap((respuesta) => {
            void this.guardar(clave, respuesta);
          }),
        );
      }),
    );
  }

  private async guardar(clave: string, respuesta: unknown): Promise<void> {
    try {
      await this.prisma.solicitudIdempotente.create({
        data: { clave, respuesta: (respuesta ?? null) as Prisma.InputJsonValue },
      });
    } catch (error) {
      // P2002: otra request con la misma clave ganó la carrera — está bien.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      this.logger.warn(`No se pudo guardar la respuesta idempotente: ${String(error)}`);
    }
  }
}
