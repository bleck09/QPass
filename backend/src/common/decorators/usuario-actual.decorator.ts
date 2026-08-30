import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Forma del payload del JWT, igual que lo firmaba el backend Express. */
export interface UsuarioJwt {
  id: number;
  rol: string;
  email: string;
}

/**
 * @UsuarioActual() extrae el usuario del JWT ya validado por JwtAuthGuard.
 * @UsuarioActual('id') devuelve solo ese campo.
 */
export const UsuarioActual = createParamDecorator(
  (campo: keyof UsuarioJwt | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const usuario: UsuarioJwt | undefined = request.user;
    return campo ? usuario?.[campo] : usuario;
  },
);
