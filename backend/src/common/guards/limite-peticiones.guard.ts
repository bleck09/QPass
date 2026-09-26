import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limiting global (registrado en AppModule, DESPUÉS de JwtAuthGuard para
 * que `req.user` ya exista).
 *
 * A quién se le cuenta cada request:
 *   - Logueado -> por usuario. Así un evento entero detrás del mismo WiFi o de
 *     la misma IP de datos móviles (CGNAT) no comparte un único cupo.
 *   - Anónimo con `email` en el body (login, registro, recuperar contraseña) ->
 *     por IP + email: frena la fuerza bruta contra una cuenta sin bloquear a
 *     otras personas que entran desde la misma IP.
 *   - Resto de anónimos -> por IP.
 *
 * Los límites de cada ruta viven en su controller con @Throttle; el default
 * está en AppModule.
 */
@Injectable()
export class LimitePeticionesGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req.user?.id) return `usuario:${req.user.id}`;
    const email = req.body?.email;
    if (typeof email === 'string' && email) {
      return `ip:${req.ip}:email:${email.trim().toLowerCase()}`;
    }
    return `ip:${req.ip}`;
  }
}
