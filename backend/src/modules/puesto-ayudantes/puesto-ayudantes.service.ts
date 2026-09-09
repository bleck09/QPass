/* ============================================================================
 * src/modules/puesto-ayudantes/puesto-ayudantes.service.ts
 * Un Ayudante puede trabajar en varios Puesto, pero SIEMPRE del mismo Usuario
 * Negocio (Usuario.negocioAsignadoId) — nunca de dos negocios distintos.
 * ========================================================================= */

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import { CrearPuestoAyudanteDto } from './dto/crear-puesto-ayudante.dto';
import {
  EditarAyudanteDto,
  ResetPasswordAyudanteDto,
} from './dto/ayudante.dto';

@Injectable()
export class PuestoAyudantesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(puestoId?: string, ayudanteId?: number) {
    const filas = await this.prisma.puestoAyudante.findMany({
      where: { puestoId, ayudanteId },
      include: {
        ayudante: { select: { id: true, nombre: true, email: true, foto: true } },
        puesto: { include: { base: true } },
      },
    });
    // El nombre/logo/descripcion del puesto viven en el PuestoBase: se aplanan
    // acá para que el POS del Ayudante los siga leyendo como puesto.nombre/logo.
    return filas.map((f) => ({
      ...f,
      puesto: {
        ...f.puesto,
        nombre: f.puesto.base.nombre,
        descripcion: f.puesto.base.descripcion,
        logo: f.puesto.base.logo,
        categoria: f.puesto.base.categoria,
      },
    }));
  }

  /**
   * TODOS los ayudantes que pertenecen a un negocio (Usuario.negocioAsignadoId),
   * con sus asignaciones a puestos — incluso los que quedaron SIN ningún puesto.
   * Ese vínculo no se rompe al quitar al ayudante de un puesto, así que el
   * negocio siempre puede volver a asignarlo.
   */
  async misAyudantes(negocioId: number) {
    const ayudantes = await this.prisma.usuario.findMany({
      where: { rol: 'Ayudante', negocioAsignadoId: negocioId },
      select: {
        id: true,
        nombre: true,
        email: true,
        foto: true,
        puestosComoAyudante: {
          select: {
            id: true,
            turno: true,
            puestoId: true,
            puesto: {
              select: {
                id: true,
                base: { select: { nombre: true } },
                eventoId: true,
                evento: { select: { nombre: true } },
              },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return ayudantes.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      email: a.email,
      foto: a.foto,
      asignaciones: a.puestosComoAyudante.map((pa) => ({
        id: pa.id,
        puestoId: pa.puestoId,
        turno: pa.turno,
        puestoNombre: pa.puesto.base.nombre,
        eventoId: pa.puesto.eventoId,
        eventoNombre: pa.puesto.evento.nombre,
      })),
    }));
  }

  async asignar(dto: CrearPuestoAyudanteDto, actor: UsuarioJwt) {
    const puesto = await this.prisma.puesto.findUnique({
      where: { id: dto.puestoId },
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');
    if (actor.rol === 'UsuarioNegocio' && puesto.negocioId !== actor.id) {
      throw new ForbiddenException('Ese puesto no es tuyo');
    }

    const ayudante = await this.prisma.usuario.findUnique({
      where: { id: dto.ayudanteId },
    });
    if (!ayudante) throw new NotFoundException('Ayudante no encontrado');
    if (
      ayudante.negocioAsignadoId &&
      ayudante.negocioAsignadoId !== puesto.negocioId
    ) {
      throw new ConflictException('Este ayudante ya pertenece a otro negocio');
    }

    const turno = dto.turno || 'Día';
    const [asignacion] = await this.prisma.$transaction([
      this.prisma.puestoAyudante.upsert({
        where: {
          puestoId_ayudanteId: {
            puestoId: dto.puestoId,
            ayudanteId: dto.ayudanteId,
          },
        },
        update: { turno },
        create: {
          puestoId: dto.puestoId,
          ayudanteId: dto.ayudanteId,
          turno,
          creadoPorId: puesto.negocioId,
        },
      }),
      ...(ayudante.negocioAsignadoId
        ? []
        : [
            this.prisma.usuario.update({
              where: { id: ayudante.id },
              data: { negocioAsignadoId: puesto.negocioId },
            }),
          ]),
    ]);

    return asignacion;
  }

  async quitar(id: string) {
    await this.prisma.puestoAyudante.delete({ where: { id } });
  }

  /** Carga el ayudante y verifica que sea de este negocio. */
  private async ayudanteDeMiNegocio(ayudanteId: number, negocioId: number) {
    const ayudante = await this.prisma.usuario.findUnique({
      where: { id: ayudanteId },
    });
    if (!ayudante || ayudante.rol !== 'Ayudante') {
      throw new NotFoundException('Ayudante no encontrado');
    }
    if (ayudante.negocioAsignadoId !== negocioId) {
      throw new ForbiddenException('Ese ayudante no es de tu negocio');
    }
    return ayudante;
  }

  async editarAyudante(
    ayudanteId: number,
    negocioId: number,
    dto: EditarAyudanteDto,
  ) {
    await this.ayudanteDeMiNegocio(ayudanteId, negocioId);
    return this.prisma.usuario.update({
      where: { id: ayudanteId },
      data: { nombre: dto.nombre, foto: dto.foto },
      select: { id: true, nombre: true, email: true, foto: true },
    });
  }

  async resetPasswordAyudante(
    ayudanteId: number,
    negocioId: number,
    dto: ResetPasswordAyudanteDto,
  ) {
    await this.ayudanteDeMiNegocio(ayudanteId, negocioId);
    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);
    await this.prisma.usuario.update({
      where: { id: ayudanteId },
      // debeCompletarPerfil = true -> lo obliga a cambiarla en el próximo login.
      data: { passwordHash, debeCompletarPerfil: true },
    });
  }

  /**
   * Saca al ayudante del negocio: borra sus asignaciones a puestos del negocio y
   * limpia negocioAsignadoId. El historial de ventas (Venta.ayudanteId,
   * Transaccion.operadorId) NO se toca — queda atribuido igual.
   */
  async desvincularAyudante(ayudanteId: number, negocioId: number) {
    await this.ayudanteDeMiNegocio(ayudanteId, negocioId);
    await this.prisma.$transaction([
      this.prisma.puestoAyudante.deleteMany({
        where: { ayudanteId, puesto: { negocioId } },
      }),
      this.prisma.usuario.update({
        where: { id: ayudanteId },
        data: { negocioAsignadoId: null },
      }),
    ]);
  }
}
