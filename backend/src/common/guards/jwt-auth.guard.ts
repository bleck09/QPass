import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PUBLICO_KEY } from '../decorators/publico.decorator';

/**
 * Exige un JWT válido salvo en endpoints marcados con @Publico().
 * Registrado como guard global en AppModule.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const esPublico = this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublico) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('No autenticado');
    }
    return user;
  }
}
