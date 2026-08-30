import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PUBLICO_KEY } from '../decorators/publico.decorator';
import { UsuarioJwt } from '../decorators/usuario-actual.decorator';

/**
 * Corre después de JwtAuthGuard. Si el endpoint declara @Roles(...), exige que
 * el rol global del usuario esté entre ellos. Sin @Roles, cualquier usuario
 * autenticado pasa. Registrado como guard global en AppModule.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const esPublico = this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublico) return true;

    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!rolesRequeridos || rolesRequeridos.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const usuario: UsuarioJwt | undefined = request.user;
    if (!usuario || !rolesRequeridos.includes(usuario.rol as Rol)) {
      throw new ForbiddenException('No autorizado para este recurso');
    }
    return true;
  }
}
