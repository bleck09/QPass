/* ============================================================================
 * src/modules/auth/auth.controller.ts
 * Rutas públicas /auth/*. Sin lógica: recibe, valida (DTO) y delega.
 * ========================================================================= */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Publico } from '../../common/decorators/publico.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { EnviarCodigoRegistroDto, RegistroDto } from './dto/registro.dto';
import {
  RestablecerPasswordDto,
  SolicitarRecuperacionDto,
  VerificarCodigoDto,
} from './dto/recuperar-password.dto';

// Límites por minuto más estrictos que el default: frenan fuerza bruta de
// contraseñas y el gasto de SMTP por pedir códigos en loop. Se cuentan por
// IP + email (ver LimitePeticionesGuard).
@Publico()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Chequeo temprano antes de completar todo el flujo de registro (que
   * incluye verificar código de correo) — evita que el usuario se entere de
   * que el correo ya tiene cuenta solo al final de los 3 pasos.
   */
  @Get('email-disponible')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  emailDisponible(@Query('email') email?: string) {
    return this.authService.emailDisponible(email ?? '');
  }

  /** Paso 2 -> 3 de Registrar.jsx: manda el código de verificación al correo. */
  @Post('registro/enviar-codigo')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  enviarCodigoRegistro(@Body() dto: EnviarCodigoRegistroDto) {
    return this.authService.enviarCodigoRegistro(dto.email);
  }

  @Post('registro')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  registro(@Body() dto: RegistroDto, @Req() req: Request) {
    const creador = this.authService.decodificarOpcional(req.headers.authorization);
    return this.authService.registro(dto, creador);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('recuperar/solicitar')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  recuperarSolicitar(@Body() dto: SolicitarRecuperacionDto) {
    return this.authService.recuperarSolicitar(dto);
  }

  @Post('recuperar/verificar')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  recuperarVerificar(@Body() dto: VerificarCodigoDto) {
    return this.authService.recuperarVerificar(dto);
  }

  @Post('recuperar/restablecer')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  recuperarRestablecer(@Body() dto: RestablecerPasswordDto) {
    return this.authService.recuperarRestablecer(dto);
  }
}
