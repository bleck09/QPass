import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { VariablesEntorno } from '../../../config/env.validation';
import { UsuarioJwt } from '../../../common/decorators/usuario-actual.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<VariablesEntorno, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  /** El objeto que devuelve acá queda en request.user (lo lee @UsuarioActual()). */
  async validate(payload: {
    id: number;
    rol: string;
    email: string;
  }): Promise<UsuarioJwt> {
    return { id: payload.id, rol: payload.rol, email: payload.email };
  }
}
