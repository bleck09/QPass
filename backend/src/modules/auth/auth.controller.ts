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
  emailDisponible(@Query('email') email?: string) {
    return this.authService.emailDisponible(email ?? '');
  }

  /** Paso 2 -> 3 de Registrar.jsx: manda el código de verificación al correo. */
  @Post('registro/enviar-codigo')
  enviarCodigoRegistro(@Body() dto: EnviarCodigoRegistroDto) {
    return this.authService.enviarCodigoRegistro(dto.email);
  }

  @Post('registro')
  registro(@Body() dto: RegistroDto, @Req() req: Request) {
    const creador = this.authService.decodificarOpcional(req.headers.authorization);
    return this.authService.registro(dto, creador);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('recuperar/solicitar')
  recuperarSolicitar(@Body() dto: SolicitarRecuperacionDto) {
    return this.authService.recuperarSolicitar(dto);
  }

  @Post('recuperar/verificar')
  @HttpCode(HttpStatus.OK)
  recuperarVerificar(@Body() dto: VerificarCodigoDto) {
    return this.authService.recuperarVerificar(dto);
  }

  @Post('recuperar/restablecer')
  @HttpCode(HttpStatus.NO_CONTENT)
  recuperarRestablecer(@Body() dto: RestablecerPasswordDto) {
    return this.authService.recuperarRestablecer(dto);
  }
}
