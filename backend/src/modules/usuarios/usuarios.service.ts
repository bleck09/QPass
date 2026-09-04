/* ============================================================================
 * src/modules/usuarios/usuarios.service.ts
 *
 * Reglas de negocio de Usuario (perfil, cambio de contraseña, auditoría).
 * NO toca Usuario.saldo — de eso se encarga TransaccionesService (C7).
 * ========================================================================= */

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { aFecha } from '../../common/utils/fechas.utils';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';

const SELECT_PUBLICO = {
  id: true,
  nombre: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
  email: true,
  rol: true,
  ci: true,
  celular: true,
  foto: true,
  ciudad: true,
  biografia: true,
  fechaNacimiento: true,
  createdAt: true,
  saldo: true,
  negocioAsignadoId: true,
  debeCompletarPerfil: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(rol?: Rol) {
    return this.prisma.usuario.findMany({
      where: rol ? { rol } : undefined,
      select: SELECT_PUBLICO,
    });
  }

  async obtenerPorId(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: SELECT_PUBLICO,
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto, actor: UsuarioJwt) {
    this.exigirPropioOAdmin(id, actor);

    // El CI solo se puede CARGAR (una vez), nunca pisar uno que ya existe —
    // evita que un update sin querer borre/cambie el CI de alguien.
    const actual = await this.prisma.usuario.findUnique({
      where: { id },
      select: { ci: true },
    });
    const ci = !actual?.ci && dto.ci ? dto.ci : undefined;

    await this.prisma.usuario.update({
      where: { id },
      data: {
        ci,
        celular: dto.celular,
        ciudad: dto.ciudad,
        biografia: dto.biografia,
        foto: dto.foto,
        fechaNacimiento: aFecha(dto.fechaNacimiento),
      },
    });
    await this.reevaluarCompletarPerfil(id);
    // Recién acá se lee el estado final: reevaluarCompletarPerfil puede haber
    // apagado debeCompletarPerfil después del update de arriba.
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: SELECT_PUBLICO,
    });
  }

  async cambiarPassword(id: number, dto: CambiarPasswordDto, actor: UsuarioJwt) {
    if (actor.id !== id) throw new ForbiddenException('No autorizado');

    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const valido = await bcrypt.compare(dto.passwordActual, usuario.passwordHash);
    if (!valido) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id }, data: { passwordHash } }),
      this.prisma.cambioPassword.create({ data: { usuarioId: id, origen: 'self' } }),
    ]);
    await this.reevaluarCompletarPerfil(id);
  }

  /**
   * Apaga debeCompletarPerfil apenas se cumplen las DOS condiciones: ya tiene CI
   * y ya cambió la contraseña alguna vez (self). Se llama después de tocar
   * cualquiera de los dos — no importa el orden en que el usuario los complete.
   */
  private async reevaluarCompletarPerfil(id: number): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { ci: true, debeCompletarPerfil: true },
    });
    if (!usuario?.debeCompletarPerfil || !usuario.ci) return;

    const yaCambioPassword = await this.prisma.cambioPassword.count({
      where: { usuarioId: id, origen: 'self' },
    });
    if (yaCambioPassword === 0) return;

    await this.prisma.usuario.update({
      where: { id },
      data: { debeCompletarPerfil: false },
    });
  }

  async historialPassword(id: number, actor: UsuarioJwt) {
    this.exigirPropioOAdmin(id, actor);
    return this.prisma.cambioPassword.findMany({
      where: { usuarioId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async eliminar(id: number) {
    await this.prisma.usuario.delete({ where: { id } });
  }

  private exigirPropioOAdmin(id: number, actor: UsuarioJwt) {
    if (actor.id !== id && actor.rol !== 'Admin') {
      throw new ForbiddenException('No autorizado');
    }
  }
}
