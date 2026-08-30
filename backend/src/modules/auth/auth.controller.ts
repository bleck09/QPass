/* ============================================================================
 * src/modules/auth/auth.controller.ts
 * Rutas públicas /auth/*. Sin lógica: recibe, valida (DTO) y delega.
 * ========================================================================= */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Publico } from '../../common/decorators/publico.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import {
  RestablecerPasswordDto,
  SolicitarRecuperacionDto,
  VerificarCodigoDto,
} from './dto/recuperar-password.dto';

@Publico()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
