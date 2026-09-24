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
import { CodigosQrService } from '../codigos-qr/codigos-qr.service';
import { MailService } from '../../mail/mail.service';

const MINUTOS_VALIDEZ_CODIGO = 15;
const generarCodigo6Digitos = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<VariablesEntorno, true>,
    private readonly codigosQr: CodigosQrService,
    private readonly mail: MailService,
  ) {}

  /** Chequeo temprano para el paso 2 de Registrar.jsx — ver auth.controller.ts. */
  async emailDisponible(email: string) {
    const correo = email.trim().toLowerCase();
    if (!correo) return { disponible: false };
    const existente = await this.prisma.usuario.findUnique({
      where: { email: correo },
      select: { id: true },
    });
    return { disponible: !existente };
  }

  /**
   * Paso 2 -> 3 de Registrar.jsx: manda el código de verificación al correo
   * ANTES de crear la cuenta (todavía no existe el Usuario en este punto, por
   * eso el código se guarda por email y no por usuarioId — ver
   * CodigoVerificacionEmail). Solo aplica al autorregistro (sin `creador`);
   * cuando un Admin/UsuarioNegocio crea una cuenta desde su panel, no hace
   * falta verificar nada.
   */
  async enviarCodigoRegistro(email: string) {
    const correo = email.trim().toLowerCase();
    const existente = await this.prisma.usuario.findUnique({
      where: { email: correo },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException('El email ya está registrado');
    }

    const codigo = generarCodigo6Digitos();
    await this.prisma.$transaction([
      // Solo el último código emitido para ese correo es válido.
      this.prisma.codigoVerificacionEmail.updateMany({
        where: { email: correo, usado: false },
        data: { usado: true },
      }),
      this.prisma.codigoVerificacionEmail.create({
        data: {
          email: correo,
          codigo,
          expiraEn: new Date(Date.now() + MINUTOS_VALIDEZ_CODIGO * 60 * 1000),
        },
      }),
    ]);

    const enviado = await this.mail.enviar({
      para: correo,
      asunto: 'Código de verificación — QPass',
      cuerpo:
        `Tu código para verificar tu correo es: <strong>${codigo}</strong>. ` +
        `Vence en ${MINUTOS_VALIDEZ_CODIGO} minutos. Si no fuiste vos, ignora este correo.`,
    });

    return enviado ? {} : { codigoDemo: codigo };
  }

  /**
   * Registro de una cuenta. `creador` es el usuario del JWT si vino uno (Admin
   * o Usuario Negocio creando cuentas), para auditar quién la creó — y para
   * saber si hay que exigir el código de verificación (ver más abajo).
   */
  async registro(dto: RegistroDto, creador: UsuarioJwt | null) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existente) {
      throw new ConflictException('El email ya está registrado');
    }

    // El autorregistro (sin `creador` — nadie hizo login antes de llamar a
    // este endpoint) exige haber pasado por enviarCodigoRegistro() antes; una
    // cuenta creada por un Admin/UsuarioNegocio desde su panel (con `creador`)
    // no pasa por esta verificación.
    if (!creador) {
      const codigoValido = await this.prisma.codigoVerificacionEmail.findFirst({
        where: {
          email: dto.email.trim().toLowerCase(),
          codigo: dto.codigoVerificacion,
          usado: false,
          expiraEn: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!codigoValido) {
        throw new BadRequestException('Código de verificación incorrecto o vencido');
      }
      await this.prisma.codigoVerificacionEmail.update({
        where: { id: codigoValido.id },
        data: { usado: true },
      });
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
        tipoDocumento: dto.ci ? dto.tipoDocumento : undefined,
        ci: dto.ci,
        celular: dto.celular,
        fechaNacimiento: aFecha(dto.fechaNacimiento),
        sexo: dto.sexo,
        pais: dto.pais,
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

    // Entradas de INVITADO en eventos de manilla digital: se les asigna el
    // código QR recién EN CADA LOGIN (no solo el primero — una cuenta ya
    // existente puede sumar una entrada nueva pendiente más adelante), no al
    // aprobarse la compra (ver ComprasService.aprobar: al titular sí se le
    // asigna de una, porque es su propia cuenta). Así, si quien compró
    // escribió mal el correo del invitado, esa cuenta nunca hace login y
    // nunca "gasta" un código — los reportes de manillas asignadas quedan limpios.
    await this.asignarQrDigitalPendiente(usuario.id);

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

  /**
   * Le asigna su código QR a cada entrada de INVITADO (compra ya aprobada,
   * evento de manilla digital) que todavía no tenga uno activo. Se llama en
   * CADA login — ver comentario en login(). Sin nada pendiente, es una sola
   * consulta vacía y no hace nada más.
   */
  private async asignarQrDigitalPendiente(usuarioId: number) {
    const pendientes = await this.prisma.entrada.findMany({
      where: {
        usuarioId,
        isTitular: false,
        compra: { estado: 'confirmado' },
        evento: { tipoManilla: 'digital' },
        codigosQr: { none: { anulado: false } },
      },
      select: { id: true, eventoId: true, diaEventoId: true },
    });
    if (pendientes.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const entrada of pendientes) {
        await this.codigosQr.crearYVincularAutomatico(tx, {
          eventoId: entrada.eventoId,
          entradaId: entrada.id,
          diaEventoId: entrada.diaEventoId,
          actorId: usuarioId,
        });
      }
    });
  }

  // --- RECUPERAR CONTRASEÑA (código de 6 dígitos) ---
  // Se manda por correo real (MailService). Si el envío falla (o no hay SMTP
  // configurado, ej. desarrollo local sin credenciales), se devuelve el
  // código en la respuesta como respaldo para poder seguir probando.

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

    const enviado = await this.mail.enviar({
      para: usuario.email,
      asunto: 'Código para recuperar tu contraseña — QPass',
      cuerpo:
        `Tu código para recuperar la contraseña es: <strong>${codigo}</strong>. ` +
        `Vence en ${MINUTOS_VALIDEZ_CODIGO} minutos. Si no lo solicitaste, ignora este correo.`,
    });

    // Solo se expone el código en la respuesta si el correo NO salió de
    // verdad (sin SMTP configurado, o falló) — si ya se mandó, no hace
    // falta mostrarlo en pantalla.
    return enviado ? {} : { codigoDemo: codigo };
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
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
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

  private firmarToken(usuario: { id: number; rol: Rol; email: string }): string {
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
