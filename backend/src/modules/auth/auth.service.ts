/* ============================================================================
 * src/modules/auth/auth.service.ts
 *
 * Responsabilidad: registro, login y recuperación de contraseña. Habla con
 * Prisma y firma JWTs. NO conoce HTTP. Espeja el frontend (api/index.js -> auth).
 * ========================================================================= */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { VariablesEntorno } from '../../config/env.validation';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { aFecha } from '../../common/utils/fechas.utils';
import { RegistroDto } from './dto/registro.dto';
import {
  RestablecerPasswordDto,
  SolicitarRecuperacionDto,
  VerificarCodigoDto,
} from './dto/recuperar-password.dto';

const MINUTOS_VALIDEZ_CODIGO = 15;
const generarCodigo6Digitos = () =>
  String(randomInt(0, 1_000_000)).padStart(6, '0');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<VariablesEntorno, true>,
  ) {}

  /**
   * Registro de una cuenta. `creador` es el usuario del JWT si vino uno (Admin o
   * Usuario Negocio creando cuentas), para auditar quién la creó.
   */
  async registro(dto: RegistroDto, creador: UsuarioJwt | null) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existente) {
      throw new ConflictException('El email ya está registrado');
    }

    const rolNuevo: Rol = dto.rol ?? 'UsuarioNormal';
    // Un Ayudante queda atado al ÚNICO Usuario Negocio que lo creó.
    const negocioAsignadoId =
      rolNuevo === 'Ayudante' && creador?.rol === 'UsuarioNegocio'
        ? creador.id
        : undefined;

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        apellidoPaterno: dto.apellidoPaterno,
        apellidoMaterno: dto.apellidoMaterno,
        email: dto.email,
        passwordHash,
        ci: dto.ci,
        celular: dto.celular,
        fechaNacimiento: aFecha(dto.fechaNacimiento),
        rol: rolNuevo,
        creadoPorId: creador?.id,
        negocioAsignadoId,
      },
    });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
  }

  async login(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const valido = await bcrypt.compare(password, usuario.passwordHash);
    if (!valido) throw new UnauthorizedException('Credenciales inválidas');

    // Primer login: desde aquí ReporteEntrada ya no puede corregir el correo.
    if (!usuario.primerLoginEn) {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { primerLoginEn: new Date() },
      });
    }

    return {
      token: this.firmarToken(usuario),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        foto: usuario.foto,
        // El frontend manda a /completar-perfil si esto viene true (cuenta
        // generada al aprobar una compra, ver ComprasService.aprobar).
        debeCompletarPerfil: usuario.debeCompletarPerfil,
      },
    };
  }

  // --- RECUPERAR CONTRASEÑA (código de 6 dígitos) ---
  // No hay servicio de correo: el código se devuelve en la respuesta para probarlo.

  async recuperarSolicitar(dto: SolicitarRecuperacionDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (!usuario) {
      throw new NotFoundException('No existe ninguna cuenta con ese correo');
    }

    const codigo = generarCodigo6Digitos();
    await this.prisma.$transaction([
      // Solo el último código emitido es válido.
      this.prisma.codigoRecuperacion.updateMany({
        where: { usuarioId: usuario.id, usado: false },
        data: { usado: true },
      }),
      this.prisma.codigoRecuperacion.create({
        data: {
          usuarioId: usuario.id,
          codigo,
          expiraEn: new Date(Date.now() + MINUTOS_VALIDEZ_CODIGO * 60 * 1000),
        },
      }),
    ]);

    return { codigoDemo: codigo }; // no hay envío de correo real
  }

  async recuperarVerificar(dto: VerificarCodigoDto) {
    const resultado = await this.buscarCodigoValido(dto.email, dto.codigo);
    if (!resultado) {
      throw new BadRequestException('Código incorrecto o vencido');
    }
    return { valido: true };
  }

  async recuperarRestablecer(dto: RestablecerPasswordDto) {
    const resultado = await this.buscarCodigoValido(dto.email, dto.codigo);
    if (!resultado) {
      throw new BadRequestException('Código incorrecto o vencido');
    }
    const { usuario, registro } = resultado;

    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash },
      }),
      this.prisma.codigoRecuperacion.update({
        where: { id: registro.id },
        data: { usado: true },
      }),
      this.prisma.cambioPassword.create({
        data: { usuarioId: usuario.id, origen: 'recuperacion' },
      }),
    ]);
  }

  /** Decodifica un Bearer token si vino y es válido; si no, null. Usado por registro. */
  decodificarOpcional(authorization?: string): UsuarioJwt | null {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;
    if (!token) return null;
    try {
      const payload = this.jwt.verify<{
        id: number;
        rol: string;
        email: string;
      }>(token);
      return { id: payload.id, rol: payload.rol, email: payload.email };
    } catch {
      return null;
    }
  }

  private firmarToken(usuario: {
    id: number;
    rol: Rol;
    email: string;
  }): string {
    return this.jwt.sign(
      { id: usuario.id, rol: usuario.rol, email: usuario.email },
      { expiresIn: this.config.get('JWT_EXPIRA_EN', { infer: true }) },
    );
  }

  private async buscarCodigoValido(email: string, codigo: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return null;
    const registro = await this.prisma.codigoRecuperacion.findFirst({
      where: {
        usuarioId: usuario.id,
        codigo,
        usado: false,
        expiraEn: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return registro ? { usuario, registro } : null;
  }
}
