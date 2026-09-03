/* ============================================================================
 * src/modules/reportes-entrada/reportes-entrada.service.ts
 *
 * Un Usuario Normal reporta un dato mal (nombre/correo/celular) de una entrada
 * ya aprobada. Al resolver, si es el correo, se corrige también Usuario.email
 * de esa misma cuenta — pero solo si esa persona NUNCA inició sesión.
 * ========================================================================= */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCaso, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventoPolicy } from '../../common/politicas/evento-policy.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';
import {
  CorregirReporteEntradaDto,
  CrearReporteEntradaDto,
} from './dto/reportes-entrada.dto';

@Injectable()
export class ReportesEntradaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventoPolicy: EventoPolicy,
  ) {}

  async listar(
    actor: UsuarioJwt,
    filtros: { estado?: EstadoCaso; eventoId?: string },
  ) {
    const vePropios = !['Admin', 'Cliente'].includes(actor.rol);
    return this.prisma.reporteEntrada.findMany({
      where: {
        estado: filtros.estado,
        eventoId: filtros.eventoId,
        entrada: vePropios
          ? { compra: { compradorId: actor.id } }
          : undefined,
      },
      include: {
        entrada: {
          select: {
            nombre: true,
            correo: true,
            celular: true,
            compra: {
              select: {
                comprador: { select: { nombre: true, email: true } },
              },
            },
          },
        },
        evento: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async crear(dto: CrearReporteEntradaDto) {
    await this.eventoPolicy.porEntrada(dto.entradaId);
    const entrada = await this.prisma.entrada.findUnique({
      where: { id: dto.entradaId },
    });
    if (!entrada) throw new NotFoundException('Entrada no encontrada');
    if (dto.campo === 'correo' && entrada.isTitular) {
      throw new BadRequestException(
        'No puedes reportar el correo de tu propia entrada',
      );
    }

    return this.prisma.reporteEntrada.create({
      data: {
        eventoId: entrada.eventoId,
        compraId: dto.compraId,
        entradaId: dto.entradaId,
        campo: dto.campo,
        descripcion: dto.descripcion,
      },
    });
  }

  async corregir(id: string, dto: CorregirReporteEntradaDto, adminId: number) {
    const valor = dto.valorCorregido.trim();
    if (!valor) {
      throw new BadRequestException('El valor corregido es requerido');
    }

    const reporte = await this.prisma.reporteEntrada.findUnique({
      where: { id },
    });
    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    await this.eventoPolicy.porEvento(reporte.eventoId);

    const campoEntrada = reporte.campo; // 'nombre' | 'correo' | 'celular'
    const entrada = await this.prisma.entrada.findUniqueOrThrow({
      where: { id: reporte.entradaId },
    });

    const operaciones: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.entrada.update({
        where: { id: reporte.entradaId },
        data: { [campoEntrada]: valor },
      }),
      this.prisma.reporteEntrada.update({
        where: { id: reporte.id },
        data: {
          estado: 'resuelto',
          valorCorregido: valor,
          resueltoPorId: adminId,
          resueltoEn: new Date(),
        },
      }),
    ];

    if (campoEntrada === 'correo' && entrada.usuarioId) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: entrada.usuarioId },
      });
      if (usuario && !usuario.primerLoginEn) {
        operaciones.push(
          this.prisma.usuario.update({
            where: { id: usuario.id },
            data: { email: valor },
          }),
        );
      }
    }

    const resultados = await this.prisma.$transaction(operaciones);
    return resultados[1]; // el reporte actualizado
  }
}
